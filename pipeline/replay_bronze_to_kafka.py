"""
Reads Bronze Parquet files (2026-06-04) and republishes to Kafka raw.licitacoes.
Substitute for Extract Worker when the PNCP API is unavailable.

Usage (inside pipeline/ with venv active):
    python replay_bronze_to_kafka.py

Exit code: 0 on success, 1 on failure.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pyarrow.parquet as pq
from confluent_kafka import Producer

from src.config import carregar_config

BRONZE_DATE_SUBPATH = "contratacoes/year=2026/month=06/day=04"


def _serialize(val):
    """JSON serializer fallback for datetime and similar objects."""
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


def _delivery_report(err, msg):
    if err is not None:
        print(f"[REPLAY] Falha na entrega | {err}", flush=True)


def main() -> int:
    config = carregar_config()
    topico = config.kafka_topic_raw
    bronze_dir = Path(config.bronze_base_path) / BRONZE_DATE_SUBPATH

    if not bronze_dir.exists():
        print(f"[REPLAY] ERRO -- diretorio nao encontrado: {bronze_dir}", flush=True)
        return 1

    # Only replay files from the original extraction date (batch_20260604_*).
    # Subsequent replay runs write new Bronze files to the same partition;
    # including them would publish duplicates.
    parquet_files = sorted(
        f for f in bronze_dir.glob("*.parquet") if f.name.startswith("batch_20260604_")
    )
    if not parquet_files:
        print(f"[REPLAY] ERRO -- nenhum Parquet original (batch_20260604_*) em {bronze_dir}", flush=True)
        return 1

    print(f"[REPLAY] Fonte      : {bronze_dir}", flush=True)
    print(f"[REPLAY] Arquivos   : {len(parquet_files)} (filtrados: batch_20260604_*)", flush=True)
    print(f"[REPLAY] Topico     : {topico}", flush=True)

    producer = Producer(
        {
            "bootstrap.servers": config.kafka_bootstrap_servers,
            "acks": "all",
            "retries": 3,
            "enable.idempotence": True,
        }
    )

    extracted_at = datetime.now(tz=timezone.utc).isoformat()
    total = 0
    erros = 0

    for parquet_path in parquet_files:
        table = pq.read_table(str(parquet_path))
        rows = table.to_pylist()
        file_count = 0
        for row in rows:
            envelope = {
                "extracted_at": extracted_at,
                "payload": row,
            }
            msg_bytes = json.dumps(
                envelope, ensure_ascii=False, default=_serialize
            ).encode("utf-8")
            try:
                producer.produce(topico, value=msg_bytes, on_delivery=_delivery_report)
                total += 1
                file_count += 1
            except Exception as exc:
                print(f"[REPLAY] Erro ao publicar: {exc}", flush=True)
                erros += 1
            producer.poll(0)

        print(f"[REPLAY] {parquet_path.name}: {file_count} registros", flush=True)

    producer.flush()
    print(f"[REPLAY] Concluido | publicados={total} | erros={erros}", flush=True)
    return 0 if erros == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
