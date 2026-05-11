"""Tool MCP: retorna os dados de um edital para listagem de documentos necessários."""

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


def listar_documentos(
    numero_controle_pncp: str,
    config: Config | None = None,
) -> dict:
    """Retorna os dados de um edital para que o LLM liste os documentos necessários.

    Busca os campos relevantes no MongoDB e retorna junto de uma instrução que orienta
    o LLM a listar especificamente os documentos que o MEI precisa reunir e apresentar
    para participar da licitação.

    Args:
        numero_controle_pncp: Identificador único da licitação no PNCP.
        config: Configurações do servidor. Injetado pelo servidor.

    Returns:
        Dados relevantes do edital com campo 'instrucao' orientando a listagem,
        ou dict com chave 'erro' se não encontrado.
    """
    assert config is not None, "Config não injetado — use o servidor MCP para chamar esta tool"

    logger.debug(f"listar_documentos | id={numero_controle_pncp!r}")

    with MongoManager(config.mongo_uri, config.mongo_db_name, config.mongo_collection) as mongo:
        doc = mongo.collection.find_one(
            {"numero_controle_pncp": numero_controle_pncp},
            _CAMPOS,
        )

    if doc is None:
        logger.warning(f"listar_documentos | não encontrado: {numero_controle_pncp!r}")
        return {"erro": f"Licitação '{numero_controle_pncp}' não encontrada no banco de dados."}

    if enc := doc.get("data_encerramento_proposta"):
        doc["data_encerramento_proposta"] = enc.isoformat()

    doc["fonte"] = "PNCP"
    doc["instrucao"] = (
        "Com base nos dados deste edital, liste os documentos que o MEI precisa reunir "
        "para participar. Inclua documentos de habilitação jurídica (CNPJ, contrato social), "
        "regularidade fiscal e trabalhista (certidões negativas federais, estaduais, municipais, "
        "FGTS, trabalhista), qualificação técnica e proposta comercial. "
        "Organize por categoria e indique onde cada documento pode ser obtido."
    )

    logger.info(f"listar_documentos | dados retornados para {numero_controle_pncp!r}")
    return doc
