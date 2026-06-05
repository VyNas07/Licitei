"""Tool MCP: retorna os dados de um edital para geração de resumo em linguagem simples."""

from datetime import datetime

from loguru import logger

from src.config import Config
from src.db import MongoManager


def resumir_edital(
    numero_controle_pncp: str,
    config: Config | None = None,
) -> dict:
    """Retorna os dados completos de um edital para que o LLM gere um resumo acessível.

    Busca o documento no MongoDB e retorna todos os campos relevantes junto de
    uma instrução que orienta o LLM a produzir uma explicação em linguagem simples,
    adequada para MEIs sem experiência em licitações.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Dados do edital com campo 'instrucao' orientando o resumo,
        ou dict com chave 'erro' se não encontrado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    logger.debug(f"resumir_edital | id={numero_controle_pncp!r}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        doc = mongo.collection.find_one(
            {"numero_controle_pncp": numero_controle_pncp},
            {"_id": 0},
        )

    if doc is None:
        logger.warning(f"resumir_edital | não encontrado: {numero_controle_pncp!r}")
        return {"erro": f"Licitação '{numero_controle_pncp}' não encontrada no banco de dados."}

    for campo in ("data_abertura_proposta", "data_encerramento_proposta", "processado_em"):
        val = doc.get(campo)
        if val and isinstance(val, datetime):
            doc[campo] = val.isoformat()

    doc["fonte"] = "PNCP"
    doc["instrucao"] = (
        "Resuma este edital em linguagem simples e acessível para um MEI sem experiência "
        "em licitações. Explique o que está sendo contratado, quem está contratando, "
        "o valor estimado, o prazo e o que o MEI precisa saber para avaliar se vale participar."
    )

    logger.info(f"resumir_edital | dados retornados para {numero_controle_pncp!r}")
    return doc
