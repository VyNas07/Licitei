"""Dashboard Streamlit para visualização de licitações públicas do PNCP.

Execução:
    streamlit run dashboard/app.py
"""

import os

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

_COL_ORGAO = "Órgão"
_COL_SITUACAO = "Situação"
_COL_VALOR_TOTAL = "Valor Total"

_COLUNAS_EXIBICAO = [
    "numero_controle_pncp",
    "objeto_compra",
    "orgao_razao_social",
    "uf",
    "municipio",
    "modalidade_nome",
    "situacao_compra_nome",
    "valor_total_estimado",
]

_COLUNAS_RENOMEADAS = {
    "numero_controle_pncp": "Nº Controle PNCP",
    "objeto_compra": "Objeto",
    "orgao_razao_social": _COL_ORGAO,
    "uf": "UF",
    "municipio": "Município",
    "modalidade_nome": "Modalidade",
    "situacao_compra_nome": _COL_SITUACAO,
    "valor_total_estimado": "Valor Estimado (R$)",
}


@st.cache_data(ttl=3600)
def _carregar_dados() -> pd.DataFrame:
    """Carrega todos os documentos da coleção MongoDB e retorna um DataFrame.

    Utiliza cache de 1 hora para evitar requisições repetidas ao banco.

    Returns:
        DataFrame com os registros normalizados, ou DataFrame vazio em caso de falha.
    """
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    collection_name = os.getenv("MONGO_COLLECTION")

    if not all([uri, db_name, collection_name]):
        return pd.DataFrame()

    client = MongoClient(uri)
    docs = list(client[db_name][collection_name].find({}, {"_id": 0, "_extraido_em": 0}))
    client.close()

    if not docs:
        return pd.DataFrame()

    df = pd.DataFrame(docs)
    df["valor_total_estimado"] = (
        pd.to_numeric(df.get("valor_total_estimado", 0), errors="coerce").fillna(0.0)
    )
    return df


def _aplicar_filtros(df: pd.DataFrame) -> pd.DataFrame:
    """Renderiza a sidebar com filtros interativos e retorna o DataFrame filtrado.

    Args:
        df: DataFrame completo carregado do MongoDB.

    Returns:
        DataFrame filtrado conforme as seleções do usuário.
    """
    st.sidebar.header("Filtros")

    ufs = sorted(df["uf"].dropna().unique().tolist()) if "uf" in df.columns else []
    uf_selecionadas = st.sidebar.multiselect("Estado (UF)", ufs, default=ufs)

    situacoes = (
        sorted(df["situacao_compra_nome"].dropna().unique().tolist())
        if "situacao_compra_nome" in df.columns
        else []
    )
    situacoes_selecionadas = st.sidebar.multiselect(_COL_SITUACAO, situacoes, default=situacoes)

    st.sidebar.caption("Cache atualizado a cada hora. Clique abaixo para forçar recarga.")
    if st.sidebar.button("Recarregar dados"):
        st.cache_data.clear()
        st.rerun()

    mascara = pd.Series([True] * len(df), index=df.index)
    if uf_selecionadas:
        mascara &= df["uf"].isin(uf_selecionadas)
    if situacoes_selecionadas:
        mascara &= df["situacao_compra_nome"].isin(situacoes_selecionadas)

    return df[mascara]


def _renderizar_kpis(df: pd.DataFrame) -> None:
    """Renderiza os quatro KPIs principais no topo da página.

    Args:
        df: DataFrame filtrado.
    """
    col1, col2, col3, col4 = st.columns(4)
    total_valor = df["valor_total_estimado"].sum()
    ticket_medio = df["valor_total_estimado"].mean() if len(df) > 0 else 0.0

    col1.metric("Total de Licitações", f"{len(df):,}")
    col2.metric("Valor Total Estimado", f"R$ {total_valor:,.2f}")
    col3.metric("Ticket Médio", f"R$ {ticket_medio:,.2f}")
    col4.metric("Órgãos Distintos", f"{df['orgao_razao_social'].nunique():,}")


def _renderizar_graficos(df: pd.DataFrame) -> None:
    """Renderiza os quatro gráficos principais do painel.

    Args:
        df: DataFrame filtrado.
    """
    col_esq, col_dir = st.columns(2)

    with col_esq:
        st.subheader("Licitações por Estado")
        contagem_uf = df["uf"].value_counts().reset_index()
        contagem_uf.columns = ["UF", "Quantidade"]
        fig = px.bar(
            contagem_uf,
            x="UF",
            y="Quantidade",
            color="Quantidade",
            color_continuous_scale="Blues",
        )
        fig.update_layout(coloraxis_showscale=False)
        st.plotly_chart(fig, use_container_width=True)

    with col_dir:
        st.subheader("Valor Total por Estado (R$)")
        valor_uf = (
            df.groupby("uf")["valor_total_estimado"]
            .sum()
            .reset_index()
            .rename(columns={"uf": "UF", "valor_total_estimado": _COL_VALOR_TOTAL})
            .sort_values(_COL_VALOR_TOTAL, ascending=False)
        )
        fig = px.bar(
            valor_uf,
            x="UF",
            y=_COL_VALOR_TOTAL,
            color=_COL_VALOR_TOTAL,
            color_continuous_scale="Greens",
        )
        fig.update_layout(coloraxis_showscale=False)
        st.plotly_chart(fig, use_container_width=True)

    col_esq2, col_dir2 = st.columns(2)

    with col_esq2:
        st.subheader("Top 10 Órgãos por Nº de Licitações")
        top_orgaos = df["orgao_razao_social"].value_counts().head(10).reset_index()
        top_orgaos.columns = [_COL_ORGAO, "Quantidade"]
        fig = px.bar(
            top_orgaos,
            x="Quantidade",
            y=_COL_ORGAO,
            orientation="h",
            color="Quantidade",
            color_continuous_scale="Purples",
        )
        fig.update_layout(
            yaxis={"autorange": "reversed"},
            coloraxis_showscale=False,
        )
        st.plotly_chart(fig, use_container_width=True)

    with col_dir2:
        st.subheader("Distribuição por Situação da Compra")
        situacao = df["situacao_compra_nome"].value_counts().reset_index()
        situacao.columns = [_COL_SITUACAO, "Quantidade"]
        fig = px.pie(situacao, values="Quantidade", names=_COL_SITUACAO, hole=0.4)
        fig.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig, use_container_width=True)


def _renderizar_tabela(df: pd.DataFrame) -> None:
    """Renderiza a tabela de registros filtrados.

    Args:
        df: DataFrame filtrado.
    """
    st.subheader(f"Registros ({len(df):,})")
    colunas_disponiveis = [c for c in _COLUNAS_EXIBICAO if c in df.columns]
    df_exibicao = df[colunas_disponiveis].rename(columns=_COLUNAS_RENOMEADAS)
    st.dataframe(df_exibicao, use_container_width=True, hide_index=True)


def main() -> None:
    """Ponto de entrada do dashboard Licitei."""
    st.title("Licitei — Painel de Licitações Públicas")
    st.caption("Dados extraídos da API pública do PNCP · Portal Nacional de Contratações Públicas")

    with st.spinner("Conectando ao MongoDB Atlas..."):
        df = _carregar_dados()

    if df.empty:
        st.error("Nenhum dado encontrado. Verifique as variáveis de ambiente e execute o pipeline ETL.")
        st.code("python -m src.etl.pipeline", language="bash")
        return

    df_filtrado = _aplicar_filtros(df)

    if df_filtrado.empty:
        st.warning("Nenhum registro corresponde aos filtros selecionados.")
        return

    _renderizar_kpis(df_filtrado)
    st.divider()
    _renderizar_graficos(df_filtrado)
    st.divider()
    _renderizar_tabela(df_filtrado)


if __name__ == "__main__":
    main()
