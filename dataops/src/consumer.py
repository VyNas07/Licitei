"""Kafka Consumer da camada DataOps.

Lê o tópico KAFKA_TOPIC_RAW em micro-batches, valida cada mensagem com
PNCPRawContract e persiste na camada Bronze (Parquet particionado por data).

Comportamento de offset:
    - auto_commit desativado — commit manual apenas após gravação bem-sucedida
    - Garante semântica at-least-once: em falha na gravação, mensagens são
      reprocessadas na próxima execução

Execução:
    python -m src.consumer
"""

import json
import sys
import time

from kafka import KafkaConsumer
from kafka.errors import KafkaError
from loguru import logger
from pydantic import ValidationError

from src.bronze.loader import BronzeLoader
from src.config import carregar_config
from src.contracts import PNCPRawContract

_BATCH_SIZE = 100
_BATCH_TIMEOUT_S = 30


def _configurar_logger() -> None:
    """Configura loguru com formato estruturado."""
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
    )


def _desserializar(dados: bytes) -> dict | None:
    """Desserializa bytes JSON em dicionário. Retorna None em caso de erro."""
    try:
        return json.loads(dados.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning(f"Mensagem ignorada — falha na desserialização: {exc}")
        return None


def consumir(config=None) -> int:
    """Executa o loop de consumo e gravação na Bronze.

    Lê mensagens do Kafka em micro-batches de até _BATCH_SIZE mensagens
    ou _BATCH_TIMEOUT_S segundos (o que vier primeiro) e grava cada batch
    em um arquivo Parquet. Commita o offset somente após gravação bem-sucedida.

    Retorna o total de registros gravados na Bronze.
    """
    if config is None:
        config = carregar_config()

    loader = BronzeLoader(config.bronze_base_path)

    consumer = KafkaConsumer(
        config.kafka_topic_raw,
        bootstrap_servers=config.kafka_bootstrap_servers,
        group_id="licitei-bronze",
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        consumer_timeout_ms=int(_BATCH_TIMEOUT_S * 1000),
        value_deserializer=lambda v: v,
    )

    logger.info(
        f"Consumer iniciado | "
        f"tópico={config.kafka_topic_raw} | "
        f"batch_size={_BATCH_SIZE} | "
        f"timeout={_BATCH_TIMEOUT_S}s"
    )

    total_gravados = 0
    total_invalidos = 0
    batch: list[PNCPRawContract] = []
    batch_invalidos = 0

    def _gravar_e_commitar() -> None:
        nonlocal total_gravados
        if not batch:
            return
        loader.gravar(batch)
        consumer.commit()
        total_gravados += len(batch)
        batch.clear()

    try:
        for msg in consumer:
            payload = _desserializar(msg.value)
            if payload is None:
                total_invalidos += 1
                continue

            try:
                contrato = PNCPRawContract(**payload)
                batch.append(contrato)
            except ValidationError as exc:
                logger.warning(
                    f"Mensagem inválida descartada | "
                    f"offset={msg.offset} | {exc}"
                )
                total_invalidos += 1
                continue

            if len(batch) >= _BATCH_SIZE:
                _gravar_e_commitar()

    except Exception as exc:
        logger.error(f"Erro inesperado no loop de consumo: {exc}")
        raise
    finally:
        if batch:
            logger.info(f"Gravando batch final com {len(batch)} mensagens pendentes")
            _gravar_e_commitar()
        consumer.close()

    logger.info(
        f"Consumer encerrado | "
        f"total gravados={total_gravados} | "
        f"descartados={total_invalidos}"
    )
    return total_gravados


if __name__ == "__main__":
    _configurar_logger()
    consumir()
