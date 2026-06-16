"""
Artefato 3 — Transcricao MCP: function calling Groq + MongoDB Atlas.

Executa com o venv do MCP (tem groq + pymongo):
    cd <repo-root>
    mcp\\.venv\\Scripts\\python.exe pipeline\\evidencias\\consulta_mcp.py

Fallback automatico: Groq -> Ollama -> queries diretas no MongoDB.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_EVIDENCIAS = Path(__file__).parent           # pipeline/evidencias/
_PIPELINE   = _EVIDENCIAS.parent              # pipeline/
_REPO       = _PIPELINE.parent                # repo root
_MCP_ENV    = _REPO / "mcp" / ".env"

OUTPUT_FILE = _EVIDENCIAS / "transcricao_mcp_20260615.txt"

# ---------------------------------------------------------------------------
# Load mcp/.env
# ---------------------------------------------------------------------------

try:
    from dotenv import dotenv_values
    _env = dotenv_values(str(_MCP_ENV))
except ImportError:
    import os
    _env = {}
    if _MCP_ENV.exists():
        for line in _MCP_ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                _env[k.strip()] = v.strip()

MONGO_URI     = _env.get("MONGO_URI") or _env.get("MONGODB_URI")
MONGO_DB_NAME = _env.get("MONGO_DB_NAME", "licitei")
GROQ_API_KEY  = _env.get("GROQ_API_KEY")
GROQ_BASE_URL = _env.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_MODEL    = "llama-3.3-70b-versatile"
OLLAMA_URL    = _env.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL  = _env.get("OLLAMA_MODEL", "qwen2.5:7b")

if not MONGO_URI:
    print(f"ERRO: MONGO_URI ausente em {_MCP_ENV}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Date range — "ultimo trimestre" relativo a 15/06/2026
# ---------------------------------------------------------------------------

DATA_INICIO = "2026-03-15T00:00:00Z"
DATA_FIM    = "2026-06-15T23:59:59Z"

PERGUNTA = (
    "Qual o valor total das licitações publicadas em Pernambuco "
    "no último trimestre, separadas por modalidade?"
)

# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_licitacoes_pe",
            "description": (
                "Busca licitações publicadas em Pernambuco (UF=PE) no período informado. "
                "Retorna lista com objeto_compra, valor_total_estimado e modalidade_nome."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "data_inicio": {
                        "type": "string",
                        "description": "Data de início ISO 8601, ex: 2026-03-15T00:00:00Z",
                    },
                    "data_fim": {
                        "type": "string",
                        "description": "Data de fim ISO 8601, ex: 2026-06-15T23:59:59Z",
                    },
                },
                "required": ["data_inicio", "data_fim"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "agregar_por_modalidade",
            "description": (
                "Agrupa registros de licitações por modalidade_nome, "
                "soma valor_total_estimado por grupo, retorna ordenado por valor decrescente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "registros": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "Lista com campos objeto_compra, valor_total_estimado, modalidade_nome.",
                    }
                },
                "required": ["registros"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def buscar_licitacoes_pe(data_inicio: str, data_fim: str) -> list:
    from pymongo import MongoClient
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client[MONGO_DB_NAME]
    col = db["contratos_ativos"]
    docs = list(col.find(
        {"uf": "PE", "data_abertura_proposta": {"$gte": data_inicio, "$lte": data_fim}},
        {"objeto_compra": 1, "valor_total_estimado": 1, "modalidade_nome": 1, "_id": 0},
    ))
    client.close()
    # Return compact representation to the LLM to avoid oversized tool responses.
    # objeto_compra is stored in full for human review but not sent back to Groq.
    return [
        {"modalidade_nome": d.get("modalidade_nome"), "valor_total_estimado": d.get("valor_total_estimado")}
        for d in docs
    ]


def agregar_por_modalidade(registros: list) -> list:
    acumulado: dict = {}
    for r in registros:
        m = r.get("modalidade_nome") or "Desconhecida"
        acumulado[m] = acumulado.get(m, 0.0) + (r.get("valor_total_estimado") or 0.0)
    return sorted(
        [{"modalidade": m, "valor_total": v} for m, v in acumulado.items()],
        key=lambda x: -x["valor_total"],
    )


def executar_tool(name: str, args: dict):
    if name == "buscar_licitacoes_pe":
        return buscar_licitacoes_pe(**args)
    if name == "agregar_por_modalidade":
        return agregar_por_modalidade(**args)
    raise ValueError(f"Tool desconhecida: {name}")

# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def fmt_brl(v: float) -> str:
    """Format value as Brazilian Real, e.g. R$ 102.835.317,59"""
    formatted = f"{v:,.2f}"                   # 102,835,317.59
    intpart, dec = formatted.split(".")
    intpart = intpart.replace(",", ".")       # 102.835.317
    return f"R$ {intpart},{dec}"


def box_line(content: str, width: int = 50) -> str:
    """Pad content to fixed width inside box borders."""
    return f"║  {content:<{width - 2}}║"

# ---------------------------------------------------------------------------
# LLM client selection
# ---------------------------------------------------------------------------

def get_client():
    """Returns (client, model, provider_label). Tries Groq, then Ollama, then None."""
    if GROQ_API_KEY:
        try:
            from groq import Groq
            c = Groq(api_key=GROQ_API_KEY)
            return c, GROQ_MODEL, f"llama-3.3-70b-versatile (Groq)"
        except Exception as e:
            print(f"[AVISO] Groq indisponivel: {e}", flush=True)

    try:
        from openai import OpenAI
        c = OpenAI(base_url=OLLAMA_URL, api_key="ollama")
        return c, OLLAMA_MODEL, f"{OLLAMA_MODEL} (Ollama)"
    except Exception as e:
        print(f"[AVISO] Ollama indisponivel: {e}", flush=True)

    return None, None, None

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    now = datetime.now(tz=timezone.utc)
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    print(f"[MCP] Inicio: {timestamp}")
    print(f"[MCP] Carregando credenciais de: {_MCP_ENV}")

    client, model, provider_label = get_client()
    use_llm = client is not None

    tool_calls_log: list  = []
    registros_encontrados = 0
    agregacao_resultado: list = []
    resposta_final = ""

    if not use_llm:
        # Fallback: run queries directly
        print("[FALLBACK] Nenhum LLM disponivel — executando queries direto no MongoDB", flush=True)
        registros = buscar_licitacoes_pe(DATA_INICIO, DATA_FIM)
        registros_encontrados = len(registros)
        agregacao_resultado = agregar_por_modalidade(registros)
        tool_calls_log = [
            {"tool": "buscar_licitacoes_pe",
             "params": {"data_inicio": DATA_INICIO, "data_fim": DATA_FIM},
             "n": registros_encontrados},
            {"tool": "agregar_por_modalidade",
             "result": agregacao_resultado},
        ]
        provider_label = "SEM LLM — queries diretas no MongoDB"
    else:
        print(f"[MCP] Usando: {provider_label}", flush=True)
        messages = [
            {
                "role": "system",
                "content": (
                    "Você é LicIA, assistente especializado em licitações públicas do Brasil. "
                    f"Hoje é {now.strftime('%d/%m/%Y')}. "
                    "Use as ferramentas disponíveis para responder com dados reais do MongoDB."
                ),
            },
            {"role": "user", "content": PERGUNTA},
        ]

        # Agentic loop — iterate until no more tool calls
        while True:
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    temperature=0,
                )
            except Exception as e:
                print(f"[ERRO] LLM falhou: {e}", flush=True)
                # Fallback to direct queries
                use_llm = False
                provider_label += " [ERRO — fallback direto]"
                registros = buscar_licitacoes_pe(DATA_INICIO, DATA_FIM)
                registros_encontrados = len(registros)
                agregacao_resultado = agregar_por_modalidade(registros)
                tool_calls_log = [
                    {"tool": "buscar_licitacoes_pe",
                     "params": {"data_inicio": DATA_INICIO, "data_fim": DATA_FIM},
                     "n": registros_encontrados},
                    {"tool": "agregar_por_modalidade",
                     "result": agregacao_resultado},
                ]
                break

            choice = resp.choices[0]
            msg = choice.message

            if msg.tool_calls:
                messages.append(msg)
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    fn_args = json.loads(tc.function.arguments)
                    print(f"[TOOL CALL] {fn_name} params={fn_args}", flush=True)

                    result = executar_tool(fn_name, fn_args)

                    if fn_name == "buscar_licitacoes_pe":
                        registros_encontrados = len(result)
                        tool_calls_log.append({
                            "tool": fn_name,
                            "params": fn_args,
                            "n": registros_encontrados,
                        })
                    elif fn_name == "agregar_por_modalidade":
                        if isinstance(result, list):
                            agregacao_resultado = result
                        tool_calls_log.append({
                            "tool": fn_name,
                            "result": result,
                        })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    })
            else:
                resposta_final = msg.content or ""
                print(f"[MCP] Resposta final recebida ({len(resposta_final)} chars)", flush=True)
                break

    # ---------------------------------------------------------------------------
    # Build transcript
    # ---------------------------------------------------------------------------

    valor_total   = sum(r.get("valor_total", 0) for r in agregacao_resultado)
    n_modalidades = len(agregacao_resultado)

    W = 50  # inner box width
    border_top    = "╔" + "═" * W + "╗"
    border_bottom = "╚" + "═" * W + "╝"
    sep_line      = "═" * (W + 2)

    transcript_lines: list[str] = []

    transcript_lines.append(border_top)
    transcript_lines.append(box_line("CONSULTA MCP — LICITEI", W))
    transcript_lines.append(box_line(f"Data: {timestamp}", W))
    transcript_lines.append(box_line(f"Modelo: {provider_label}", W))
    transcript_lines.append(box_line("Fonte: MongoDB Atlas — contratos_ativos", W))
    transcript_lines.append(border_bottom)
    transcript_lines.append("")
    transcript_lines.append("USUÁRIO:")
    transcript_lines.append(PERGUNTA)
    transcript_lines.append("")

    for tc in tool_calls_log:
        if tc["tool"] == "buscar_licitacoes_pe":
            transcript_lines.append(f"[TOOL CALL] buscar_licitacoes_pe")
            transcript_lines.append(f"Parâmetros: {json.dumps(tc['params'], ensure_ascii=False)}")
            transcript_lines.append(f"Registros retornados: {tc['n']}")
            transcript_lines.append("")
        elif tc["tool"] == "agregar_por_modalidade":
            transcript_lines.append(f"[TOOL CALL] agregar_por_modalidade")
            transcript_lines.append("Resultado:")
            for r in tc.get("result", []):
                transcript_lines.append(f"  {r['modalidade']}: {fmt_brl(r['valor_total'])}")
            transcript_lines.append("")

    transcript_lines.append("ASSISTENTE:")
    if resposta_final:
        transcript_lines.append(resposta_final)
    else:
        # Compose a fallback narrative answer
        lines_ans: list[str] = [
            f"Com base nos dados do MongoDB Atlas (coleção contratos_ativos), "
            f"foram encontradas {registros_encontrados} licitações publicadas em "
            f"Pernambuco no último trimestre "
            f"({DATA_INICIO[:10]} a {DATA_FIM[:10]}).",
            "",
            "Distribuição por modalidade:",
        ]
        for r in agregacao_resultado:
            lines_ans.append(f"  • {r['modalidade']}: {fmt_brl(r['valor_total'])}")
        lines_ans.append("")
        lines_ans.append(f"Valor total estimado: {fmt_brl(valor_total)}")
        transcript_lines.extend(lines_ans)

    transcript_lines.append("")
    transcript_lines.append(sep_line)
    transcript_lines.append(f"Total de registros consultados: {registros_encontrados}")
    transcript_lines.append(f"Valor total agregado: {fmt_brl(valor_total)}")
    transcript_lines.append(f"Modalidades distintas: {n_modalidades}")
    if not use_llm:
        transcript_lines.append("Nota: LLM indisponível — consulta executada diretamente via pymongo")

    transcript = "\n".join(transcript_lines)
    OUTPUT_FILE.write_text(transcript, encoding="utf-8")

    # ---------------------------------------------------------------------------
    # Terminal summary
    # ---------------------------------------------------------------------------

    print()
    print("=" * 52)
    print(f"Docs PE encontrados    : {registros_encontrados}")
    print(f"Valor total            : {fmt_brl(valor_total)}")
    print(f"Modalidades distintas  : {n_modalidades}")
    for r in agregacao_resultado:
        print(f"  {r['modalidade']}: {fmt_brl(r['valor_total'])}")
    print("=" * 52)
    print(f"Transcricao salva em: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
