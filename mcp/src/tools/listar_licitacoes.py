"""Tool MCP: lista licitações com contagem total de resultados."""

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


def listar_licitacoes(
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
    limite: int = 50,
    config: Config | None = None,
) -> dict:
    """Lista licitações públicas com contagem total de resultados.

    Realiza busca textual no campo objeto_compra. Retorna o total real de
    documentos encontrados antes da aplicação do limite, útil para informar
    ao usuário quantas oportunidades existem no banco. Quando nenhum filtro
    é fornecido, lista editais quaisquer do banco.

    Args:
        termo: Palavra-chave para buscar no objeto da licitação. Opcional.
        uf: Sigla do estado para filtrar. Opcional.
        valor_min: Valor mínimo estimado em reais. Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 50, máximo: 200).
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Dict com total_encontrado, resultados e limite_aplicado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    limite = min(limite, 200)
    query: dict = {}

    if termo:
        query["objeto_compra"] = {"$regex": rf"\b{re.escape(termo)}\b", "$options": "i"}
    if uf:
        query["uf"] = uf.upper()
    if valor_min is not None:
        query.setdefault("valor_total_estimado", {})["$gte"] = valor_min
    if valor_max is not None:
        query.setdefault("valor_total_estimado", {})["$lte"] = valor_max

    logger.debug(f"listar_licitacoes | termo={termo!r} | uf={uf} | valor_min={valor_min} | valor_max={valor_max} | limite={limite}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        total = mongo.collection.count_documents(query)
        cursor = mongo.collection.find(query, _CAMPOS).limit(limite)
        resultados = []
        for doc in cursor:
            enc = doc.get("data_encerramento_proposta")
            if enc and isinstance(enc, datetime):
                doc["data_encerramento_proposta"] = enc.isoformat()
            resultados.append(doc)

    logger.info(f"listar_licitacoes | {len(resultados)} de {total} total para termo={termo!r}")
    return {
        "total_encontrado": total,
        "resultados": resultados,
        "limite_aplicado": limite,
    }
