"""Tool MCP: lista licitações com contagem total de resultados."""

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


def listar_licitacoes(
    termo: str,
    uf: str | None = None,
    valor_max: float | None = None,
    limite: int = 50,
    config: Config | None = None,
) -> dict:
    """Lista licitações públicas com contagem total de resultados.

    Realiza busca textual no campo objeto_compra. Retorna o total real de
    documentos encontrados antes da aplicação do limite, útil para informar
    ao usuário quantas oportunidades existem no banco.

    Args:
        termo: Palavra-chave para buscar no objeto da licitação (ex: "limpeza").
        uf: Sigla do estado para filtrar (ex: "PE", "SP"). Opcional.
        valor_max: Valor máximo estimado em reais. Opcional.
        limite: Quantidade máxima de resultados (padrão: 50, máximo: 200).
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Dict com total_encontrado, resultados e limite_aplicado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    limite = min(limite, 200)
    query: dict = {"objeto_compra": {"$regex": termo, "$options": "i"}}

    if uf:
        query["uf"] = uf.upper()
    if valor_max is not None:
        query["valor_total_estimado"] = {"$lte": valor_max}

    logger.debug(f"listar_licitacoes | termo={termo!r} | uf={uf} | limite={limite}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        total = mongo.collection.count_documents(query)
        cursor = mongo.collection.find(query, _CAMPOS).limit(limite)
        resultados = []
        for doc in cursor:
            if enc := doc.get("data_encerramento_proposta"):
                doc["data_encerramento_proposta"] = enc.isoformat()
            resultados.append(doc)

    logger.info(f"listar_licitacoes | {len(resultados)} de {total} total para {termo!r}")
    return {
        "total_encontrado": total,
        "resultados": resultados,
        "limite_aplicado": limite,
    }
