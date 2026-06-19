"""Agente LangGraph — substitui o loop manual de llm.py."""

import asyncio
import json
from typing import AsyncGenerator, Optional

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from loguru import logger

from src.config import Config
from src.tools.buscar_licitacoes import buscar_licitacoes as _buscar
from src.tools.data_atual import data_atual as _data_atual
from src.tools.detalhar_licitacao import detalhar_licitacao as _detalhar
from src.tools.gerar_checklist import gerar_checklist as _checklist
from src.tools.keywords_cnae import keywords_cnae as _keywords_cnae
from src.tools.listar_documentos import listar_documentos as _listar
from src.tools.listar_licitacoes import listar_licitacoes as _listar_licitacoes
from src.tools.resumir_edital import resumir_edital as _resumir

_SYSTEM_PROMPT = """Você é LicIA, uma assistente especializada em licitações públicas brasileiras,
focada em ajudar Microempreendedores Individuais (MEIs) a encontrar oportunidades.

## Quando usar ferramentas

Use ferramentas sempre que o usuário demonstrar qualquer interesse em licitações,
editais ou compras públicas — mesmo que o pedido seja vago ou sem filtros.

Exemplos que DEVEM acionar ferramentas:
- "mostre um edital", "mostre qualquer licitação", "o que tem disponível?"
- "me mostre 1 edital aleatório"
- "quais licitações existem?"

Exemplos que NÃO devem acionar ferramentas:
- Saudações: "olá", "oi", "tudo bem"
- Perguntas gerais sem relação com licitações: "o que você faz?"

## Regras obrigatórias para uso das ferramentas

1. NUNCA invente parâmetros. Se o usuário não informou termo de busca,
   UF, valor mínimo ou máximo — omita esses campos. Não os invente.

2. Para pedidos vagos sem palavra-chave ("mostre qualquer edital",
   "mostre 1 edital", "o que tem?"), chame `listar_licitacoes`
   sem o campo `termo`. Isso retorna editais sem filtro de assunto.

3. Chame sempre uma ferramenta por vez. Aguarde o resultado antes
   de chamar a próxima.

4. Se uma busca retornar vazio, informe honestamente e sugira
   que o usuário tente outro termo — não tente outro termo por conta própria.

## Formato de resposta

- Responda sempre em português, de forma clara e objetiva.
- Ao apresentar licitações, destaque: objeto da compra, órgão responsável,
  valor estimado e prazo de encerramento.
- Cite a fonte ao final de cada licitação:
  "Fonte: PNCP — [numero_controle_pncp] | [orgao_razao_social]"
"""


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
        termo: Optional[str] = None,
        uf: str | None = None,
        valor_min: float | None = None,
        valor_max: float | None = None,
        limite: int | str = 10,
    ) -> str:
        """Busca licitações públicas por palavra-chave no objeto da compra.

        Use quando o usuário quiser encontrar licitações por ramo, serviço ou produto.
        Para faixas de valor (ex: "de 5 mil a 15 mil"), passe valor_min e valor_max juntos.
        Prefira termos completos em vez de siglas curtas (ex: 'informática' em vez de 'TI').
        Quando o usuário NÃO especificou assunto, chame SEM o campo `termo` — NUNCA invente.

        Args:
            termo: Palavra-chave para buscar (ex: 'limpeza', 'informática'). OMITA se o usuário não especificou assunto.
            uf: Sigla do estado para filtrar (ex: 'PE', 'SP'). Opcional.
            valor_min: Valor mínimo estimado em reais. Opcional.
            valor_max: Valor máximo estimado em reais. Opcional.
            limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
        """
        result = _buscar(termo=termo, uf=uf, valor_min=valor_min, valor_max=valor_max, limite=int(limite), config=config)
        return json.dumps(result, ensure_ascii=False, default=str)

    @tool
    def detalhar_licitacao(numero_controle_pncp: str) -> str:
        """Retorna os detalhes completos de uma licitação pelo seu identificador PNCP.

        Use quando o usuário quiser informações detalhadas sobre uma licitação já encontrada.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return json.dumps(_detalhar(numero_controle_pncp=numero_controle_pncp, config=config), ensure_ascii=False, default=str)

    @tool
    def keywords_cnae(codigo_cnae: str) -> str:
        """Retorna descrição e atividades de uma subclasse CNAE para geração de keywords.

        Use quando o usuário informar o CNAE do seu negócio para encontrar
        licitações relacionadas ao seu ramo de atividade.

        Args:
            codigo_cnae: Código da subclasse CNAE do MEI (ex: '4751201').
        """
        return json.dumps(_keywords_cnae(codigo_cnae=codigo_cnae), ensure_ascii=False, default=str)

    @tool
    def resumir_edital(numero_controle_pncp: str) -> str:
        """Retorna dados de um edital para geração de resumo em linguagem simples.

        Use quando o usuário pedir para resumir, explicar ou entender um edital.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return json.dumps(_resumir(numero_controle_pncp=numero_controle_pncp, config=config), ensure_ascii=False, default=str)

    @tool
    def gerar_checklist(numero_controle_pncp: str) -> str:
        """Retorna dados de um edital para geração de checklist de habilitação.

        Use quando o usuário pedir checklist, requisitos ou como participar de um edital.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return json.dumps(_checklist(numero_controle_pncp=numero_controle_pncp, config=config), ensure_ascii=False, default=str)

    @tool
    def listar_documentos(numero_controle_pncp: str) -> str:
        """Retorna dados de um edital para listagem dos documentos necessários.

        Use quando o usuário perguntar quais documentos precisa preparar para uma licitação.

        Args:
            numero_controle_pncp: Identificador único da licitação no PNCP.
        """
        return json.dumps(_listar(numero_controle_pncp=numero_controle_pncp, config=config), ensure_ascii=False, default=str)

    @tool
    def data_atual() -> str:
        """Retorna a data e hora atual do servidor.

        Use quando precisar saber a data atual para verificar se um edital está
        vencido ou calcular prazos. Sempre chame antes de comparar datas de
        encerramento de licitações com "hoje".
        """
        return json.dumps(_data_atual(), ensure_ascii=False)

    @tool
    def listar_licitacoes(
        termo: Optional[str] = None,
        uf: str | None = None,
        valor_min: float | None = None,
        valor_max: float | None = None,
        limite: int | str = 5,
    ) -> str:
        """Lista licitações com contagem total de resultados.

        Use para pedidos vagos ("mostre editais", "o que tem?", "mostre 1 edital")
        ou quando o usuário quiser saber quantas licitações existem no banco.
        Retorna o total real encontrado no banco e uma amostra dos resultados.
        Prefira esta tool sobre buscar_licitacoes para pedidos sem palavra-chave.
        Quando o usuário NÃO especificou assunto, chame SEM o campo `termo` — NUNCA invente.

        Args:
            termo: Palavra-chave para buscar (ex: 'limpeza', 'obras'). OMITA se o usuário não especificou assunto.
            uf: Sigla do estado para filtrar (ex: 'PE', 'SP'). Opcional.
            valor_min: Valor mínimo estimado em reais. Opcional.
            valor_max: Valor máximo estimado em reais. Opcional.
            limite: Quantidade de resultados a exibir (padrão: 5, máximo: 10).
        """
        result = _listar_licitacoes(
            termo=termo, uf=uf, valor_min=valor_min, valor_max=valor_max, limite=min(int(limite), 10), config=config
        )
        return json.dumps(result, ensure_ascii=False, default=str)

    return [
        buscar_licitacoes,
        detalhar_licitacao,
        keywords_cnae,
        resumir_edital,
        gerar_checklist,
        listar_documentos,
        data_atual,
        listar_licitacoes,
    ]


def criar_agente(config: Config):
    """Cria o agente LangGraph com checkpointer em memória.

    Deve ser chamado uma única vez no startup do servidor.
    Memória persiste durante a sessão do servidor; reiniciar limpa o histórico.

    Args:
        config: Configurações do servidor.

    Returns:
        CompiledStateGraph pronto para invocar.
    """
    checkpointer = MemorySaver()

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


def _processar_evento_stream(event: dict, buffer: list[str], state: dict) -> list[str]:
    """Processa um evento do astream_events e retorna chunks de texto a emitir.

    Mantém buffer e run_id em `state` para correlacionar eventos start/stream/end
    do mesmo ciclo LLM. Retorna lista vazia enquanto o LLM ainda não terminou ou
    quando o término indica tool_call (em vez de resposta final de texto).

    Args:
        event: Evento emitido por agente.astream_events().
        buffer: Lista mutável de chunks acumulados para o ciclo atual.
        state: Dict com chave "run_id" rastreando o ciclo LLM em andamento.

    Returns:
        Lista de strings a emitir para o cliente (vazia na maioria dos eventos).
    """
    kind = event["event"]
    current_run_id = state["run_id"]

    if kind == "on_chat_model_start":
        buffer.clear()
        state["run_id"] = event["run_id"]
        return []

    if kind == "on_chat_model_stream" and event["run_id"] == current_run_id:
        chunk = event["data"]["chunk"]
        if chunk.content:
            buffer.append(chunk.content)
        return []

    if kind == "on_chat_model_end" and event["run_id"] == current_run_id:
        output = event["data"].get("output")
        has_tool_calls = bool(output and getattr(output, "tool_calls", None))
        texts = buffer[:] if (not has_tool_calls and buffer) else []
        buffer.clear()
        state["run_id"] = None
        return texts

    return []


async def chat_stream(agente, query: str, thread_id: str) -> AsyncGenerator[str, None]:
    """Invoca o agente com streaming de tokens para uso no endpoint SSE.

    Groq/Llama 3.3 emite a chamada de ferramenta dentro de chunk.content durante o
    streaming (formato <function>...</function>). Para evitar exibir esse XML ao
    usuário, bufferizamos cada chamada LLM e só emitimos se on_chat_model_end
    confirmar que não houve tool_calls (i.e., é resposta final de texto).

    Quando o Groq rejeita o formato de tool call gerado pelo modelo, capturamos o
    APIError e fazemos fallback para o chat síncrono, desde que nenhum chunk de
    texto já tenha sido emitido ao cliente.

    Args:
        agente: Instância criada via criar_agente().
        query: Pergunta do usuário em linguagem natural.
        thread_id: Identificador da sessão (habilita memória por usuário).

    Yields:
        Chunks de texto da resposta final do agente.
    """
    run_config = {"configurable": {"thread_id": thread_id}}
    buffer: list[str] = []
    state: dict = {"run_id": None}
    yielded_any = False

    try:
        async for event in agente.astream_events(
            {"messages": [HumanMessage(content=query)]},
            config=run_config,
            version="v2",
        ):
            for text in _processar_evento_stream(event, buffer, state):
                yield text
                yielded_any = True

    except Exception as exc:
        if "tool call validation failed" in str(exc) and not yielded_any:
            logger.warning(f"Groq tool call format error — fallback para chat síncrono | {exc}")
            resposta = await asyncio.to_thread(chat, agente, query, thread_id)
            yield resposta
        else:
            raise
