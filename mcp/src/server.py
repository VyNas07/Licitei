"""Ponto de entrada do servidor MCP Licitei.

Expõe ferramentas de consulta a licitações públicas para uso por LLMs via
Model Context Protocol (MCP). Transporte: HTTP + SSE (ADR 006).

Execução:
    python -m src.server
"""

import sys
from pathlib import Path

from loguru import logger
from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

from src.cache import Cache
from src.config import carregar_config
from src.llm import chat
from src.tools.buscar_licitacoes import buscar_licitacoes as _buscar
from src.tools.detalhar_licitacao import detalhar_licitacao as _detalhar

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
    return _buscar(termo=termo, uf=uf, valor_max=valor_max, limite=limite, config=config)


@mcp.tool()
def detalhar_licitacao(numero_controle_pncp: str) -> dict:
    """Retorna os detalhes completos de uma licitação pelo seu identificador PNCP.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
    """
    return _detalhar(numero_controle_pncp=numero_controle_pncp, config=config)


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


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info(f"Servidor MCP iniciado na porta {config.mcp_port}")
    mcp.run(transport="sse", host=config.mcp_host, port=config.mcp_port)
