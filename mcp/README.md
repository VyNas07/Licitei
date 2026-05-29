# Licitei — MCP (Track 3)

Servidor MCP (Model Context Protocol) que expõe ferramentas de consulta a licitações públicas para uso por LLMs. Recebe queries em linguagem natural, orquestra chamadas ao MongoDB via um agente LangGraph e devolve respostas via Groq (`llama-3.3-70b-versatile`), com fallback para Ollama local em desenvolvimento. Memória de conversa por usuário persistida em SQLite.

**Responsáveis:** Vyktor, Thaíssa
**Stack:** Python · FastMCP · LangGraph · LangChain · Groq · Ollama · MongoDB Atlas · Supabase · SQLite

---

## Arquitetura

```
App Mobile
   └─► Backend (Elysia) — POST /chat via SSE (Sprint 2)
         └─► MCP Server (este projeto)
               ├─► MongoDB Atlas   — tools de busca e detalhe
               └─► Groq LLM        — interpretação e resposta
```

O servidor expõe tools via MCP protocol (HTTP + SSE) e um endpoint HTTP `POST /chat` para integração direta com o backend.

---

## Estrutura

```
mcp/
├── requirements.txt
├── .env.example
├── data/
│   ├── cnae.json               # 1.332 subclasses CNAE (API IBGE — não editar manualmente)
│   └── memoria.db              # SQLite — memória de conversa por usuário (gerado em runtime)
├── scripts/
│   └── fetch_cnae.py           # regenera cnae.json via API IBGE quando necessário
└── src/
    ├── server.py       # entrada principal — FastMCP + endpoint /chat
    ├── config.py       # carregamento e validação do .env
    ├── agente.py       # agente LangGraph: criar_agente(), chat(), chat_stream()
    ├── db.py           # conexão MongoDB (context manager)
    ├── cache.py        # cache em memória com TTL
    └── tools/
        ├── buscar_licitacoes.py    # busca por palavra-chave + filtros
        ├── detalhar_licitacao.py   # detalhe completo por ID PNCP
        ├── keywords_cnae.py        # retorna contexto CNAE para geração de keywords
        ├── resumir_edital.py       # dados do edital para resumo em linguagem simples
        ├── gerar_checklist.py      # dados do edital para checklist de habilitação
        └── listar_documentos.py    # dados do edital para listagem de documentos
```

---

## Setup

### Windows (PowerShell)

```powershell
# 0. Liberar execução de scripts (apenas na primeira vez, se necessário)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 1. Criar o ambiente virtual
python -m venv .venv

# Verificar se foi criado corretamente antes de continuar
Test-Path .venv\Scripts\Activate.ps1   # deve retornar True

# 2. Ativar
.\.venv\Scripts\Activate.ps1

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar variáveis de ambiente
copy .env.example .env
# Abra o .env e preencha: MONGO_URI, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e GROQ_API_KEY
```

### Linux / Mac

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `MONGO_URI` | Sim | URI do MongoDB Atlas |
| `MONGO_DB_NAME` | Sim | Nome do banco (ex: `licitei`) |
| `MONGO_COLLECTION` | Sim | Nome da coleção (ex: `contratacoes`) |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role do Supabase |
| `GROQ_API_KEY` | Não* | Chave da API Groq — obtenha em console.groq.com |
| `GROQ_BASE_URL` | Não | Padrão: `https://api.groq.com/openai/v1` |
| `LLM_PROVIDER` | Não | `groq` (padrão) ou `ollama` |
| `LLM_MODEL` | Não | Padrão: `llama-3.3-70b-versatile` |
| `OLLAMA_BASE_URL` | Não | Padrão: `http://localhost:11434/v1` |
| `OLLAMA_MODEL` | Não | Padrão: `qwen2.5:7b` |
| `MCP_HOST` | Não | Padrão: `0.0.0.0` |
| `MCP_PORT` | Não | Padrão: `8000` |
| `CACHE_TTL` | Não | TTL do cache em segundos. Padrão: `3600` |
| `SQLITE_MEMORIA_PATH` | Não | Caminho do arquivo SQLite de memória. Padrão: `data/memoria.db` |

*Se `GROQ_API_KEY` não estiver definido, o servidor usa Ollama automaticamente como fallback.

---

## Execução

### Servidor MCP

```powershell
# Terminal 1 — inicia o servidor na porta 8000
python -m src.server
```

O servidor expõe:
- **MCP protocol** — `http://localhost:8000/sse` (para clientes MCP)
- **POST /chat** — endpoint HTTP para integração com o backend (resposta completa)
- **POST /chat/stream** — endpoint SSE com streaming de tokens

### Chatbot Streamlit

```powershell
# Terminal 2 — com o servidor MCP já rodando
streamlit run chatbot/app.py
```

Abre em `http://localhost:8501`. Permite conversar com o assistente diretamente pelo navegador.

---

## Testando o endpoint /chat

```powershell
# PowerShell
$body = '{"query": "licitacoes de limpeza em PE", "thread_id": "meu-usuario-1"}'
Invoke-RestMethod -Method POST -Uri http://localhost:8000/chat `
  -ContentType "application/json" -Body $body
```

```bash
# bash / curl
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "licitacoes de limpeza em PE", "thread_id": "meu-usuario-1"}'
```

Resposta esperada:
```json
{
  "resposta": "Foram encontradas X licitações...",
  "cache": false
}
```

- `thread_id` é opcional: se omitido, o servidor gera um UUID aleatório por request.
- Enviar o mesmo `thread_id` em requests seguintes mantém o contexto da conversa (memória por usuário via SQLite).
- Segunda chamada com mesma combinação `thread_id` + `query` retorna `"cache": true` sem chamar o LLM.

---

## Tools disponíveis

### Sprint 1

| Tool | Parâmetros | Descrição |
| --- | --- | --- |
| `buscar_licitacoes` | `termo`, `uf?`, `valor_max?`, `limite?` | Busca por palavra-chave no `objeto_compra` |
| `detalhar_licitacao` | `numero_controle_pncp` | Documento completo de uma licitação pelo ID |

### Sprint 2

| Tool | Parâmetros | Descrição | Status |
| --- | --- | --- | --- |
| `keywords_cnae` | `codigo_cnae` | Retorna descrição e atividades de uma subclasse CNAE (base IBGE) para o LLM derivar termos de busca | ✅ |
| `gerar_checklist` | `numero_controle_pncp` | Retorna dados do edital para o LLM gerar checklist de habilitação | ✅ |
| `resumir_edital` | `numero_controle_pncp` | Retorna dados do edital para o LLM resumir em linguagem simples para MEIs | ✅ |
| `listar_documentos` | `numero_controle_pncp` | Retorna dados do edital para o LLM listar documentos necessários por categoria | ✅ |

> Toda resposta baseada em uma licitação específica cita a fonte ao final no formato:
> `Fonte: PNCP — [numero_controle_pncp] | [orgao_razao_social]`

---

## Rate limits — Groq free tier

| Modelo | RPM | RPD | TPM |
| --- | --- | --- | --- |
| `llama-3.3-70b-versatile` | 30 | 1.000 | 12.000 |

O LangGraph lida com retry nativo via LangChain. O fallback para Ollama é ativado automaticamente quando `GROQ_API_KEY` não está definido.

---

## Decisões técnicas

| ADR | Decisão |
| --- | --- |
| [ADR 001](../docs/adr/001-llm-provider.md) | Groq como provider LLM (free tier, sem cartão) |
| [ADR 006](../docs/adr/006-mcp-transport.md) | HTTP + SSE como transporte MCP |
| [ADR 008](../docs/adr/008-langgraph-agent.md) | Migração para agente LangGraph com memória por usuário |
