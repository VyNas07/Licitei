"""Ponto de entrada do servidor MCP Licitei.

Expõe ferramentas de consulta a licitações públicas para uso por LLMs via
Model Context Protocol (MCP). Transporte: HTTP + SSE (ADR 006).

Execução:
    python -m src.server
"""

import json
import sys
from pathlib import Path

from fastmcp import FastMCP
from loguru import logger
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse

from src.cache import Cache
from src.config import carregar_config
from src.llm import chat, chat_stream
from src.tools.buscar_licitacoes import buscar_licitacoes as _buscar
from src.tools.detalhar_licitacao import detalhar_licitacao as _detalhar
from src.tools.gerar_checklist import gerar_checklist as _checklist
from src.tools.keywords_cnae import keywords_cnae as _keywords_cnae
from src.tools.listar_documentos import listar_documentos as _documentos
from src.tools.resumir_edital import resumir_edital as _resumir

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------


def _configurar_logger() -> None:
    """Configura loguru com saída no console e rotação diária em arquivo."""
    Path("logs").mkdir(exist_ok=True)

    logger.remove()
    logger.add(
        sys.stderr,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> — "
            "<level>{message}</level>"
        ),
        level="INFO",
        colorize=True,
    )
    logger.add(
        "logs/mcp_{time:YYYY-MM-DD}.log",
        rotation="1 day",
        retention="7 days",
        encoding="utf-8",
        level="DEBUG",
    )


def _sse_event(event: str, data: dict) -> bytes:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


# ---------------------------------------------------------------------------
# Inicialização
# ---------------------------------------------------------------------------

_configurar_logger()
config = carregar_config()
cache = Cache(ttl=config.cache_ttl)

mcp = FastMCP("licitei")

_ferramentas = {
    "buscar_licitacoes": lambda **kw: _buscar(**kw, config=config),
    "detalhar_licitacao": lambda **kw: _detalhar(**kw, config=config),
    "keywords_cnae": lambda **kw: _keywords_cnae(**kw),
    "resumir_edital": lambda **kw: _resumir(**kw, config=config),
    "gerar_checklist": lambda **kw: _checklist(**kw, config=config),
    "listar_documentos": lambda **kw: _documentos(**kw, config=config),
}

# ---------------------------------------------------------------------------
# Tools MCP
# ---------------------------------------------------------------------------


@mcp.tool()
def buscar_licitacoes(
    termo: str,
    uf: str | None = None,
    valor_max: float | None = None,
    limite: int = 10,
) -> list[dict]:
    """Busca licitações públicas por palavra-chave no objeto da compra.

    Args:
        termo: Palavra-chave para buscar (ex: "limpeza", "TI", "obras").
        uf: Sigla do estado para filtrar (ex: "PE", "SP"). Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
    """
    return _buscar(
        termo=termo, uf=uf, valor_max=valor_max, limite=limite, config=config
    )


@mcp.tool()
def detalhar_licitacao(numero_controle_pncp: str) -> dict:
    """Retorna os detalhes completos de uma licitação pelo seu identificador PNCP.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
    """
    return _detalhar(numero_controle_pncp=numero_controle_pncp, config=config)


@mcp.tool()
def keywords_cnae(codigo_cnae: str) -> dict:
    """Retorna descrição e atividades de uma subclasse CNAE para geração de keywords.

    Use quando o usuário informar o CNAE do seu negócio e quiser encontrar
    licitações relacionadas ao seu ramo de atividade.

    Args:
        codigo_cnae: Código da subclasse CNAE do MEI (ex: "4751201").
    """
    return _keywords_cnae(codigo_cnae=codigo_cnae)


@mcp.tool()
def resumir_edital(numero_controle_pncp: str) -> dict:
    """Retorna os dados de um edital para geração de resumo em linguagem simples.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
    """
    return _resumir(numero_controle_pncp=numero_controle_pncp, config=config)


@mcp.tool()
def gerar_checklist(numero_controle_pncp: str) -> dict:
    """Retorna os dados de um edital para geração de checklist de habilitação.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
    """
    return _checklist(numero_controle_pncp=numero_controle_pncp, config=config)


@mcp.tool()
def listar_documentos(numero_controle_pncp: str) -> dict:
    """Retorna os dados de um edital para listagem de documentos necessários.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
    """
    return _documentos(numero_controle_pncp=numero_controle_pncp, config=config)


# ---------------------------------------------------------------------------
# Endpoint HTTP: POST /chat
# ---------------------------------------------------------------------------


@mcp.custom_route("/chat", methods=["POST"])
async def chat_handler(request: Request) -> JSONResponse:
    """Recebe uma query em linguagem natural e retorna a resposta do LLM.

    Verifica o cache antes de chamar o LLM. Armazena a resposta no cache
    ao final para reutilização em queries idênticas.

    Body JSON: {"query": "licitações de limpeza em PE"}
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"erro": "Body JSON inválido."}, status_code=400)

    query = body.get("query", "").strip()
    if not query:
        return JSONResponse({"erro": "Campo 'query' é obrigatório."}, status_code=400)

    try:
        chave = Cache.chave(query)
        cached = cache.get(chave)
        if cached:
            logger.info(f"Cache hit | query={query!r}")
            return JSONResponse({"resposta": cached, "cache": True})

        logger.info(f"Cache miss | query={query!r}")
        resposta = chat(query=query, config=config, ferramentas=_ferramentas)
        cache.set(chave, resposta)

        return JSONResponse({"resposta": resposta, "cache": False})
    except Exception as exc:
        logger.exception(f"Erro no /chat | query={query!r}")
        return JSONResponse({"erro": str(exc)}, status_code=500)


@mcp.custom_route("/chat/stream", methods=["POST"])
async def chat_stream_handler(request: Request) -> StreamingResponse | JSONResponse:
    """Recebe uma query e devolve a resposta do LLM em SSE real."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"erro": "Body JSON inválido."}, status_code=400)

    query = body.get("query", "").strip()
    if not query:
        return JSONResponse({"erro": "Campo 'query' é obrigatório."}, status_code=400)

    def event_stream():
        yield _sse_event("start", {"message": "Processando pergunta"})

        try:
            chave = Cache.chave(query)
            cached = cache.get(chave)
            if cached:
                logger.info(f"Cache hit (stream) | query={query!r}")
                yield _sse_event("message", {"content": cached, "cache": True})
                yield _sse_event("done", {"cache": True})
                return

            logger.info(f"Cache miss (stream) | query={query!r}")
            resposta_partes: list[str] = []

            for event in chat_stream(
                query=query, config=config, ferramentas=_ferramentas
            ):
                if event["event"] == "message":
                    resposta_partes.append(str(event["data"].get("content", "")))
                yield _sse_event(event["event"], event["data"])

            cache.set(chave, "".join(resposta_partes))
            yield _sse_event("done", {"cache": False})
        except Exception as exc:
            logger.exception(f"Erro no /chat/stream | query={query!r}")
            yield _sse_event(
                "error",
                {
                    "error": "Assistente temporariamente indisponível",
                    "details": str(exc),
                },
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info(f"Servidor MCP iniciado na porta {config.mcp_port}")
    mcp.run(transport="sse", host=config.mcp_host, port=config.mcp_port)
