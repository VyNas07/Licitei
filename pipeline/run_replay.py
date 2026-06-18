"""
Orchestrates Bronze -> Kafka -> Transform -> Load replay and writes evidence.

Use when the PNCP API is unavailable: replays existing Bronze data through
the Transform and Load workers to prove the full pipeline logic is functional.

Usage (inside pipeline/ with venv active):
    python run_replay.py

Output:
    pipeline/evidencias/run_replay_YYYYMMDD.txt
"""

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
# Config
# ---------------------------------------------------------------------------

PIPELINE_DIR = Path(__file__).parent

if sys.platform == "win32":
    PYTHON = str(PIPELINE_DIR / ".venv" / "Scripts" / "python.exe")
else:
    PYTHON = str(PIPELINE_DIR / ".venv" / "bin" / "python")

TODAY = date.today()

EVIDENCIAS_DIR = PIPELINE_DIR / "evidencias"
EVIDENCIAS_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = EVIDENCIAS_DIR / f"run_replay_{TODAY.strftime('%Y%m%d')}.txt"

BRONZE_ORIGIN_DATE = "04/06/2026"
BRONZE_ORIGIN_COUNT = 4867
PNCP_OUTAGE_SINCE = "13/06/2026"

# Generous timeouts: 4867 records at ~1000 rec/s = a few seconds.
# Workers use while-True loops so they must be interrupted after processing.
TIMEOUT_TRANSFORM = 45
TIMEOUT_LOAD = 120

# Windows exit code when a process exits due to CTRL+BREAK (STATUS_CONTROL_C_EXIT)
_WIN_CTRL_BREAK_RC = 3221225786

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def log(msg: str, f) -> None:
    ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"[{ts}] {msg}"
    print(line)
    f.write(line + "\n")
    f.flush()


# ---------------------------------------------------------------------------
# Worker runner
# ---------------------------------------------------------------------------

def run_worker(
    name: str,
    args: list,
    log_file,
    timeout: int | None = None,
) -> tuple[int, list[str]]:
    """
    Runs a worker as a subprocess, captures output in real time.
    If timeout != None: sends CTRL_BREAK/SIGINT after N seconds to
    trigger the workers' finally blocks (flush + close).
    Returns rc=0 when we intentionally interrupted the worker.
    """
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONUTF8"] = "1"

    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0

    proc = subprocess.Popen(
        args,
        cwd=str(PIPELINE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        creationflags=creation_flags,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    log(f"[{name}] PID={proc.pid} | iniciado", log_file)
    output_lines: list[str] = []

    def reader():
        assert proc.stdout
        for raw in proc.stdout:
            line = strip_ansi(raw.rstrip())
            output_lines.append(line)
            log_file.write(line + "\n")
            log_file.flush()
            print(f"    {line}")

    t = threading.Thread(target=reader, daemon=True)
    t.start()

    interrupted = False

    if timeout is None:
        proc.wait()
        t.join(timeout=30)
    else:
        try:
            proc.wait(timeout=timeout)
            log(f"[{name}] encerrou naturalmente (rc={proc.returncode})", log_file)
        except subprocess.TimeoutExpired:
            interrupted = True
            log(
                f"[{name}] timeout={timeout}s atingido -- enviando sinal de parada",
                log_file,
            )
            if sys.platform == "win32":
                os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
            else:
                proc.send_signal(signal.SIGINT)

            try:
                proc.wait(timeout=30)
                log(f"[{name}] encerrou graciosamente", log_file)
            except subprocess.TimeoutExpired:
                log(f"[{name}] nao encerrou -- forcando kill", log_file)
                proc.kill()
                proc.wait()

        t.join(timeout=30)

    rc = proc.returncode or 0
    # CTRL+BREAK is how we intentionally stop infinite-loop workers.
    # The Windows exit code 3221225786 (STATUS_CONTROL_C_EXIT) is expected.
    if interrupted and rc in (0, _WIN_CTRL_BREAK_RC):
        rc = 0

    return rc, output_lines


# ---------------------------------------------------------------------------
# Metric parsing
# ---------------------------------------------------------------------------

def parse_int(lines: list[str], pattern: str) -> int:
    for line in reversed(lines):
        m = re.search(pattern, line)
        if m:
            return int(m.group(1))
    return -1


# ---------------------------------------------------------------------------
# MongoDB helpers
# ---------------------------------------------------------------------------

def checar_mongo() -> tuple[bool, int]:
    """Returns (ok, document_count)."""
    check_script = (
        "import sys; sys.path.insert(0, '.'); "
        "from src.config import carregar_config; "
        "from pymongo import MongoClient; "
        "c = carregar_config(); "
        "client = MongoClient(c.mongo_uri, serverSelectionTimeoutMS=8000); "
        "n = client[c.mongo_db_name]['contratos_ativos'].count_documents({}); "
        "print(f'MONGO_OK count={n}'); "
        "client.close()"
    )
    result = subprocess.run(
        [PYTHON, "-c", check_script],
        cwd=str(PIPELINE_DIR),
        capture_output=True,
        text=True,
        timeout=20,
    )
    if "MONGO_OK" in result.stdout:
        m = re.search(r"count=(\d+)", result.stdout)
        count = int(m.group(1)) if m else -1
        return True, count
    return False, -1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    inicio_dt = datetime.now(tz=timezone.utc)
    inicio_mono = time.monotonic()

    with OUT_FILE.open("w", encoding="utf-8") as f:

        # ------------------------------------------------------------------
        # Header
        # ------------------------------------------------------------------
        sep = "=" * 70
        f.write(sep + "\n")
        f.write("EVIDENCIA DE EXECUCAO -- Pipeline Licitei\n")
        f.write(sep + "\n")
        f.write("TIPO DE EXECUCAO : Replay Bronze -> Kafka -> Transform -> Load\n")
        f.write(f"Motivo           : API PNCP indisponivel desde {PNCP_OUTAGE_SINCE} (timeout TCP)\n")
        f.write(f"Dados de origem  : Bronze {BRONZE_ORIGIN_DATE} ({BRONZE_ORIGIN_COUNT} registros)\n")
        f.write(f"Data do replay   : {TODAY.strftime('%d/%m/%Y')}\n")
        f.write(f"Arquivo          : {OUT_FILE}\n")
        f.write(f"Inicio           : {inicio_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        f.write(sep + "\n\n")
        f.flush()

        print(sep)
        print("EVIDENCIA -- Replay Bronze -> Kafka -> Transform -> Load")
        print(f"Motivo: API PNCP indisponivel desde {PNCP_OUTAGE_SINCE}")
        print(f"Dados : Bronze {BRONZE_ORIGIN_DATE} ({BRONZE_ORIGIN_COUNT} registros)")
        print(sep)

        # ------------------------------------------------------------------
        # Pre-check: MongoDB
        # ------------------------------------------------------------------
        log("\n[PRE-CHECK] Verificando conectividade MongoDB Atlas...", f)
        ok, count_antes = checar_mongo()
        if not ok:
            log("ABORTADO -- MongoDB inacessivel.", f)
            sys.exit(1)
        log(f"[PRE-CHECK] OK | contratos_ativos antes do replay: {count_antes}\n", f)

        # ------------------------------------------------------------------
        # Stage 1: Replay Bronze -> Kafka
        # ------------------------------------------------------------------
        log(">>> STAGE 1: REPLAY BRONZE -> KAFKA <<<", f)
        t0 = time.monotonic()
        rc_replay, lines_replay = run_worker(
            "REPLAY",
            [PYTHON, "replay_bronze_to_kafka.py"],
            f,
            timeout=None,
        )
        t_replay = time.monotonic() - t0
        total_publicados = parse_int(lines_replay, r"publicados=(\d+)")
        log(
            f"[REPLAY] rc={rc_replay} | publicados={total_publicados} | {t_replay:.0f}s\n",
            f,
        )

        if rc_replay != 0:
            log("ABORTADO -- Replay falhou.", f)
            sys.exit(1)

        # ------------------------------------------------------------------
        # Stage 2: Transform Worker
        # ------------------------------------------------------------------
        log(">>> STAGE 2: TRANSFORM WORKER (Kafka -> Bronze + transformed.licitacoes) <<<", f)
        t0 = time.monotonic()
        rc_trn, lines_trn = run_worker(
            "TRANSFORM",
            [PYTHON, "workers/transform_worker.py"],
            f,
            timeout=TIMEOUT_TRANSFORM,
        )
        t_trn = time.monotonic() - t0
        total_transformados = parse_int(lines_trn, r"transformados=(\d+)")
        log(
            f"[TRANSFORM] rc={rc_trn} | transformados={total_transformados} | {t_trn:.0f}s\n",
            f,
        )

        # ------------------------------------------------------------------
        # Stage 3: Load Worker
        # ------------------------------------------------------------------
        log(">>> STAGE 3: LOAD WORKER (transformed.licitacoes -> Silver + MongoDB) <<<", f)
        t0 = time.monotonic()
        rc_load, lines_load = run_worker(
            "LOAD",
            [PYTHON, "workers/load_worker.py"],
            f,
            timeout=TIMEOUT_LOAD,
        )
        t_load = time.monotonic() - t0
        total_carregados = parse_int(lines_load, r"carregados=(\d+)")
        if total_carregados == -1:
            # Fallback: "Batch * persistido | total=N" is cumulative; max = final count
            total_carregados = max(
                (int(m.group(1)) for line in lines_load for m in [re.search(r"persistido \| total=(\d+)", line)] if m),
                default=-1,
            )
        log(
            f"[LOAD] rc={rc_load} | carregados={total_carregados} | {t_load:.0f}s\n",
            f,
        )

        # ------------------------------------------------------------------
        # Post-load: MongoDB count
        # ------------------------------------------------------------------
        log("[POS-CARGA] Contando documentos em contratos_ativos...", f)
        ok_post, count_depois = checar_mongo()
        if ok_post:
            delta = count_depois - count_antes if count_antes >= 0 else -1
            log(
                f"[POS-CARGA] contratos_ativos = {count_depois} documentos "
                f"(delta: {'+' if delta >= 0 else ''}{delta})\n",
                f,
            )
        else:
            log("[POS-CARGA] ERRO -- nao foi possivel consultar MongoDB\n", f)
            count_depois = -1

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        fim_dt = datetime.now(tz=timezone.utc)
        duracao = time.monotonic() - inicio_mono

        erros = [
            w
            for w, rc in [
                ("Replay", rc_replay),
                ("Transform", rc_trn),
                ("Load", rc_load),
            ]
            if rc != 0
        ]
        status = "SUCESSO" if not erros else f"FALHA ({', '.join(erros)})"

        sep = "=" * 70
        log(sep, f)
        log("RESUMO DA EXECUCAO", f)
        log(sep, f)
        log("Tipo            : Replay Bronze -> Kafka -> Transform -> Load", f)
        log(f"Inicio          : {inicio_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", f)
        log(f"Fim             : {fim_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", f)
        log(f"Duracao total   : {duracao:.0f}s", f)
        log(f"Origem dos dados: Bronze {BRONZE_ORIGIN_DATE} ({BRONZE_ORIGIN_COUNT} registros)", f)
        log(f"Publicados Kafka: {total_publicados}", f)
        log(f"Transformados   : {total_transformados}", f)
        log(f"Carregados      : {total_carregados}", f)
        log(f"MongoDB antes   : {count_antes} documentos", f)
        log(f"MongoDB depois  : {count_depois} documentos", f)
        log(f"Status final    : {status}", f)
        log(sep, f)

    print(f"\nArquivo de evidencia salvo em:\n  {OUT_FILE}")


if __name__ == "__main__":
    main()
