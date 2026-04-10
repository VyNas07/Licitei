"""Ponto de entrada do pipeline ETL Licitei.

Orquestra as etapas de extração, transformação e carga (ETL) de forma sequencial.
Cada etapa é isolada: uma falha em Extract encerra o pipeline sem tentar Transform ou Load.
Todas as configurações são carregadas de variáveis de ambiente via arquivo .env.

Execução:
    python -m src.etl.pipeline
"""

import os
import sys
import time
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger

from src.etl.extractor import PNCPExtractor
from src.etl.loader import PNCPLoader
from src.etl.transformer import PNCPTransformer


def _configurar_logger() -> None:
    """Configura o loguru com saída no console e rotação diária em arquivo.

    Remove o handler padrão do loguru para evitar duplicação.
    Console exibe INFO ou superior com cores. Arquivo registra DEBUG ou superior
    com rotação diária e retenção de 7 dias.
    """
    Path("logs").mkdir(exist_ok=True)

    logger.remove()
    logger.add(
        sys.stderr,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> — "
            "<level>{message}</level>"
        ),
        level="INFO",
        colorize=True,
    )
    logger.add(
        "logs/pipeline_{time:YYYY-MM-DD}.log",
        rotation="1 day",
        retention="7 days",
        encoding="utf-8",
        level="DEBUG",
    )


def _carregar_config() -> dict:
    """Carrega e valida as variáveis de ambiente do arquivo .env.

    Variáveis obrigatórias ausentes encerram o pipeline imediatamente com SystemExit(1).
    Variáveis opcionais recebem valores padrão documentados.

    Returns:
        Dicionário com todas as configurações do pipeline.
    """
    load_dotenv()

    obrigatorias = ["MONGO_URI", "MONGO_DB_NAME", "MONGO_COLLECTION"]
    for var in obrigatorias:
        if not os.getenv(var):
            logger.critical(
                f"Variável de ambiente '{var}' não definida. "
                f"Copie .env.example para .env e preencha os valores."
            )
            raise SystemExit(1)

    hoje = date.today().strftime("%Y%m%d")

    return {
        "pncp_base_url": os.getenv("PNCP_BASE_URL", "https://pncp.gov.br/api/consulta/v1"),
        "pncp_tamanho_pagina": int(os.getenv("PNCP_TAMANHO_PAGINA", "50")),
        "pncp_uf": os.getenv("PNCP_UF") or None,
        "pncp_codigo_modalidade": int(os.getenv("PNCP_CODIGO_MODALIDADE", "8")),
        "pncp_data_inicial": os.getenv("PNCP_DATA_INICIAL", hoje),
        "pncp_data_final": os.getenv("PNCP_DATA_FINAL", hoje),
        "mongo_uri": os.getenv("MONGO_URI"),
        "mongo_db_name": os.getenv("MONGO_DB_NAME"),
        "mongo_collection": os.getenv("MONGO_COLLECTION"),
        "sqlite_path": os.getenv("SQLITE_DB_PATH") or None,
        "pncp_timeout": int(os.getenv("PNCP_TIMEOUT", "60")),
    }


def _validar_datas(data_inicial: str, data_final: str) -> str:
    """Valida o formato das datas e garante que data_final seja >= hoje.

    Para o endpoint /proposta, a API exige data_final >= data atual.
    Se a data configurada for passada, o pipeline ajusta para hoje com aviso.

    Args:
        data_inicial: Data de início no formato YYYYMMDD.
        data_final: Data de fim no formato YYYYMMDD.

    Returns:
        data_final validada (pode ter sido ajustada para hoje).

    Raises:
        SystemExit: Se o formato das datas for inválido.
    """
    hoje = date.today()

    for nome, valor in [("PNCP_DATA_INICIAL", data_inicial), ("PNCP_DATA_FINAL", data_final)]:
        try:
            datetime.strptime(valor, "%Y%m%d")
        except ValueError:
            logger.critical(f"Formato inválido para {nome}='{valor}'. Use YYYYMMDD.")
            raise SystemExit(1)

    data_final_dt = datetime.strptime(data_final, "%Y%m%d").date()
    if data_final_dt < hoje:
        data_final_ajustada = hoje.strftime("%Y%m%d")
        logger.warning(
            f"PNCP_DATA_FINAL={data_final} está no passado. "
            f"Ajustando para hoje ({data_final_ajustada}) para evitar erro 422 da API."
        )
        return data_final_ajustada

    return data_final


def main() -> None:
    """Executa o pipeline ETL completo: Extract → Transform → Load.

    Etapas:
        1. Configuração do logger
        2. Carregamento e validação das variáveis de ambiente
        3. Extração de dados da API do PNCP (com paginação completa)
        4. Transformação e normalização dos registros
        5. Carga no MongoDB Atlas (upsert) e SQLite (diferencial)
    """
    _configurar_logger()
    inicio = time.perf_counter()
    logger.info("=" * 60)
    logger.info("Pipeline ETL Licitei iniciado")
    logger.info("=" * 60)

    # --- Configuração ---
    config = _carregar_config()
    data_final = _validar_datas(config["pncp_data_inicial"], config["pncp_data_final"])
    config["pncp_data_final"] = data_final

    logger.info(
        f"Configuração carregada | "
        f"uf={config['pncp_uf']} | "
        f"modalidade={config['pncp_codigo_modalidade']} | "
        f"período={config['pncp_data_inicial']}–{data_final}"
    )

    # --- Etapa 1: Extract ---
    logger.info("[EXTRACT] Iniciando extração da API PNCP...")
    try:
        extractor = PNCPExtractor(
            base_url=config["pncp_base_url"],
            tamanho_pagina=config["pncp_tamanho_pagina"],
            timeout=config["pncp_timeout"],
        )
        registros_raw = extractor.extrair_publicacoes(
            codigo_modalidade=config["pncp_codigo_modalidade"],
            data_inicial=config["pncp_data_inicial"],
            data_final=config["pncp_data_final"],
            uf=config["pncp_uf"],
        )
    except Exception as exc:
        logger.critical(f"[EXTRACT] Falha na extração: {exc}")
        raise SystemExit(1)

    logger.info(f"[EXTRACT] Concluído | {len(registros_raw)} registros brutos extraídos")

    # --- Etapa 2: Transform ---
    logger.info("[TRANSFORM] Iniciando transformação...")
    try:
        transformer = PNCPTransformer()
        registros_transformados = transformer.transformar(registros_raw)
    except Exception as exc:
        logger.critical(f"[TRANSFORM] Falha na transformação: {exc}")
        raise SystemExit(1)

    logger.info(f"[TRANSFORM] Concluído | {len(registros_transformados)} registros prontos para carga")

    # --- Etapa 3: Load ---
    logger.info("[LOAD] Iniciando carga...")
    try:
        with PNCPLoader(
            mongo_uri=config["mongo_uri"],
            db_name=config["mongo_db_name"],
            collection_name=config["mongo_collection"],
            sqlite_path=config["sqlite_path"],
        ) as loader:
            loader.garantir_indice()
            resultado_mongo = loader.carregar_mongo(registros_transformados)

            if config["sqlite_path"]:
                loader.carregar_sqlite(registros_transformados)

    except SystemExit:
        raise
    except Exception as exc:
        logger.critical(f"[LOAD] Falha na carga: {exc}")
        raise SystemExit(1)

    # --- Resumo final ---
    duracao = time.perf_counter() - inicio
    logger.info("=" * 60)
    logger.info("Pipeline ETL concluído com sucesso")
    logger.info(f"  Registros extraídos : {len(registros_raw)}")
    logger.info(f"  Registros carregados: {len(registros_transformados)}")
    logger.info(f"  MongoDB inseridos   : {resultado_mongo['inseridos']}")
    logger.info(f"  MongoDB atualizados : {resultado_mongo['atualizados']}")
    logger.info(f"  Duração total       : {duracao:.1f}s")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
