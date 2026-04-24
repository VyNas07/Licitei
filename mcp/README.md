# Licitei — MCP (Track 3)

Servidor MCP (Model Context Protocol) que expõe ferramentas de consulta a licitações públicas para uso por LLMs. Recebe queries em linguagem natural, orquestra chamadas ao MongoDB e devolve respostas via Groq (`llama-3.3-70b-versatile`), com fallback para Ollama local em desenvolvimento.

**Responsáveis:** Vyktor, Thaíssa
**Stack:** Python · FastMCP · Groq · Ollama · MongoDB Atlas · Supabase

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
└── src/
    ├── server.py       # entrada principal — FastMCP + endpoint /chat
    ├── config.py       # carregamento e validação do .env
    ├── db.py           # conexão MongoDB (context manager)
    ├── cache.py        # cache em memória com TTL
    ├── client.py       # factory do cliente LLM com retry e fallback
    ├── llm.py          # loop de agente: query → LLM → tools → resposta
    └── tools/
        ├── buscar_licitacoes.py    # busca por palavra-chave + filtros
        └── detalhar_licitacao.py   # detalhe completo por ID PNCP
```

---

## Setup

```bash
# 1. Criar e ativar o ambiente virtual
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/Mac

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Preencha MONGO_URI, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e GROQ_API_KEY
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

*Se `GROQ_API_KEY` não estiver definido, o servidor usa Ollama automaticamente como fallback.

---

## Execução

```bash
# Iniciar o servidor (porta 8000)
python -m src.server
```

O servidor expõe:
- **MCP protocol** — `http://localhost:8000/sse` (para clientes MCP)
- **POST /chat** — endpoint HTTP para integração com o backend

---

## Testando o endpoint /chat

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "licitações de limpeza em PE"}'
```

Resposta esperada:
```json
{
  "resposta": "Foram encontradas X licitações...",
  "cache": false
}
```

Segunda chamada com a mesma query retorna `"cache": true` sem chamar o LLM.

---

## Tools disponíveis (Sprint 1)

| Tool | Parâmetros | Descrição |
| --- | --- | --- |
| `buscar_licitacoes` | `termo`, `uf?`, `valor_max?`, `limite?` | Busca por palavra-chave no `objeto_compra` |
| `detalhar_licitacao` | `numero_controle_pncp` | Documento completo de uma licitação pelo ID |

### Sprint 2 (planejado)

| Tool | Descrição |
| --- | --- |
| `keywords_cnae` | Extrai termos de busca a partir do CNAE do MEI (base IBGE) |
| `gerar_checklist` | Gera checklist de habilitação a partir do edital |
| `resumir_edital` | Resume o edital em linguagem simples |
| `listar_documentos` | Lista documentos necessários para participar |

---

## Rate limits — Groq free tier

| Modelo | RPM | RPD | TPM |
| --- | --- | --- | --- |
| `llama-3.3-70b-versatile` | 30 | 1.000 | 12.000 |

O servidor implementa retry com backoff exponencial (1s → 2s → 4s) em respostas 429, com fallback automático para Ollama após esgotar as tentativas.

---

## Decisões técnicas

| ADR | Decisão |
| --- | --- |
| [ADR 001](../docs/adr/001-llm-provider.md) | Groq como provider LLM (free tier, sem cartão) |
| [ADR 006](../docs/adr/006-mcp-transport.md) | HTTP + SSE como transporte MCP |
