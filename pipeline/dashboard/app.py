"""Dashboard Streamlit — lê KPIs das coleções Gold do MongoDB Atlas.

Execução:
    streamlit run dashboard/app.py
"""

import os
from datetime import date

import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import load_dotenv
from pymongo import MongoClient

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


def _mongo_client() -> tuple[MongoClient, str] | None:
    """Cria cliente MongoDB. Retorna (client, db_name) ou None se variáveis ausentes."""
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    if not all([uri, db_name]):
        return None
    return MongoClient(uri), db_name


@st.cache_data(ttl=3600)
def _carregar_dashboard() -> dict:
    """Carrega o KPI consolidado do dashboard (mais recente)."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    doc = (
        client[db_name][_COLECAO_DASHBOARD]
        .find({}, {"_id": 0})
        .sort("data_referencia", -1)
        .limit(1)
    )
    docs = list(doc)
    client.close()
    return docs[0] if docs else {}


@st.cache_data(ttl=3600)
def _carregar_por_uf() -> pd.DataFrame:
    """Carrega KPIs por UF do dia mais recente disponível."""
    conn = _mongo_client()
    if conn is None:
        return pd.DataFrame()
    client, db_name = conn

    data_ref = _data_referencia_mais_recente(client, db_name, _COLECAO_POR_UF)
    if data_ref is None:
        client.close()
        return pd.DataFrame()

    docs = list(
        client[db_name][_COLECAO_POR_UF].find(
            {"data_referencia": data_ref}, {"_id": 0}
        )
    )
    client.close()
    return pd.DataFrame(docs) if docs else pd.DataFrame()


@st.cache_data(ttl=3600)
def _carregar_por_modalidade() -> pd.DataFrame:
    """Carrega KPIs por modalidade do dia mais recente disponível."""
    conn = _mongo_client()
    if conn is None:
        return pd.DataFrame()
    client, db_name = conn

    data_ref = _data_referencia_mais_recente(client, db_name, _COLECAO_POR_MODALIDADE)
    if data_ref is None:
        client.close()
        return pd.DataFrame()

    docs = list(
        client[db_name][_COLECAO_POR_MODALIDADE].find(
            {"data_referencia": data_ref}, {"_id": 0}
        )
    )
    client.close()
    return pd.DataFrame(docs) if docs else pd.DataFrame()


@st.cache_data(ttl=3600)
def _carregar_prazos() -> dict:
    """Carrega KPI de prazos do dia mais recente."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    doc = (
        client[db_name][_COLECAO_PRAZOS]
        .find({}, {"_id": 0})
        .sort("data_referencia", -1)
        .limit(1)
    )
    docs = list(doc)
    client.close()
    return docs[0] if docs else {}


@st.cache_data(ttl=3600)
def _carregar_elegibilidade() -> dict:
    """Carrega KPI de elegibilidade MEI do dia mais recente."""
    conn = _mongo_client()
    if conn is None:
        return {}
    client, db_name = conn
    doc = (
        client[db_name][_COLECAO_ELEGIBILIDADE]
        .find({}, {"_id": 0})
        .sort("data_referencia", -1)
        .limit(1)
    )
    docs = list(doc)
    client.close()
    return docs[0] if docs else {}


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


def main() -> None:
    """Ponto de entrada do dashboard Licitei (Gold layer)."""
    st.title("Licitei — Painel de Licitações Públicas")
    st.caption(
        "KPIs calculados sobre dados Gold (MongoDB Atlas) · "
        "Atualização diária via pipeline Medallion"
    )

    if st.sidebar.button("Recarregar dados"):
        st.cache_data.clear()
        st.rerun()

    st.sidebar.caption("Cache atualizado a cada hora.")

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
        return

    data_ref = dashboard.get("data_referencia", "–")
    st.caption(f"Referência dos dados: **{data_ref}**")

    _renderizar_kpis_gerais(dashboard)
    st.divider()
    _renderizar_prazos_e_eligibilidade(prazos, elegibilidade)
    st.divider()
    _renderizar_graficos_uf(df_uf)
    st.divider()
    _renderizar_graficos_modalidade(df_mod)


if __name__ == "__main__":
    main()
