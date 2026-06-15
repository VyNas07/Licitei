"""
Executa o pipeline Licitei (Extract -> Transform -> Load) e grava evidencia.

Uso (dentro de pipeline/ com venv ativo):
    python run_evidence.py

Saida:
    pipeline/evidencias/run_pipeline_YYYYMMDD.txt
"""

import os
import re
import signal
import subprocess
import sys
import threading
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------

PIPELINE_DIR = Path(__file__).parent

if sys.platform == "win32":
    PYTHON = str(PIPELINE_DIR / ".venv" / "Scripts" / "python.exe")
else:
    PYTHON = str(PIPELINE_DIR / ".venv" / "bin" / "python")

DATA_FINAL = date.today()
DATA_INICIAL = DATA_FINAL - timedelta(days=7)
DI = DATA_INICIAL.strftime("%Y%m%d")
DF = DATA_FINAL.strftime("%Y%m%d")

EVIDENCIAS_DIR = PIPELINE_DIR / "evidencias"
EVIDENCIAS_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = EVIDENCIAS_DIR / f"run_pipeline_{DATA_FINAL.strftime('%Y%m%d')}.txt"

TIMEOUT_TRANSFORM = 120
TIMEOUT_LOAD = 120

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
# Execucao de worker
# ---------------------------------------------------------------------------

def run_worker(
    name: str,
    args: list,
    log_file,
    timeout: int | None = None,
) -> tuple[int, list[str]]:
    """
    Executa worker como subprocess, captura output em tempo real.
    Se timeout != None: envia CTRL_BREAK/SIGINT apos N segundos para
    acionar o bloco finally dos workers (flush + close).
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

    if timeout is None:
        proc.wait()
        t.join(timeout=10)
    else:
        try:
            proc.wait(timeout=timeout)
            log(f"[{name}] encerrou naturalmente (rc={proc.returncode})", log_file)
        except subprocess.TimeoutExpired:
            log(
                f"[{name}] timeout={timeout}s atingido -- enviando sinal de parada",
                log_file,
            )
            if sys.platform == "win32":
                os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
            else:
                proc.send_signal(signal.SIGINT)

            try:
                proc.wait(timeout=25)
                log(f"[{name}] encerrou graciosamente", log_file)
            except subprocess.TimeoutExpired:
                log(f"[{name}] nao encerrou -- forcando kill", log_file)
                proc.kill()
                proc.wait()

        t.join(timeout=10)

    return proc.returncode or 0, output_lines


# ---------------------------------------------------------------------------
# Parsing de metricas do output
# ---------------------------------------------------------------------------

def parse_int(lines: list[str], pattern: str) -> int:
    for line in reversed(lines):
        m = re.search(pattern, line)
        if m:
            return int(m.group(1))
    return -1


# ---------------------------------------------------------------------------
# Verificacao de conectividade MongoDB
# ---------------------------------------------------------------------------

def checar_mongo() -> bool:
    check_script = (
        "import sys; sys.path.insert(0, '.'); "
        "from src.config import carregar_config; "
        "from pymongo import MongoClient; "
        "c = carregar_config(); "
        "client = MongoClient(c.mongo_uri, serverSelectionTimeoutMS=8000); "
        "count = client[c.mongo_db_name]['contratos_ativos'].count_documents({}); "
        "print(f'MONGO_OK count={count}'); "
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
        print(f"  MongoDB OK -- {count} documentos em contratos_ativos")
        return True
    print(f"  MongoDB ERRO -- {result.stderr.strip() or result.stdout.strip()}")
    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    inicio_dt = datetime.now(tz=timezone.utc)
    inicio_mono = time.monotonic()

    with OUT_FILE.open("w", encoding="utf-8") as f:

        # ------------------------------------------------------------------
        # Cabecalho
        # ------------------------------------------------------------------
        log("=" * 70, f)
        log("EVIDENCIA -- Pipeline Licitei (Extract -> Transform -> Load)", f)
        log(f"Arquivo  : {OUT_FILE}", f)
        log(f"Inicio   : {inicio_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", f)
        log(f"Periodo  : {DI} -> {DF}  (ultimos 7 dias)", f)
        log("=" * 70, f)

        # ------------------------------------------------------------------
        # Pre-checks
        # ------------------------------------------------------------------
        log("\n[PRE-CHECK] Verificando conectividade MongoDB Atlas...", f)
        if not checar_mongo():
            log("ABORTADO -- MongoDB inacessivel.", f)
            sys.exit(1)
        log("[PRE-CHECK] OK\n", f)

        # ------------------------------------------------------------------
        # Extract
        # ------------------------------------------------------------------
        log(">>> EXTRACT WORKER <<<", f)
        t0 = time.monotonic()
        rc_ext, lines_ext = run_worker(
            "EXTRACT",
            [PYTHON, "workers/extract_worker.py", "--dataInicial", DI, "--dataFinal", DF],
            f,
            timeout=None,
        )
        t_ext = time.monotonic() - t0
        total_extraidos = parse_int(lines_ext, r"publicados=(\d+)")
        log(f"[EXTRACT] rc={rc_ext} | extraidos={total_extraidos} | {t_ext:.0f}s\n", f)

        if rc_ext != 0:
            log("ABORTADO -- Extract Worker retornou erro.", f)
            sys.exit(1)

        # ------------------------------------------------------------------
        # Transform
        # ------------------------------------------------------------------
        log(">>> TRANSFORM WORKER <<<", f)
        t0 = time.monotonic()
        rc_trn, lines_trn = run_worker(
            "TRANSFORM",
            [PYTHON, "workers/transform_worker.py"],
            f,
            timeout=TIMEOUT_TRANSFORM,
        )
        t_trn = time.monotonic() - t0
        total_transformados = parse_int(lines_trn, r"transformados=(\d+)")
        log(f"[TRANSFORM] rc={rc_trn} | transformados={total_transformados} | {t_trn:.0f}s\n", f)

        # ------------------------------------------------------------------
        # Load
        # ------------------------------------------------------------------
        log(">>> LOAD WORKER <<<", f)
        t0 = time.monotonic()
        rc_load, lines_load = run_worker(
            "LOAD",
            [PYTHON, "workers/load_worker.py"],
            f,
            timeout=TIMEOUT_LOAD,
        )
        t_load = time.monotonic() - t0
        total_carregados = parse_int(lines_load, r"carregados=(\d+)")
        log(f"[LOAD] rc={rc_load} | carregados={total_carregados} | {t_load:.0f}s\n", f)

        # ------------------------------------------------------------------
        # Contagem pos-carga no MongoDB
        # ------------------------------------------------------------------
        log("[POS-CARGA] Contando documentos em contratos_ativos...", f)
        count_script = (
            "import sys; sys.path.insert(0, '.'); "
            "from src.config import carregar_config; "
            "from pymongo import MongoClient; "
            "c = carregar_config(); "
            "client = MongoClient(c.mongo_uri, serverSelectionTimeoutMS=8000); "
            "n = client[c.mongo_db_name]['contratos_ativos'].count_documents({}); "
            "print(f'FINAL_COUNT={n}'); "
            "client.close()"
        )
        res = subprocess.run(
            [PYTHON, "-c", count_script],
            cwd=str(PIPELINE_DIR),
            capture_output=True,
            text=True,
            timeout=20,
        )
        m = re.search(r"FINAL_COUNT=(\d+)", res.stdout)
        total_mongo = int(m.group(1)) if m else -1
        log(f"[POS-CARGA] contratos_ativos = {total_mongo} documentos\n", f)

        # ------------------------------------------------------------------
        # Resumo
        # ------------------------------------------------------------------
        fim_dt = datetime.now(tz=timezone.utc)
        duracao = time.monotonic() - inicio_mono

        erros = [
            w for w, rc in [("Extract", rc_ext), ("Transform", rc_trn), ("Load", rc_load)]
            if rc != 0
        ]
        status = "SUCESSO" if not erros else f"FALHA ({', '.join(erros)})"

        log("=" * 70, f)
        log("RESUMO DA EXECUCAO", f)
        log("=" * 70, f)
        log(f"Inicio          : {inicio_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", f)
        log(f"Fim             : {fim_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", f)
        log(f"Duracao total   : {duracao:.0f}s", f)
        log(f"Periodo PNCP    : {DI} -> {DF}", f)
        log(f"Extraidos       : {total_extraidos}", f)
        log(f"Transformados   : {total_transformados}", f)
        log(f"Carregados      : {total_carregados}", f)
        log(f"MongoDB total   : {total_mongo} documentos em contratos_ativos", f)
        log(f"Status final    : {status}", f)
        log("=" * 70, f)

    print(f"\nArquivo de evidencia salvo em:\n  {OUT_FILE}")


if __name__ == "__main__":
    main()
