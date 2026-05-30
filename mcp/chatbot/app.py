"""Chatbot Licitei — interface Streamlit integrada ao servidor MCP.

Execução:
    streamlit run mcp/chatbot/app.py

O servidor MCP deve estar rodando em paralelo:
    python -m src.server   (dentro da pasta mcp/)
"""

import uuid

import requests
import streamlit as st

# ---------------------------------------------------------------------------
# Configuração da página
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Licitei — Assistente de Licitações",
    page_icon="📋",
    layout="centered",
)

# ---------------------------------------------------------------------------
# Estado da sessão
# ---------------------------------------------------------------------------

if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid.uuid4())

if "mensagens" not in st.session_state:
    st.session_state.mensagens = []

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

with st.sidebar:
    st.title("⚙️ Configurações")

    server_url = st.text_input(
        "URL do servidor MCP",
        value="http://localhost:8000",
        help="Endereço onde o servidor MCP está rodando.",
    )

    st.divider()

    st.markdown("**Sessão atual**")
    st.caption(f"`{st.session_state.thread_id}`")
    st.caption("O assistente lembra do contexto desta sessão.")

    if st.button("🔄 Nova conversa", use_container_width=True):
        st.session_state.thread_id = str(uuid.uuid4())
        st.session_state.mensagens = []
        st.rerun()

    st.divider()

    st.markdown("**Exemplos de perguntas**")
    exemplos = [
        "Tem licitação de limpeza em PE?",
        "Quais licitações de TI estão abertas?",
        "Me resumindo o edital mais recente que você encontrar",
        "Qual o CNAE para serviços de jardinagem?",
        "Quais documentos preciso para participar de uma licitação?",
    ]
    for exemplo in exemplos:
        if st.button(exemplo, use_container_width=True, key=f"ex_{exemplo}"):
            st.session_state._input_sugerido = exemplo
            st.rerun()

    st.divider()
    st.caption("Licitei · CESAR School · Grupo 10")
    st.caption("Track 3 — IA & MCP")

# ---------------------------------------------------------------------------
# Cabeçalho
# ---------------------------------------------------------------------------

st.title("📋 Assistente Licitei")
st.caption(
    "Tire dúvidas sobre licitações públicas e encontre oportunidades para o seu negócio. "
    "O assistente consulta dados em tempo real do PNCP."
)

st.divider()

# ---------------------------------------------------------------------------
# Histórico de mensagens
# ---------------------------------------------------------------------------

for msg in st.session_state.mensagens:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# ---------------------------------------------------------------------------
# Input do usuário
# ---------------------------------------------------------------------------

input_inicial = st.session_state.pop("_input_sugerido", None)

pergunta = st.chat_input(
    "Digite sua pergunta sobre licitações...",
    key="chat_input",
) or input_inicial

if pergunta:
    st.session_state.mensagens.append({"role": "user", "content": pergunta})

    with st.chat_message("user"):
        st.markdown(pergunta)

    with st.chat_message("assistant"):
        with st.spinner("Consultando o assistente..."):
            try:
                response = requests.post(
                    f"{server_url}/chat",
                    json={
                        "query": pergunta,
                        "thread_id": st.session_state.thread_id,
                    },
                    timeout=60,
                )
                response.raise_for_status()
                data = response.json()
                resposta = data.get("resposta", "Sem resposta recebida.")

                if data.get("cache"):
                    resposta += "\n\n---\n*Resposta em cache.*"

            except requests.exceptions.ConnectionError:
                resposta = (
                    "❌ Não foi possível conectar ao servidor MCP. "
                    f"Verifique se ele está rodando em `{server_url}`."
                )
            except requests.exceptions.Timeout:
                resposta = "⏱️ O servidor demorou muito para responder. Tente novamente."
            except Exception as exc:
                resposta = f"❌ Erro inesperado: {exc}"

        st.markdown(resposta)

    st.session_state.mensagens.append({"role": "assistant", "content": resposta})
