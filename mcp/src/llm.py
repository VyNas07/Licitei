"""Integração com LLM (gpt-4o-mini em prod, qwen2.5:7b via Ollama em dev)."""

import json
from typing import Callable

from loguru import logger

from src.client import completions_com_retry
from src.config import Config

_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "buscar_licitacoes",
            "description": (
                "Busca licitações públicas no banco de dados por palavra-chave no objeto da compra. "
                "Use quando o usuário quiser encontrar licitações por ramo, serviço ou produto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "termo": {
                        "type": "string",
                        "description": "Palavra-chave para buscar no objeto da licitação (ex: 'limpeza', 'TI', 'obras').",
                    },
                    "uf": {
                        "type": "string",
                        "description": "Sigla do estado para filtrar (ex: 'PE', 'SP'). Opcional.",
                    },
                    "valor_max": {
                        "type": "number",
                        "description": "Valor máximo estimado em reais. Opcional.",
                    },
                    "limite": {
                        "type": "integer",
                        "description": "Quantidade máxima de resultados (padrão: 10, máximo: 50).",
                    },
                },
                "required": ["termo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalhar_licitacao",
            "description": (
                "Retorna os detalhes completos de uma licitação específica pelo seu identificador PNCP. "
                "Use quando o usuário quiser informações detalhadas sobre uma licitação já encontrada."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "numero_controle_pncp": {
                        "type": "string",
                        "description": "Identificador único da licitação no PNCP.",
                    },
                },
                "required": ["numero_controle_pncp"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "keywords_cnae",
            "description": (
                "Retorna a descrição e as atividades de uma subclasse CNAE pelo código. "
                "Use quando o usuário informar o CNAE do seu negócio para encontrar "
                "licitações relacionadas ao seu ramo de atividade."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "codigo_cnae": {
                        "type": "string",
                        "description": "Código da subclasse CNAE do MEI (ex: '4751201').",
                    },
                },
                "required": ["codigo_cnae"],
            },
        },
    },
]

_SYSTEM_PROMPT = (
    "Você é um assistente especializado em licitações públicas brasileiras, "
    "focado em ajudar Microempreendedores Individuais (MEIs) a encontrar oportunidades. "
    "Use as ferramentas disponíveis para buscar e detalhar licitações no banco de dados. "
    "Responda sempre em português, de forma clara e objetiva. "
    "Ao apresentar resultados, destaque o objeto da compra, o órgão responsável, "
    "o valor estimado e o prazo de encerramento."
)


def chat(
    query: str,
    config: Config,
    ferramentas: dict[str, Callable],
) -> str:
    """Executa o loop de agente: query → LLM → tools → resposta final.

    O LLM decide quais tools chamar. O loop continua até o modelo retornar
    uma resposta de texto final (finish_reason == 'stop').

    Args:
        query: Pergunta ou comando do usuário em linguagem natural.
        config: Configurações do servidor (modelo, chaves de API).
        ferramentas: Dicionário de funções executáveis pelo LLM.
                     Chaves devem corresponder aos nomes em _TOOLS_SCHEMA.

    Returns:
        Resposta final do LLM como string.
    """
    messages: list[dict] = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]

    max_iteracoes = 5
    for iteracao in range(max_iteracoes):
        logger.debug(f"LLM: iteração {iteracao + 1} | mensagens={len(messages)}")

        response = completions_com_retry(config=config, messages=messages, tools=_TOOLS_SCHEMA)

        choice = response.choices[0]
        messages.append(choice.message)

        if choice.finish_reason == "stop":
            logger.info("LLM: resposta final gerada")
            return choice.message.content or ""

        if choice.finish_reason == "tool_calls":
            for tc in choice.message.tool_calls:
                nome = tc.function.name
                args = json.loads(tc.function.arguments)
                logger.debug(f"LLM: chamando tool '{nome}' | args={args}")

                fn = ferramentas.get(nome)
                if fn is None:
                    resultado = {"erro": f"Tool '{nome}' não disponível."}
                else:
                    resultado = fn(**args)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(resultado, ensure_ascii=False, default=str),
                })

    logger.warning("LLM: limite de iterações atingido sem resposta final")
    return "Não foi possível gerar uma resposta. Tente reformular a pergunta."
