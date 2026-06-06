"""Orquestração Prefect do pipeline unificado Licitei.

Implementa 3 tasks sequenciais (Extract → Transform → Load) com retries
automáticos, agendamento diário às 6h UTC e observabilidade via logs Prefect.

Execução direta (uma vez):
    python orchestration/flows.py

Execução agendada (modo serve — 6h UTC diário):
    python orchestration/flows.py --serve
"""

import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger

from prefect import flow, get_run_logger, task
from prefect.exceptions import MissingContextError

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.config import carregar_config
from workers.extract_worker import executar as extrair_pncp
from workers.load_worker import consumir as load_consumir
from workers.transform_worker import consumir as transform_consumir


def _get_logger():
    """Retorna o logger do Prefect se houver contexto ativo, senão usa loguru."""
    try:
        return get_run_logger()
    except MissingContextError:
        return logger


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@task(
    name="extract-task",
    retries=3,
    retry_delay_seconds=30,
    description="Extrai licitações da API PNCP e publica em raw.licitacoes",
)
def extract_task(data_inicial: str, data_final: str) -> int:
    """Executa o Extract Worker e retorna o total de mensagens publicadas.

    Args:
        data_inicial: Data de início no formato YYYYMMDD.
        data_final: Data de fim no formato YYYYMMDD.

    Returns:
        Total de registros publicados em raw.licitacoes.
    """
    log = _get_logger()
    log.info(f"[EXTRACT] Iniciando | período={data_inicial}→{data_final}")

    config = carregar_config()
    total = extrair_pncp(data_inicial=data_inicial, data_final=data_final, config=config)

    log.info(f"[EXTRACT] Concluído | {total} mensagens publicadas em raw.licitacoes")
    return total


@task(
    name="transform-task",
    retries=2,
    retry_delay_seconds=15,
    description=(
        "Consome raw.licitacoes, grava Bronze, transforma e publica "
        "em transformed.licitacoes"
    ),
)
def transform_task() -> int:
    """Executa o Transform Worker até esgotamento das mensagens pendentes.

    Returns:
        Total de registros publicados em transformed.licitacoes.
    """
    log = _get_logger()
    log.info("[TRANSFORM] Iniciando consumo de raw.licitacoes")

    total = transform_consumir()

    log.info(
        f"[TRANSFORM] Concluído | "
        f"{total} registros publicados em transformed.licitacoes"
    )
    return total


@task(
    name="load-task",
    retries=2,
    retry_delay_seconds=15,
    description="Consome transformed.licitacoes e persiste em Silver, SQLite e Gold",
)
def load_task() -> int:
    """Executa o Load Worker até esgotamento das mensagens pendentes.

    Returns:
        Total de registros persistidos nas três camadas (Silver + SQLite + Gold).
    """
    log = _get_logger()
    log.info("[LOAD] Iniciando consumo de transformed.licitacoes")

    total = load_consumir()

    log.info(
        f"[LOAD] Concluído | "
        f"{total} registros persistidos em Silver + SQLite + Gold"
    )
    return total


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(
    name="pipeline-licitei",
    description=(
        "Pipeline unificado Licitei — extrai do PNCP, grava Bronze, "
        "transforma para Silver e agrega KPIs no Gold."
    ),
    log_prints=True,
)
def pipeline_licitei(
    data_inicial: str | None = None,
    data_final: str | None = None,
) -> None:
    """Flow principal: Extract → Transform → Load.

    Quando data_inicial/data_final não são fornecidos, usa os valores do .env.

    Args:
        data_inicial: Data de início no formato YYYYMMDD. Usa .env se None.
        data_final: Data de fim no formato YYYYMMDD. Usa .env se None.
    """
    log = _get_logger()
    inicio = time.perf_counter()
    agora = datetime.now(tz=timezone.utc).isoformat()

    log.info("=" * 60)
    log.info(f"Pipeline Licitei iniciado | {agora}")
    log.info("=" * 60)

    config = carregar_config()

    di = data_inicial or config.pncp_data_inicial
    df = data_final or config.pncp_data_final

    log.info(f"Configuração | período={di}→{df} | modalidade={config.pncp_codigo_modalidade}")

    # Execução sequencial com dependência explícita
    total_extraidos = extract_task(data_inicial=di, data_final=df)
    total_transformados = transform_task()
    total_carregados = load_task()

    duracao = time.perf_counter() - inicio

    log.info("=" * 60)
    log.info("Pipeline Licitei concluído com sucesso")
    log.info(f"  Extraídos    : {total_extraidos}")
    log.info(f"  Transformados: {total_transformados}")
    log.info(f"  Carregados   : {total_carregados}")
    log.info(f"  Duração total: {duracao:.1f}s")
    log.info("=" * 60)


if __name__ == "__main__":
    if "--serve" in sys.argv:
        pipeline_licitei.serve(
            name="pipeline-licitei-diario",
            cron="0 6 * * *",
            tags=["pipeline", "pncp", "licitei", "medallion"],
        )
    else:
        pipeline_licitei()
