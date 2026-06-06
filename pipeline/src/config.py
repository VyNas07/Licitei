"""Carregamento e validação das variáveis de ambiente do módulo Pipeline."""

import os
import sys
from dataclasses import dataclass

from dotenv import load_dotenv
from loguru import logger


@dataclass(frozen=True)
class Config:
    """Configurações unificadas carregadas do .env do pipeline."""

    # Kafka
    kafka_bootstrap_servers: str
    kafka_topic_raw: str
    kafka_topic_transformed: str

    # PNCP
    pncp_base_url: str
    pncp_tamanho_pagina: int
    pncp_codigo_modalidade: int
    pncp_data_inicial: str
    pncp_data_final: str

    # Camadas de dados
    bronze_base_path: str
    iceberg_catalog_path: str
    sqlite_db_path: str

    # MongoDB
    mongo_uri: str
    mongo_db_name: str


def carregar_config() -> Config:
    """Carrega e valida as variáveis de ambiente do arquivo .env.

    Variáveis obrigatórias ausentes encerram o processo com SystemExit(1).

    Returns:
        Instância de Config com todas as configurações validadas.
    """
    load_dotenv()

    obrigatorias = [
        "KAFKA_BOOTSTRAP_SERVERS",
        "PNCP_CODIGO_MODALIDADE",
        "PNCP_DATA_INICIAL",
        "PNCP_DATA_FINAL",
        "BRONZE_BASE_PATH",
        "ICEBERG_CATALOG_PATH",
        "SQLITE_DB_PATH",
        "MONGO_URI",
        "MONGO_DB_NAME",
    ]
    ausentes = [v for v in obrigatorias if not os.getenv(v)]
    if ausentes:
        for var in ausentes:
            logger.critical(
                f"Variável de ambiente '{var}' não definida. "
                "Copie .env.example para .env e preencha os valores."
            )
        raise SystemExit(1)

    return Config(
        kafka_bootstrap_servers=os.environ["KAFKA_BOOTSTRAP_SERVERS"],
        kafka_topic_raw=os.getenv("KAFKA_TOPIC_RAW", "raw.licitacoes"),
        kafka_topic_transformed=os.getenv("KAFKA_TOPIC_TRANSFORMED", "transformed.licitacoes"),
        pncp_base_url=os.getenv("PNCP_BASE_URL", "https://pncp.gov.br/api/consulta/v1").rstrip("/"),
        pncp_tamanho_pagina=int(os.getenv("PNCP_TAMANHO_PAGINA", "50")),
        pncp_codigo_modalidade=int(os.environ["PNCP_CODIGO_MODALIDADE"]),
        pncp_data_inicial=os.environ["PNCP_DATA_INICIAL"],
        pncp_data_final=os.environ["PNCP_DATA_FINAL"],
        bronze_base_path=os.environ["BRONZE_BASE_PATH"],
        iceberg_catalog_path=os.environ["ICEBERG_CATALOG_PATH"],
        sqlite_db_path=os.environ["SQLITE_DB_PATH"],
        mongo_uri=os.environ["MONGO_URI"],
        mongo_db_name=os.environ["MONGO_DB_NAME"],
    )
