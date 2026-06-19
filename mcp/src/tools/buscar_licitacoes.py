"""Tool MCP: busca licitações no MongoDB por palavra-chave e filtros opcionais."""

import re
from datetime import datetime
from typing import Optional

from loguru import logger
from pydantic import Field

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
    termo: Optional[str] = Field(
        default=None,
        description=(
            "Palavra-chave para buscar no campo objeto_compra (regex, case-insensitive). "
            "OMITA este campo quando o usuário não especificou assunto — "
            "a busca retornará editais sem filtro de texto."
        ),
    ),
    uf: Optional[str] = Field(
        default=None,
        description="Sigla do estado para filtrar (ex: 'PE', 'SP'). Omita se o usuário não especificou estado.",
    ),
    valor_min: Optional[float] = Field(
        default=None,
        description="Valor mínimo estimado em reais. Omita se o usuário não especificou valor mínimo.",
    ),
    valor_max: Optional[float] = Field(
        default=None,
        description="Valor máximo estimado em reais. Omita se o usuário não especificou valor máximo.",
    ),
    limite: int = 10,
    config: Config | None = None,
) -> list[dict]:
    """Busca licitações públicas no banco de dados.

    Realiza busca textual no campo objeto_compra da licitação. Pode ser filtrada
    por estado (UF) e faixa de valor estimado. Quando nenhum filtro é fornecido,
    retorna licitações quaisquer do banco.

    Args:
        termo: Palavra-chave para buscar no objeto da licitação. Opcional.
        uf: Sigla do estado para filtrar. Opcional.
        valor_min: Valor mínimo estimado em reais. Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 10, máximo: 50).
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Lista de licitações com campos resumidos.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    limite = min(limite, 50)
    query: dict = {}

    if termo:
        query["objeto_compra"] = {"$regex": rf"\b{re.escape(termo)}\b", "$options": "i"}
    if uf:
        query["uf"] = uf.upper()
    if valor_min is not None:
        query.setdefault("valor_total_estimado", {})["$gte"] = valor_min
    if valor_max is not None:
        query.setdefault("valor_total_estimado", {})["$lte"] = valor_max

    logger.debug(f"buscar_licitacoes | termo={termo!r} | uf={uf} | valor_min={valor_min} | valor_max={valor_max} | limite={limite}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        cursor = mongo.collection.find(query, _CAMPOS).limit(limite)
        resultados = []
        for doc in cursor:
            enc = doc.get("data_encerramento_proposta")
            if enc and isinstance(enc, datetime):
                doc["data_encerramento_proposta"] = enc.isoformat()
            resultados.append(doc)

    logger.info(f"buscar_licitacoes | {len(resultados)} resultado(s) para termo={termo!r}")
    return resultados
