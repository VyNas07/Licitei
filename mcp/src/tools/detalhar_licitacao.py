"""Tool MCP: retorna o documento completo de uma licitação pelo ID."""

from loguru import logger

from src.config import Config
from src.db import MongoManager


def detalhar_licitacao(
    numero_controle_pncp: str,
    config: Config | None = None,
) -> dict:
    """Retorna os detalhes completos de uma licitação específica.

    Busca o documento completo no MongoDB pelo identificador único do PNCP.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Documento completo da licitação, ou dict com chave 'erro' se não encontrado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    logger.debug(f"detalhar_licitacao | id={numero_controle_pncp!r}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        doc = mongo.collection.find_one(
            {"numero_controle_pncp": numero_controle_pncp},
            {"_id": 0},
        )

    if doc is None:
        logger.warning(f"detalhar_licitacao | não encontrado: {numero_controle_pncp!r}")
        return {"erro": f"Licitação '{numero_controle_pncp}' não encontrada no banco de dados."}

    for campo in ("data_abertura_proposta", "data_encerramento_proposta", "_extraido_em"):
        if val := doc.get(campo):
            doc[campo] = val.isoformat()

    logger.info(f"detalhar_licitacao | encontrado: {numero_controle_pncp!r}")
    return doc
