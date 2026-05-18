"""Agente LangGraph — substitui o loop manual de llm.py."""

import sqlite3
from typing import AsyncGenerator

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.prebuilt import create_react_agent
from loguru import logger

from src.config import Config
from src.tools.buscar_licitacoes import buscar_licitacoes as _buscar
from src.tools.detalhar_licitacao import detalhar_licitacao as _detalhar
from src.tools.gerar_checklist import gerar_checklist as _checklist
from src.tools.keywords_cnae import keywords_cnae as _keywords_cnae
from src.tools.listar_documentos import listar_documentos as _listar
from src.tools.resumir_edital import resumir_edital as _resumir

_SYSTEM_PROMPT = (
    "Você é um assistente especializado em licitações públicas brasileiras, "
    "focado em ajudar Microempreendedores Individuais (MEIs) a encontrar oportunidades. "
    "Use as ferramentas disponíveis para buscar e detalhar licitações no banco de dados. "
    "Responda sempre em português, de forma clara e objetiva. "
    "Ao apresentar resultados, destaque o objeto da compra, o órgão responsável, "
    "o valor estimado e o prazo de encerramento. "
    "Sempre que sua resposta se basear em dados de uma licitação específica, "
    "cite a fonte ao final no formato: "
    "'Fonte: PNCP — [numero_controle_pncp] | [orgao_razao_social]'."
)


def _criar_llm(config: Config):
    """Retorna ChatGroq em prod ou ChatOpenAI+Ollama como fallback."""
    if config.llm_provider == "groq" and config.groq_api_key:
        logger.debug(f"LLM provider: groq | modelo={config.llm_model}")
        return ChatGroq(
            api_key=config.groq_api_key,
            model=config.llm_model,
            groq_api_base="https://api.groq.com",
        )

    logger.warning("GROQ_API_KEY ausente — usando Ollama como fallback")
    return ChatOpenAI(
        api_key="ollama",
        base_url=config.ollama_base_url,
        model=config.ollama_model,
    )


def _criar_ferramentas(config: Config) -> list:
    """Retorna lista de @tool LangChain com config pré-injetada via closure."""

    @tool
    def buscar_licitacoes(
        termo: str,
        uf: str | None = None,
        valor_max: float | None = None,
        limite: int = 10,
    ) -> list[dict]:
        """Busca licitações públicas por palavra-chave no objeto da compra.

        Use quando o usuário quiser encontrar licitações por ramo, serviço ou produto.

        Args:
            termo: Palavra-chave para buscar (ex: 'limpeza', 'TI', 'obras').
            uf: Sigla do estado para filtrar (ex: 'PE', 'SP'). Opcional.
            valor_max: Valor máximo estimado em reais. Opcional.
            limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
        """
        return _buscar(termo=termo, uf=uf, valor_max=valor_max, limite=limite, config=config)

    @tool
    def detalhar_licitacao(numero_controle_pncp: str) -> dict:
        """Retorna os detalhes completos de uma licitação pelo seu identificador PNCP.

        Use quando o usuário quiser informações detalhadas sobre uma licitação já encontrada.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return _detalhar(numero_controle_pncp=numero_controle_pncp, config=config)

    @tool
    def keywords_cnae(codigo_cnae: str) -> dict:
        """Retorna descrição e atividades de uma subclasse CNAE para geração de keywords.

        Use quando o usuário informar o CNAE do seu negócio para encontrar
        licitações relacionadas ao seu ramo de atividade.

        Args:
            codigo_cnae: Código da subclasse CNAE do MEI (ex: '4751201').
        """
        return _keywords_cnae(codigo_cnae=codigo_cnae)

    @tool
    def resumir_edital(numero_controle_pncp: str) -> dict:
        """Retorna dados de um edital para geração de resumo em linguagem simples.

        Use quando o usuário pedir para resumir, explicar ou entender um edital.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return _resumir(numero_controle_pncp=numero_controle_pncp, config=config)

    @tool
    def gerar_checklist(numero_controle_pncp: str) -> dict:
        """Retorna dados de um edital para geração de checklist de habilitação.

        Use quando o usuário pedir checklist, requisitos ou como participar de um edital.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return _checklist(numero_controle_pncp=numero_controle_pncp, config=config)

    @tool
    def listar_documentos(numero_controle_pncp: str) -> dict:
        """Retorna dados de um edital para listagem dos documentos necessários.

        Use quando o usuário perguntar quais documentos precisa preparar para uma licitação.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return _listar(numero_controle_pncp=numero_controle_pncp, config=config)

    return [
        buscar_licitacoes,
        detalhar_licitacao,
        keywords_cnae,
        resumir_edital,
        gerar_checklist,
        listar_documentos,
    ]


def criar_agente(config: Config):
    """Cria o agente LangGraph com checkpointer SQLite persistente.

    Deve ser chamado uma única vez no startup do servidor.

    Args:
        config: Configurações do servidor.

    Returns:
        CompiledStateGraph pronto para invocar.
    """
    conn = sqlite3.connect(config.sqlite_memoria_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    llm = _criar_llm(config)
    ferramentas = _criar_ferramentas(config)

    agente = create_react_agent(
        model=llm,
        tools=ferramentas,
        checkpointer=checkpointer,
        prompt=_SYSTEM_PROMPT,
    )
    logger.info(
        f"Agente LangGraph criado | provider={config.llm_provider} | "
        f"tools={len(ferramentas)} | memoria={config.sqlite_memoria_path}"
    )
    return agente


def chat(agente, query: str, thread_id: str) -> str:
    """Invoca o agente de forma síncrona e retorna a resposta final.

    Args:
        agente: Instância criada via criar_agente().
        query: Pergunta do usuário em linguagem natural.
        thread_id: Identificador da sessão (habilita memória por usuário).

    Returns:
        Resposta final do LLM como string.
    """
    run_config = {"configurable": {"thread_id": thread_id}}
    resultado = agente.invoke(
        {"messages": [HumanMessage(content=query)]},
        config=run_config,
    )
    return resultado["messages"][-1].content


async def chat_stream(agente, query: str, thread_id: str) -> AsyncGenerator[str, None]:
    """Invoca o agente com streaming de tokens para uso no endpoint SSE (Sprint 3).

    Args:
        agente: Instância criada via criar_agente().
        query: Pergunta do usuário em linguagem natural.
        thread_id: Identificador da sessão (habilita memória por usuário).

    Yields:
        Chunks de texto conforme o LLM vai gerando.
    """
    run_config = {"configurable": {"thread_id": thread_id}}
    async for event in agente.astream_events(
        {"messages": [HumanMessage(content=query)]},
        config=run_config,
        version="v2",
    ):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                yield chunk.content
