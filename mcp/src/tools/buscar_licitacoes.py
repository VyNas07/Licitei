"""Tool MCP: busca licitações no MongoDB por palavra-chave e filtros opcionais."""

from loguru import logger

from src.config import Config
from src.db import MongoManager

_CAMPOS = {
    "_id": 0,
    "numero_controle_pncp": 1,
    "objeto_compra": 1,
    "orgao_razao_social": 1,
    "uf": 1,
    "municipio": 1,
    "valor_total_estimado": 1,
    "modalidade_nome": 1,
    "situacao_compra_nome": 1,
    "data_encerramento_proposta": 1,
}


def buscar_licitacoes(
    termo: str,
    uf: str | None = None,
    valor_max: float | None = None,
    limite: int = 10,
    config: Config | None = None,
) -> list[dict]:
    """Busca licitações públicas no banco de dados por palavra-chave.

    Realiza busca textual no campo objeto_compra da licitação. Pode ser filtrada
    por estado (UF) e valor máximo estimado.

    Args:
        termo: Palavra-chave para buscar no objeto da licitação (ex: "limpeza", "TI").
        uf: Sigla do estado para filtrar (ex: "PE", "SP"). Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Lista de licitações com campos resumidos.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    limite = min(limite, 50)
    query: dict = {"objeto_compra": {"$regex": termo, "$options": "i"}}

    if uf:
        query["uf"] = uf.upper()
    if valor_max is not None:
        query["valor_total_estimado"] = {"$lte": valor_max}

    logger.debug(f"buscar_licitacoes | termo={termo!r} | uf={uf} | valor_max={valor_max} | limite={limite}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        cursor = mongo.collection.find(query, _CAMPOS).limit(limite)
        resultados = []
        for doc in cursor:
            if enc := doc.get("data_encerramento_proposta"):
                doc["data_encerramento_proposta"] = enc.isoformat()
            resultados.append(doc)

    logger.info(f"buscar_licitacoes | {len(resultados)} resultado(s) para {termo!r}")
    return resultados
