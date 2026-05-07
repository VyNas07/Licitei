"""Orquestração do pipeline ETL Licitei com Prefect.

Implementa as mesmas etapas do pipeline.py com monitoramento via UI do Prefect,
retentativas automáticas, agendamento e validação de qualidade de dados.

Execução direta (uma vez):
    python etl/orchestrate_prefect.py

Agendamento diário às 6h UTC:
    python etl/orchestrate_prefect.py --serve
"""

import sys
import time
from pathlib import Path

from loguru import logger
import logging

from prefect import flow, get_run_logger, task
from prefect.exceptions import MissingContextError


def _get_logger() -> logging.Logger:
    """Retorna o logger do Prefect se houver contexto ativo, senão usa logging padrão."""
    try:
        return get_run_logger()
    except MissingContextError:
        return logging.getLogger(__name__)

# Garante que src/ seja encontrado ao rodar da raiz do repositório
_ETL_ROOT = Path(__file__).parent
if str(_ETL_ROOT) not in sys.path:
    sys.path.insert(0, str(_ETL_ROOT))

from src.etl.extractor import PNCPExtractor
from src.etl.loader import PNCPLoader
from src.etl.pipeline import _carregar_config, _validar_datas
from src.etl.transformer import PNCPTransformer


@task(name="extrair", retries=3, retry_delay_seconds=30)
def extrair(config: dict) -> list[dict]:
    """Extrai contratações da API pública do PNCP com paginação completa.

    Args:
        config: Configurações do pipeline carregadas do .env.

    Returns:
        Lista de registros brutos retornados pela API.
    """
    prefect_logger = _get_logger()
    prefect_logger.info(
        "[EXTRACT] Iniciando | uf=%s | modalidade=%s | período=%s–%s",
        config["pncp_uf"],
        config["pncp_codigo_modalidade"],
        config["pncp_data_inicial"],
        config["pncp_data_final"],
    )

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

    prefect_logger.info("[EXTRACT] Concluído | %d registros brutos extraídos", len(registros_raw))
    logger.info(f"[EXTRACT] {len(registros_raw)} registros extraídos da API PNCP")
    return registros_raw


@task(name="transformar")
def transformar(registros_raw: list[dict]) -> list[dict]:
    """Normaliza registros brutos: snake_case, cast de tipos, descarte de inválidos.

    Args:
        registros_raw: Lista de registros brutos retornados pela extração.

    Returns:
        Lista de registros normalizados prontos para carga.
    """
    prefect_logger = _get_logger()
    prefect_logger.info("[TRANSFORM] Iniciando | %d registros brutos", len(registros_raw))

    transformer = PNCPTransformer()
    registros_transformados = transformer.transformar(registros_raw)

    descartados = len(registros_raw) - len(registros_transformados)
    prefect_logger.info(
        "[TRANSFORM] Concluído | %d normalizados | %d descartados",
        len(registros_transformados),
        descartados,
    )
    logger.info(f"[TRANSFORM] {len(registros_transformados)} registros normalizados ({descartados} descartados)")
    return registros_transformados


@task(name="validar_qualidade")
def validar_qualidade(registros: list[dict]) -> list[dict]:
    """Valida métricas mínimas de qualidade antes de persistir os dados.

    Verifica dois indicadores obrigatórios:
    - objeto_compra preenchido (não "Não informado"): mínimo 70%
    - valor_total_estimado > 0: mínimo 70%

    Args:
        registros: Lista de registros normalizados pelo transformer.

    Returns:
        A mesma lista de registros (pass-through após validação aprovada).

    Raises:
        ValueError: Se qualquer métrica ficar abaixo de 70%.
    """
    prefect_logger = _get_logger()
    prefect_logger.info("[QUALIDADE] Validando %d registros...", len(registros))

    if not registros:
        prefect_logger.warning("[QUALIDADE] Lista vazia — validação ignorada")
        return registros

    total = len(registros)

    com_objeto = sum(
        1 for r in registros
        if r.get("objeto_compra") and r["objeto_compra"] != "Não informado"
    )
    com_valor = sum(1 for r in registros if (r.get("valor_total_estimado") or 0.0) > 0.0)

    pct_objeto = (com_objeto / total) * 100
    pct_valor = (com_valor / total) * 100

    prefect_logger.info(
        "[QUALIDADE] objeto_compra preenchido: %.1f%% (%d/%d)", pct_objeto, com_objeto, total
    )
    prefect_logger.info(
        "[QUALIDADE] valor_total_estimado > 0: %.1f%% (%d/%d)", pct_valor, com_valor, total
    )
    logger.info(f"[QUALIDADE] objeto={pct_objeto:.1f}% | valor={pct_valor:.1f}%")

    violacoes: list[str] = []
    if pct_objeto < 70.0:
        violacoes.append(f"objeto_compra preenchido: {pct_objeto:.1f}% (mínimo 70%)")
    if pct_valor < 70.0:
        violacoes.append(f"valor_total_estimado > 0: {pct_valor:.1f}% (mínimo 70%)")

    if violacoes:
        mensagem = "Qualidade de dados abaixo do mínimo aceitável: " + " | ".join(violacoes)
        prefect_logger.error("[QUALIDADE] %s", mensagem)
        raise ValueError(mensagem)

    prefect_logger.info("[QUALIDADE] Validação aprovada")
    return registros


@task(name="carregar")
def carregar(registros: list[dict], config: dict) -> dict[str, int]:
    """Persiste os registros validados no MongoDB Atlas via upsert em lote.

    Também carrega no SQLite se SQLITE_DB_PATH estiver configurado.

    Args:
        registros: Lista de registros normalizados e validados.
        config: Configurações do pipeline carregadas do .env.

    Returns:
        Dicionário com contagem de documentos inseridos e atualizados no MongoDB.
    """
    prefect_logger = _get_logger()
    prefect_logger.info("[LOAD] Iniciando carga de %d registros no MongoDB", len(registros))

    with PNCPLoader(
        mongo_uri=config["mongo_uri"],
        db_name=config["mongo_db_name"],
        collection_name=config["mongo_collection"],
        sqlite_path=config["sqlite_path"],
    ) as loader:
        loader.garantir_indice()
        resultado_mongo = loader.carregar_mongo(registros)

        if config["sqlite_path"]:
            loader.carregar_sqlite(registros)
            prefect_logger.info("[LOAD] SQLite atualizado | path=%s", config["sqlite_path"])

    prefect_logger.info(
        "[LOAD] Concluído | inseridos=%d | atualizados=%d",
        resultado_mongo["inseridos"],
        resultado_mongo["atualizados"],
    )
    logger.info(
        f"[LOAD] inseridos={resultado_mongo['inseridos']} | "
        f"atualizados={resultado_mongo['atualizados']}"
    )
    return resultado_mongo


@flow(
    name="pipeline-pncp",
    description="Pipeline ETL Licitei — extrai licitações do PNCP e persiste no MongoDB Atlas.",
    log_prints=True,
)
def pipeline_pncp(
    data_inicial: str | None = None,
    data_final: str | None = None,
    uf: str | None = None,
) -> None:
    """Flow principal: Extract → Transform → Validar Qualidade → Load.

    Os parâmetros têm como padrão os valores do .env. Quando fornecidos
    explicitamente (ex: execução manual ou agendada com override), substituem
    os valores do .env para aquela execução específica.

    Args:
        data_inicial: Data de início no formato YYYYMMDD. Usa PNCP_DATA_INICIAL se None.
        data_final: Data de fim no formato YYYYMMDD. Usa PNCP_DATA_FINAL se None.
        uf: Sigla do estado para filtrar (ex: 'PE'). Usa PNCP_UF se None.
    """
    prefect_logger = _get_logger()
    inicio = time.perf_counter()

    prefect_logger.info("=" * 60)
    prefect_logger.info("Pipeline ETL Licitei iniciado via Prefect")
    prefect_logger.info("=" * 60)

    config = _carregar_config()

    if data_inicial is not None:
        config["pncp_data_inicial"] = data_inicial
    if data_final is not None:
        config["pncp_data_final"] = data_final
    if uf is not None:
        config["pncp_uf"] = uf

    config["pncp_data_inicial"], config["pncp_data_final"] = _validar_datas(
        config["pncp_data_inicial"], config["pncp_data_final"]
    )

    prefect_logger.info(
        "Configuração carregada | uf=%s | modalidade=%s | período=%s–%s",
        config["pncp_uf"],
        config["pncp_codigo_modalidade"],
        config["pncp_data_inicial"],
        config["pncp_data_final"],
    )

    registros_raw = extrair(config)
    registros_transformados = transformar(registros_raw)
    registros_validados = validar_qualidade(registros_transformados)
    resultado_mongo = carregar(registros_validados, config)

    duracao = time.perf_counter() - inicio

    prefect_logger.info("=" * 60)
    prefect_logger.info("Pipeline ETL concluído com sucesso")
    prefect_logger.info("  Registros extraídos : %d", len(registros_raw))
    prefect_logger.info("  Registros carregados: %d", len(registros_transformados))
    prefect_logger.info("  MongoDB inseridos   : %d", resultado_mongo["inseridos"])
    prefect_logger.info("  MongoDB atualizados : %d", resultado_mongo["atualizados"])
    prefect_logger.info("  Duração total       : %.1fs", duracao)
    prefect_logger.info("=" * 60)

    logger.info(
        f"Pipeline concluído | extraídos={len(registros_raw)} | "
        f"inseridos={resultado_mongo['inseridos']} | "
        f"atualizados={resultado_mongo['atualizados']} | "
        f"duração={duracao:.1f}s"
    )


if __name__ == "__main__":
    if "--serve" in sys.argv:
        pipeline_pncp.serve(
            name="pipeline-pncp-diario",
            cron="0 6 * * *",
            tags=["etl", "pncp", "licitei"],
        )
    else:
        pipeline_pncp()
