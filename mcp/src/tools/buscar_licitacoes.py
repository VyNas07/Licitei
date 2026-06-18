"""Tool MCP: busca licitações no MongoDB por palavra-chave e filtros opcionais."""

import re
from datetime import datetime

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
    valor_min: float | None = None,
    valor_max: float | None = None,
    limite: int = 10,
    config: Config | None = None,
) -> list[dict]:
    """Busca licitações públicas no banco de dados por palavra-chave.

    Realiza busca textual no campo objeto_compra da licitação. Pode ser filtrada
    por estado (UF) e faixa de valor estimado.

    Args:
        termo: Palavra-chave para buscar no objeto da licitação (ex: "limpeza", "informática").
        uf: Sigla do estado para filtrar (ex: "PE", "SP"). Opcional.
        valor_min: Valor mínimo estimado em reais. Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Lista de licitações com campos resumidos.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    limite = min(limite, 50)
    padrao = rf"\b{re.escape(termo)}\b"
    query: dict = {"objeto_compra": {"$regex": padrao, "$options": "i"}}

    if uf:
        query["uf"] = uf.upper()

    filtro_valor: dict = {}
    if valor_min is not None:
        filtro_valor["$gte"] = valor_min
    if valor_max is not None:
        filtro_valor["$lte"] = valor_max
    if filtro_valor:
        query["valor_total_estimado"] = filtro_valor

    logger.debug(f"buscar_licitacoes | termo={termo!r} | uf={uf} | valor_min={valor_min} | valor_max={valor_max} | limite={limite}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        cursor = mongo.collection.find(query, _CAMPOS).limit(limite)
        resultados = []
        for doc in cursor:
            enc = doc.get("data_encerramento_proposta")
            if enc and isinstance(enc, datetime):
                doc["data_encerramento_proposta"] = enc.isoformat()
            resultados.append(doc)

    logger.info(f"buscar_licitacoes | {len(resultados)} resultado(s) para {termo!r}")
    return resultados
