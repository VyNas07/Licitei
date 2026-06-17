"""Dashboard Streamlit — Análise de Negócio (Gold) + Saúde do Pipeline (Medallion).

Execução:
    streamlit run dashboard/app.py
"""

import os
import sqlite3
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import plotly.express as px
import pyarrow.parquet as pq
import streamlit as st
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv()

st.set_page_config(
    page_title="Licitei — Painel de Licitações",
    page_icon="📊",
    layout="wide",
)

_COLECAO_DASHBOARD = "kpi_dashboard"
_COLECAO_POR_UF = "kpi_por_uf"
_COLECAO_POR_MODALIDADE = "kpi_por_modalidade"
_COLECAO_PRAZOS = "kpi_prazos"
_COLECAO_ELEGIBILIDADE = "kpi_elegibilidade"
_COLECAO_CONTRATOS = "contratos_ativos"

_PIPELINE_ROOT = Path(__file__).parent.parent
_BRONZE_BASE_PATH = _PIPELINE_ROOT / Path(os.getenv("BRONZE_BASE_PATH", "data/bronze"))
_SQLITE_DB_PATH = _PIPELINE_ROOT / Path(os.getenv("SQLITE_DB_PATH", "data/licitacoes.db"))


# ---------------------------------------------------------------------------
# Conexão MongoDB
# ---------------------------------------------------------------------------


def _mongo_client() -> tuple[MongoClient, str] | None:
    """Cria cliente MongoDB. Retorna (client, db_name) ou None se variáveis ausentes."""
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    if not all([uri, db_name]):
        return None
    return MongoClient(uri), db_name


# ---------------------------------------------------------------------------
# Funções de leitura — Gold (coleções KPI existentes)
# ---------------------------------------------------------------------------


@st.cache_data(ttl=3600)
def _carregar_dashboard() -> dict:
    """Carrega o KPI consolidado do dashboard (mais recente)."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    try:
        docs = list(
            client[db_name][_COLECAO_DASHBOARD]
            .find({}, {"_id": 0})
            .sort("data_referencia", -1)
            .limit(1)
        )
        return docs[0] if docs else {}
    except PyMongoError:
        return {}
    finally:
        client.close()


@st.cache_data(ttl=3600)
def _carregar_por_uf() -> pd.DataFrame:
    """Carrega KPIs por UF do dia mais recente disponível."""
    conn = _mongo_client()
    if conn is None:
        return pd.DataFrame()
    client, db_name = conn
    try:
        data_ref = _data_referencia_mais_recente(client, db_name, _COLECAO_POR_UF)
        if data_ref is None:
            return pd.DataFrame()
        docs = list(
            client[db_name][_COLECAO_POR_UF].find(
                {"data_referencia": data_ref}, {"_id": 0}
            )
        )
        return pd.DataFrame(docs) if docs else pd.DataFrame()
    except PyMongoError:
        return pd.DataFrame()
    finally:
        client.close()


@st.cache_data(ttl=3600)
def _carregar_por_modalidade() -> pd.DataFrame:
    """Carrega KPIs por modalidade do dia mais recente disponível."""
    conn = _mongo_client()
    if conn is None:
        return pd.DataFrame()
    client, db_name = conn
    try:
        data_ref = _data_referencia_mais_recente(client, db_name, _COLECAO_POR_MODALIDADE)
        if data_ref is None:
            return pd.DataFrame()
        docs = list(
            client[db_name][_COLECAO_POR_MODALIDADE].find(
                {"data_referencia": data_ref}, {"_id": 0}
            )
        )
        return pd.DataFrame(docs) if docs else pd.DataFrame()
    except PyMongoError:
        return pd.DataFrame()
    finally:
        client.close()


@st.cache_data(ttl=3600)
def _carregar_prazos() -> dict:
    """Carrega KPI de prazos do dia mais recente."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    try:
        docs = list(
            client[db_name][_COLECAO_PRAZOS]
            .find({}, {"_id": 0})
            .sort("data_referencia", -1)
            .limit(1)
        )
        return docs[0] if docs else {}
    except PyMongoError:
        return {}
    finally:
        client.close()


@st.cache_data(ttl=3600)
def _carregar_elegibilidade() -> dict:
    """Carrega KPI de elegibilidade MEI do dia mais recente."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    try:
        docs = list(
            client[db_name][_COLECAO_ELEGIBILIDADE]
            .find({}, {"_id": 0})
            .sort("data_referencia", -1)
            .limit(1)
        )
        return docs[0] if docs else {}
    except PyMongoError:
        return {}
    finally:
        client.close()


def _data_referencia_mais_recente(client: MongoClient, db_name: str, colecao: str) -> str | None:
    """Retorna a data_referencia mais recente disponível em uma coleção."""
    doc = (
        client[db_name][colecao]
        .find({}, {"data_referencia": 1, "_id": 0})
        .sort("data_referencia", -1)
        .limit(1)
    )
    docs = list(doc)
    return docs[0]["data_referencia"] if docs else None


# ---------------------------------------------------------------------------
# Funções de leitura — camadas Bronze, Silver e Gold (saúde do pipeline)
# ---------------------------------------------------------------------------


@st.cache_data(ttl=3600)
def _carregar_metricas_bronze() -> dict:
    """Lê metadados dos arquivos Parquet na camada Bronze sem carregar os dados."""
    base = _BRONZE_BASE_PATH
    if not base.exists():
        return {}

    arquivos = sorted(base.rglob("*.parquet"))
    if not arquivos:
        return {}

    total_registros = 0
    tamanho_bytes = 0
    ultima_mtime = 0.0
    por_dia: dict[str, dict] = {}

    for f in arquivos:
        try:
            meta = pq.ParquetFile(f).metadata
            n = meta.num_rows
        except Exception:
            n = 0

        total_registros += n
        tamanho_bytes += f.stat().st_size
        mtime = f.stat().st_mtime
        if mtime > ultima_mtime:
            ultima_mtime = mtime

        # extrai o dia da hierarquia year=.../month=.../day=.../
        partes = f.parts
        dia_label = "/".join(p for p in partes if p.startswith(("year=", "month=", "day=")))
        if dia_label not in por_dia:
            por_dia[dia_label] = {"arquivos": 0, "registros": 0}
        por_dia[dia_label]["arquivos"] += 1
        por_dia[dia_label]["registros"] += n

    ultima_extracao = (
        datetime.fromtimestamp(ultima_mtime).strftime("%Y-%m-%d %H:%M:%S")
        if ultima_mtime
        else "—"
    )

    df_por_dia = pd.DataFrame(
        [{"partição": k, "arquivos": v["arquivos"], "registros": v["registros"]}
         for k, v in sorted(por_dia.items())]
    )

    return {
        "total_arquivos": len(arquivos),
        "total_registros": total_registros,
        "tamanho_mb": round(tamanho_bytes / 1_048_576, 2),
        "ultima_extracao": ultima_extracao,
        "df_por_dia": df_por_dia,
    }


@st.cache_data(ttl=3600)
def _carregar_metricas_silver() -> dict:
    """Lê métricas da camada Silver via SQLite (tabela licitacoes)."""
    db_path = _SQLITE_DB_PATH
    if not db_path.exists():
        return {}

    try:
        conn = sqlite3.connect(db_path)
        row = conn.execute(
            "SELECT COUNT(*), SUM(elegivel_mei), SUM(ativo), MAX(processado_em) FROM licitacoes"
        ).fetchone()
        total, elegiveis, ativos, processado_ate = row if row else (0, 0, 0, None)

        faixas = conn.execute(
            "SELECT faixa_valor, COUNT(*) AS qtd FROM licitacoes GROUP BY faixa_valor ORDER BY qtd DESC"
        ).fetchall()
        conn.close()
    except sqlite3.Error:
        return {}

    df_faixas = pd.DataFrame(faixas, columns=["faixa_valor", "quantidade"]) if faixas else pd.DataFrame()

    return {
        "total_registros": int(total or 0),
        "total_elegiveis": int(elegiveis or 0),
        "total_ativos": int(ativos or 0),
        "processado_ate": processado_ate or "—",
        "df_faixas": df_faixas,
    }


@st.cache_data(ttl=3600)
def _carregar_metricas_gold_pipeline() -> dict:
    """Lê contagem real de contratos_ativos e timestamp de atualização dos KPIs."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    try:
        db = client[db_name]
        total_contratos = db[_COLECAO_CONTRATOS].count_documents({})
        kpi = db[_COLECAO_DASHBOARD].find_one({}, {"_id": 0}, sort=[("data_referencia", -1)])
    except PyMongoError:
        return {}
    finally:
        client.close()

    if not kpi:
        return {"total_contratos": total_contratos}

    return {
        "total_contratos": total_contratos,
        "valor_agregado": kpi.get("valor_agregado_total", 0.0),
        "total_orgaos": kpi.get("total_orgaos_distintos", 0),
        "atualizado_em": str(kpi.get("data_referencia", "—")),
    }


# ---------------------------------------------------------------------------
# Funções de renderização — Análise de Negócio (Gold)
# ---------------------------------------------------------------------------


def _renderizar_kpis_gerais(dashboard: dict) -> None:
    """Renderiza os KPIs principais no topo da página."""
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total de Editais", f"{dashboard.get('total_editais', 0):,}")
    col2.metric(
        "Valor Agregado",
        f"R$ {dashboard.get('valor_agregado_total', 0.0):,.0f}",
    )
    col3.metric(
        "Ticket Médio",
        f"R$ {dashboard.get('ticket_medio', 0.0):,.0f}",
    )
    col4.metric("Órgãos Distintos", f"{dashboard.get('total_orgaos_distintos', 0):,}")
    col5.metric("Editais Ativos", f"{dashboard.get('editais_ativos', 0):,}")


def _renderizar_prazos_e_eligibilidade(prazos: dict, elegibilidade: dict) -> None:
    """Renderiza métricas de prazos e elegibilidade MEI."""
    col_p, col_e = st.columns(2)

    with col_p:
        st.subheader("Editais com encerramento próximo")
        p1, p2, p3 = st.columns(3)
        p1.metric("Próximos 7 dias", prazos.get("editais_7d", 0))
        p2.metric("Próximos 15 dias", prazos.get("editais_15d", 0))
        p3.metric("Próximos 30 dias", prazos.get("editais_30d", 0))

    with col_e:
        st.subheader("Elegibilidade MEI (teto R$81k)")
        e1, e2, e3 = st.columns(3)
        e1.metric("Elegíveis para MEI", elegibilidade.get("total_elegiveis_mei", 0))
        e2.metric(
            "Valor Total Elegível",
            f"R$ {elegibilidade.get('valor_total_elegiveis', 0.0):,.0f}",
        )
        e3.metric(
            "% Elegíveis",
            f"{elegibilidade.get('percentual_elegivel', 0.0):.1f}%",
        )


def _renderizar_graficos_uf(df_uf: pd.DataFrame) -> None:
    """Renderiza gráficos de licitações e valor por UF."""
    if df_uf.empty:
        st.warning("Dados por UF ainda não disponíveis.")
        return

    col_esq, col_dir = st.columns(2)

    with col_esq:
        st.subheader("Total de Editais por Estado")
        df_sorted = df_uf.sort_values("total_editais", ascending=False)
        fig = px.bar(
            df_sorted,
            x="uf",
            y="total_editais",
            color="total_editais",
            color_continuous_scale="Blues",
            labels={"uf": "UF", "total_editais": "Quantidade"},
        )
        fig.update_layout(coloraxis_showscale=False)
        st.plotly_chart(fig, use_container_width=True)

    with col_dir:
        st.subheader("Valor Total por Estado (R$)")
        df_sorted = df_uf.sort_values("valor_total", ascending=False)
        fig = px.bar(
            df_sorted,
            x="uf",
            y="valor_total",
            color="valor_total",
            color_continuous_scale="Greens",
            labels={"uf": "UF", "valor_total": "Valor Total (R$)"},
        )
        fig.update_layout(coloraxis_showscale=False)
        st.plotly_chart(fig, use_container_width=True)


def _renderizar_graficos_modalidade(df_mod: pd.DataFrame) -> None:
    """Renderiza gráficos de licitações por modalidade."""
    if df_mod.empty:
        st.warning("Dados por modalidade ainda não disponíveis.")
        return

    col_esq, col_dir = st.columns(2)

    with col_esq:
        st.subheader("Distribuição por Modalidade")
        fig = px.pie(
            df_mod,
            values="total_editais",
            names="modalidade",
            hole=0.4,
        )
        fig.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig, use_container_width=True)

    with col_dir:
        st.subheader("Valor Total por Modalidade (R$)")
        df_sorted = df_mod.sort_values("valor_total", ascending=False)
        fig = px.bar(
            df_sorted,
            x="valor_total",
            y="modalidade",
            orientation="h",
            color="valor_total",
            color_continuous_scale="Purples",
            labels={"modalidade": "Modalidade", "valor_total": "Valor Total (R$)"},
        )
        fig.update_layout(
            yaxis={"autorange": "reversed"},
            coloraxis_showscale=False,
        )
        st.plotly_chart(fig, use_container_width=True)


# ---------------------------------------------------------------------------
# Função de renderização — Saúde do Pipeline (multicamadas)
# ---------------------------------------------------------------------------


def _renderizar_detalhe_bronze(bronze: dict) -> None:
    if bronze and not bronze["df_por_dia"].empty:
        st.dataframe(bronze["df_por_dia"], use_container_width=True, hide_index=True)
    else:
        st.info("Sem dados de partição disponíveis.")


def _renderizar_detalhe_silver(silver: dict) -> None:
    if silver and not silver["df_faixas"].empty:
        df = silver["df_faixas"].copy()
        total = df["quantidade"].sum()
        df["percentual"] = (df["quantidade"] / total * 100).round(1).astype(str) + "%"
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("Sem dados de faixa de valor disponíveis.")


def _renderizar_saude_pipeline() -> None:
    """Renderiza o painel de saúde das três camadas Medallion."""
    st.header("Arquitetura Medallion — Estado Atual")

    bronze = _carregar_metricas_bronze()
    silver = _carregar_metricas_silver()
    gold = _carregar_metricas_gold_pipeline()

    col_b, col_s, col_g = st.columns(3)

    with col_b:
        st.subheader("🥉 Bronze")
        st.caption("Dado bruto · Parquet + Snappy")
        if bronze:
            st.metric("Arquivos Parquet", f"{bronze['total_arquivos']:,}")
            st.metric("Registros Brutos", f"{bronze['total_registros']:,}")
            st.metric("Tamanho em Disco", f"{bronze['tamanho_mb']} MB")
            st.metric("Última Extração", bronze["ultima_extracao"])
        else:
            st.warning("Nenhum arquivo Parquet encontrado.")
            st.caption(f"Caminho: `{_BRONZE_BASE_PATH}`")

    with col_s:
        st.subheader("🥈 Silver")
        st.caption("Transformado · PyIceberg + SQLite")
        if silver:
            total = silver["total_registros"]
            elegiveis = silver["total_elegiveis"]
            pct = round(elegiveis / total * 100, 1) if total else 0.0
            st.metric("Registros Validados", f"{total:,}")
            st.metric("Elegíveis MEI", f"{elegiveis:,} ({pct}%)")
            st.metric("Editais Ativos", f"{silver['total_ativos']:,}")
            st.metric("Processado até", silver["processado_ate"][:19] if silver["processado_ate"] != "—" else "—")
        else:
            st.warning("Banco SQLite não encontrado ou vazio.")
            st.caption(f"Caminho: `{_SQLITE_DB_PATH}`")

    with col_g:
        st.subheader("🥇 Gold")
        st.caption("Analítico · MongoDB Atlas")
        if gold:
            st.metric("Contratos Ativos", f"{gold.get('total_contratos', 0):,}")
            st.metric(
                "Valor Agregado",
                f"R$ {gold.get('valor_agregado', 0.0):,.0f}",
            )
            st.metric("Órgãos Distintos", f"{gold.get('total_orgaos', 0):,}")
            st.metric("KPIs Referência", str(gold.get("atualizado_em", "—")))
        else:
            st.warning("MongoDB não acessível ou sem dados.")

    st.divider()

    with st.expander("Bronze — registros por partição (year/month/day)"):
        _renderizar_detalhe_bronze(bronze)

    with st.expander("Silver — distribuição por faixa de valor"):
        _renderizar_detalhe_silver(silver)


# ---------------------------------------------------------------------------
# Ponto de entrada
# ---------------------------------------------------------------------------


def main() -> None:
    """Ponto de entrada do dashboard Licitei."""
    st.title("Licitei — Painel de Licitações Públicas")
    st.caption(
        "Pipeline Medallion: Bronze → Silver → Gold · "
        "Atualização diária via Prefect"
    )

    if st.sidebar.button("Recarregar dados"):
        st.cache_data.clear()
        st.rerun()

    st.sidebar.caption("Cache atualizado a cada hora.")

    aba_negocio, aba_pipeline = st.tabs([
        "📊 Análise de Negócio",
        "🔧 Saúde do Pipeline",
    ])

    with aba_negocio:
        with st.spinner("Carregando KPIs do MongoDB..."):
            dashboard = _carregar_dashboard()
            df_uf = _carregar_por_uf()
            df_mod = _carregar_por_modalidade()
            prazos = _carregar_prazos()
            elegibilidade = _carregar_elegibilidade()

        if not dashboard:
            st.error(
                "Nenhum KPI encontrado. Verifique as variáveis de ambiente "
                "e execute o pipeline para popular as coleções Gold."
            )
            st.code(
                "python workers/extract_worker.py --dataInicial 20260601 --dataFinal 20260602",
                language="bash",
            )
        else:
            data_ref = dashboard.get("data_referencia", "–")
            st.caption(f"Referência dos dados: **{data_ref}**")

            _renderizar_kpis_gerais(dashboard)
            st.divider()
            _renderizar_prazos_e_eligibilidade(prazos, elegibilidade)
            st.divider()
            _renderizar_graficos_uf(df_uf)
            st.divider()
            _renderizar_graficos_modalidade(df_mod)

    with aba_pipeline:
        _renderizar_saude_pipeline()


if __name__ == "__main__":
    main()
