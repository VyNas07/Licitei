"""Tool MCP: retorna os dados de um edital para geração de checklist de habilitação."""

from datetime import datetime

from loguru import logger

from src.config import Config
from src.db import MongoManager

_CAMPOS = {
    "_id": 0,
    "numero_controle_pncp": 1,
    "objeto_compra": 1,
    "orgao_razao_social": 1,
    "orgao_cnpj": 1,
    "modalidade_nome": 1,
    "situacao_compra_nome": 1,
    "valor_total_estimado": 1,
    "data_encerramento_proposta": 1,
    "uf": 1,
    "municipio": 1,
}


def gerar_checklist(
    numero_controle_pncp: str,
    config: Config | None = None,
) -> dict:
    """Retorna os dados de um edital para que o LLM gere um checklist de habilitação.

    Busca os campos relevantes no MongoDB e retorna junto de uma instrução que orienta
    o LLM a listar os requisitos que o MEI precisa cumprir para participar da licitação,
    levando em conta a modalidade, o objeto e o valor estimado.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Dados relevantes do edital com campo 'instrucao' orientando o checklist,
        ou dict com chave 'erro' se não encontrado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    logger.debug(f"gerar_checklist | id={numero_controle_pncp!r}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        doc = mongo.collection.find_one(
            {"numero_controle_pncp": numero_controle_pncp},
            _CAMPOS,
        )

    if doc is None:
        logger.warning(f"gerar_checklist | não encontrado: {numero_controle_pncp!r}")
        return {"erro": f"Licitação '{numero_controle_pncp}' não encontrada no banco de dados."}

    enc = doc.get("data_encerramento_proposta")
    if enc and isinstance(enc, datetime):
        doc["data_encerramento_proposta"] = enc.isoformat()

    doc["fonte"] = "PNCP"
    doc["instrucao"] = (
        "Com base nos dados deste edital, gere um checklist de habilitação para o MEI. "
        "Liste os requisitos típicos para a modalidade indicada (regularidade fiscal, "
        "CNPJ ativo, certidões negativas, capacidade técnica, etc.), adaptando ao "
        "objeto da compra e ao valor estimado. Organize em formato de lista com checkboxes."
    )

    logger.info(f"gerar_checklist | dados retornados para {numero_controle_pncp!r}")
    return doc
