"""
Cena 4 do T4 — Demonstração de DLQ em ação.

Publica 1 registro malformado em raw.licitacoes, deixa o Transform Worker
capturar o erro de validação Pydantic e descartar no tópico DLQ.

Usage (pipeline/ com venv ativo):
    python demo_dlq.py

Output:
    pipeline/evidencias/demo_dlq_YYYYMMDD.txt
"""

import json
import os
import re
import signal
import subprocess
import sys
import threading
import time
from datetime import date, datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths / config
# ---------------------------------------------------------------------------

PIPELINE_DIR = Path(__file__).parent

if sys.platform == "win32":
    PYTHON = str(PIPELINE_DIR / ".venv" / "Scripts" / "python.exe")
else:
    PYTHON = str(PIPELINE_DIR / ".venv" / "bin" / "python")

TODAY = date.today()
EVIDENCIAS_DIR = PIPELINE_DIR / "evidencias"
EVIDENCIAS_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = EVIDENCIAS_DIR / f"demo_dlq_{TODAY.strftime('%Y%m%d')}.txt"

POISON_ID = "POISON-DEMO-001"
TIMEOUT_TRANSFORM = 25       # seconds to run Transform Worker before stopping
DLQ_POLL_SECONDS  = 10       # seconds to poll DLQ consumer

_WIN_CTRL_BREAK_RC = 3221225786
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


# ---------------------------------------------------------------------------
# Step 1 — Publish poison message
# ---------------------------------------------------------------------------

def publicar_veneno(topico_raw: str, bootstrap: str) -> None:
    from confluent_kafka import Producer

    now_iso = datetime.now(tz=timezone.utc).isoformat()

    # Intentionally omits required PNCPRawContract fields:
    # modalidade_nome, situacao_compra_nome, orgao_cnpj,
    # orgao_razao_social, uf, municipio, valor_total_estimado
    envelope = {
        "extracted_at": now_iso,
        "payload": {
            "numero_controle_pncp": POISON_ID,
            "objeto_compra": "Registro de teste — campos obrigatorios ausentes",
        },
    }

    producer = Producer({
        "bootstrap.servers": bootstrap,
        "acks": "all",
        "retries": 3,
    })

    msg_bytes = json.dumps(envelope, ensure_ascii=False).encode("utf-8")
    producer.produce(topico_raw, value=msg_bytes)
    producer.flush()
    print(f"[VENENO] Publicado em {topico_raw} | id={POISON_ID}", flush=True)


# ---------------------------------------------------------------------------
# Step 2 — Run Transform Worker
# ---------------------------------------------------------------------------

def run_transform(log_file) -> list[str]:
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONUTF8"]        = "1"

    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0

    proc = subprocess.Popen(
        [PYTHON, "workers/transform_worker.py"],
        cwd=str(PIPELINE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        creationflags=creation_flags,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    output_lines: list[str] = []

    def reader():
        assert proc.stdout
        for raw in proc.stdout:
            line = strip_ansi(raw.rstrip())
            output_lines.append(line)
            log_file.write(line + "\n")
            log_file.flush()
            print(f"  [TRANSFORM] {line}")

    t = threading.Thread(target=reader, daemon=True)
    t.start()

    try:
        proc.wait(timeout=TIMEOUT_TRANSFORM)
    except subprocess.TimeoutExpired:
        if sys.platform == "win32":
            os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
        else:
            proc.send_signal(signal.SIGINT)
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()

    t.join(timeout=10)
    return output_lines


# ---------------------------------------------------------------------------
# Step 3 — Read DLQ
# ---------------------------------------------------------------------------

def ler_dlq(topico_dlq: str, bootstrap: str) -> list[dict]:
    from confluent_kafka import Consumer, KafkaError

    consumer = Consumer({
        "bootstrap.servers": bootstrap,
        "group.id": "dlq-demo-reader",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    })
    consumer.subscribe([topico_dlq])

    mensagens: list[dict] = []
    deadline = time.monotonic() + DLQ_POLL_SECONDS

    while time.monotonic() < deadline:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                break
            continue
        try:
            dados = json.loads(msg.value().decode("utf-8"))
            mensagens.append(dados)
            print(f"  [DLQ] Encontrado: {dados.get('numero_controle_pncp')}", flush=True)
        except Exception:
            pass

    consumer.close()
    return mensagens


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    now = datetime.now(tz=timezone.utc)
    ts  = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Load config
    sys.path.insert(0, str(PIPELINE_DIR))
    from src.config import carregar_config
    config = carregar_config()

    topico_raw = config.kafka_topic_raw
    topico_dlq = f"{config.kafka_topic_transformed}.dlq"
    bootstrap  = config.kafka_bootstrap_servers

    print(f"[DEMO DLQ] {ts}")
    print(f"[DEMO DLQ] raw={topico_raw} | dlq={topico_dlq}")

    with OUT_FILE.open("w", encoding="utf-8") as f:

        sep = "=" * 70

        f.write(sep + "\n")
        f.write("EVIDENCIA DLQ -- Pipeline Licitei\n")
        f.write(sep + "\n")
        f.write(f"Data          : {ts}\n")
        f.write(f"Topico origem : {topico_raw}\n")
        f.write(f"Topico DLQ    : {topico_dlq}\n")
        f.write(sep + "\n\n")

        # Step 1 — publish poison
        f.write("MENSAGEM VENENOSA ENVIADA:\n")
        f.write(f"  numero_controle_pncp : {POISON_ID}\n")
        f.write( "  objeto_compra        : Registro de teste — campos obrigatorios ausentes\n")
        f.write( "  Campos omitidos      : modalidade_nome, situacao_compra_nome, orgao_cnpj,\n")
        f.write( "                         orgao_razao_social, uf, municipio, valor_total_estimado\n")
        f.write( "  Erro esperado        : pydantic_core.ValidationError (campos obrigatorios ausentes)\n\n")
        f.flush()

        try:
            publicar_veneno(topico_raw, bootstrap)
        except Exception as e:
            msg = f"ABORTADO -- falha ao publicar mensagem venenosa: {e}"
            print(msg)
            f.write(msg + "\n")
            sys.exit(1)

        f.write("  Status publicacao: OK\n\n")
        f.flush()

        # Step 2 — run Transform Worker
        f.write("TRANSFORM WORKER -- SAIDA (ultimas linhas capturadas):\n")
        f.flush()
        print(f"\n[DEMO DLQ] Iniciando Transform Worker por {TIMEOUT_TRANSFORM}s...")
        transform_lines = run_transform(f)

        # Write summary of transform output
        relevant = [l for l in transform_lines if any(
            kw in l for kw in ["invalido", "DLQ", "SCHEMA", "ValidationError", "Falha", "transformados", "dlq"]
        )]
        if not relevant:
            relevant = transform_lines[-8:]  # fallback: last 8 lines
        for line in relevant:
            f.write(f"  {line}\n")
        f.write("\n")
        f.flush()

        # Step 3 — read DLQ
        f.write(f"MENSAGENS NO DLQ ({topico_dlq}):\n")
        f.flush()
        print(f"\n[DEMO DLQ] Lendo tópico DLQ por {DLQ_POLL_SECONDS}s...")
        dlq_msgs = ler_dlq(topico_dlq, bootstrap)

        poison_found = False
        for m in dlq_msgs:
            nc = m.get("numero_controle_pncp", "?")
            falhou = m.get("falhou_em", "?")
            erro_raw = m.get("erro", "")
            # Show first 3 lines of traceback
            erro_lines = [l for l in erro_raw.splitlines() if l.strip()][:3]
            erro_resumo = " | ".join(erro_lines)

            f.write(f"  numero_controle_pncp : {nc}\n")
            f.write(f"  falhou_em            : {falhou}\n")
            f.write(f"  erro (resumo)        : {erro_resumo}\n\n")

            if nc == POISON_ID:
                poison_found = True

        if not dlq_msgs:
            f.write("  (nenhuma mensagem encontrada no DLQ durante a janela de leitura)\n\n")

        # Summary
        status = "SUCESSO -- registro malformado capturado e descartado no DLQ" if poison_found else \
                 "PARCIAL -- DLQ lido mas POISON-DEMO-001 nao encontrado na janela de leitura"

        f.write(sep + "\n")
        f.write(f"STATUS: {status}\n")
        f.write(f"Mensagens no DLQ lidas : {len(dlq_msgs)}\n")
        f.write(f"POISON-DEMO-001 no DLQ : {'SIM' if poison_found else 'NAO'}\n")
        f.write(sep + "\n")

    print()
    print(f"POISON-DEMO-001 no DLQ : {'SIM' if poison_found else 'NAO'}")
    print(f"Mensagens DLQ lidas    : {len(dlq_msgs)}")
    print(f"Evidencia salva em     : {OUT_FILE}")


if __name__ == "__main__":
    main()
