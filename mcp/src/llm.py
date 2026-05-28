"""Integração com LLM (gpt-4o-mini em prod, qwen2.5:7b via Ollama em dev)."""

import json
from collections.abc import Callable, Iterator
from typing import Any

from loguru import logger

from src.client import completions_com_retry
from src.config import Config

_DESC_ID_PNCP = "Identificador único da licitação no PNCP."

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
                        "description": _DESC_ID_PNCP,
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
    {
        "type": "function",
        "function": {
            "name": "resumir_edital",
            "description": (
                "Retorna os dados de uma licitação para que você possa gerar um resumo "
                "em linguagem simples, acessível para MEIs. Use quando o usuário pedir "
                "para resumir, explicar ou entender um edital específico."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "numero_controle_pncp": {
                        "type": "string",
                        "description": _DESC_ID_PNCP,
                    },
                },
                "required": ["numero_controle_pncp"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "gerar_checklist",
            "description": (
                "Retorna os dados de uma licitação para que você possa gerar um checklist "
                "de habilitação — lista de requisitos que o MEI precisa cumprir para participar. "
                "Use quando o usuário pedir checklist, requisitos ou como participar de um edital."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "numero_controle_pncp": {
                        "type": "string",
                        "description": _DESC_ID_PNCP,
                    },
                },
                "required": ["numero_controle_pncp"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_documentos",
            "description": (
                "Retorna os dados de uma licitação para que você possa listar os documentos "
                "necessários para participar. Use quando o usuário perguntar quais documentos "
                "precisa reunir, levantar ou preparar para uma licitação específica."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "numero_controle_pncp": {
                        "type": "string",
                        "description": _DESC_ID_PNCP,
                    },
                },
                "required": ["numero_controle_pncp"],
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
    "o valor estimado e o prazo de encerramento. "
    "Sempre que sua resposta se basear em dados de uma licitação específica, "
    "cite a fonte ao final no formato: "
    "'Fonte: PNCP — [numero_controle_pncp] | [orgao_razao_social]'."
)


ToolMap = dict[str, Callable[..., Any]]


def _build_messages(query: str) -> list[dict]:
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]


def _run_tool_loop(
    messages: list[dict],
    config: Config,
    ferramentas: ToolMap,
) -> str:
    max_iteracoes = 5

    for iteracao in range(max_iteracoes):
        logger.debug(f"LLM: iteração {iteracao + 1} | mensagens={len(messages)}")

        response = completions_com_retry(
            config=config,
            messages=messages,
            tools=_TOOLS_SCHEMA,
        )

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

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(
                            resultado, ensure_ascii=False, default=str
                        ),
                    }
                )

    logger.warning("LLM: limite de iterações atingido sem resposta final")
    return "Não foi possível gerar uma resposta. Tente reformular a pergunta."


def _tool_calls_from_stream(
    tool_calls: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    return [tool_calls[index] for index in sorted(tool_calls)]


def _accumulate_tool_call(tool_calls: dict[int, dict[str, Any]], partial: Any) -> None:
    if partial.index not in tool_calls:
        tool_calls[partial.index] = {
            "id": partial.id or "",
            "type": "function",
            "function": {
                "name": partial.function.name
                if partial.function and partial.function.name
                else "",
                "arguments": "",
            },
        }

    current = tool_calls[partial.index]

    if partial.id:
        current["id"] = partial.id

    if partial.function:
        if partial.function.name:
            current["function"]["name"] = partial.function.name
        if partial.function.arguments:
            current["function"]["arguments"] += partial.function.arguments


def chat(
    query: str,
    config: Config,
    ferramentas: ToolMap,
) -> str:
    """Executa o loop de agente: query → LLM → tools → resposta final."""
    return _run_tool_loop(
        messages=_build_messages(query),
        config=config,
        ferramentas=ferramentas,
    )


def chat_stream(
    query: str,
    config: Config,
    ferramentas: ToolMap,
) -> Iterator[dict[str, Any]]:
    """Executa o fluxo de chat emitindo eventos incrementais para SSE."""
    messages = _build_messages(query)
    max_iteracoes = 5

    for iteracao in range(max_iteracoes):
        logger.debug(f"LLM stream: iteração {iteracao + 1} | mensagens={len(messages)}")

        response_stream = completions_com_retry(
            config=config,
            messages=messages,
            tools=_TOOLS_SCHEMA,
            stream=True,
        )

        content_parts: list[str] = []
        tool_calls: dict[int, dict[str, Any]] = {}
        finish_reason: str | None = None

        for chunk in response_stream:
            if not chunk.choices:
                continue

            choice = chunk.choices[0]
            delta = choice.delta

            if delta.content:
                content_parts.append(delta.content)
                yield {
                    "event": "message",
                    "data": {"content": delta.content},
                }

            for partial in delta.tool_calls or []:
                _accumulate_tool_call(tool_calls, partial)

            if choice.finish_reason:
                finish_reason = choice.finish_reason

        if finish_reason == "stop":
            logger.info("LLM stream: resposta final gerada")
            return

        if finish_reason == "tool_calls":
            assistant_message = {
                "role": "assistant",
                "content": "".join(content_parts) or None,
                "tool_calls": _tool_calls_from_stream(tool_calls),
            }
            messages.append(assistant_message)

            for tc in assistant_message["tool_calls"]:
                nome = tc["function"]["name"]
                args_json = tc["function"].get("arguments", "") or "{}"
                logger.debug(f"LLM stream: chamando tool '{nome}' | args={args_json}")

                yield {
                    "event": "status",
                    "data": {"message": f"Consultando {nome}"},
                }

                fn = ferramentas.get(nome)
                if fn is None:
                    resultado = {"erro": f"Tool '{nome}' não disponível."}
                else:
                    try:
                        resultado = fn(**json.loads(args_json))
                    except json.JSONDecodeError as exc:
                        resultado = {
                            "erro": f"Argumentos inválidos para tool '{nome}': {exc.msg}",
                        }

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(
                            resultado, ensure_ascii=False, default=str
                        ),
                    }
                )
            continue

        raise RuntimeError("Resposta do LLM finalizada sem finish_reason suportado.")

    logger.warning("LLM stream: limite de iterações atingido sem resposta final")
    yield {
        "event": "message",
        "data": {
            "content": "Não foi possível gerar uma resposta. Tente reformular a pergunta.",
        },
    }
