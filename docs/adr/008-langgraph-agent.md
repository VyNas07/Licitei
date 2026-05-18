---
status: aceito
date: 2026-05-18
---

# ADR 008 — Agente LangGraph com memória por usuário

**Data:** 18/05/2026
**Status:** Decidido

## Contexto

O MCP implementava o loop de agente manualmente em `llm.py`: chamada ao LLM, parse da resposta,
despacho de ferramentas e nova chamada — tudo num while-loop com contador de iterações.
O cliente LLM ficava em `client.py` com lógica própria de retry e fallback.

Com a adição de ferramentas na Sprint 2 (checklist, resumo, documentos) e a necessidade de
memória de conversa por usuário (o assistente precisa lembrar que o mesmo MEI já perguntou
sobre um edital antes), manter esse loop manual ficou insustentável.

## Alternativas consideradas

- **Manter o loop manual:** funcional, mas exige reimplementar state management,
  serialização de mensagens e memória do zero. Alto custo de manutenção.
- **LangChain AgentExecutor:** camada de mais alto nível, mas depreciado em favor do LangGraph
  a partir da versão 0.3.
- **LangGraph `create_react_agent`:** prebuilt ReAct com suporte nativo a checkpointers
  (memória), tool-calling gerenciado e streaming via `astream_events`. Mantido ativamente
  pela LangChain Inc. como o caminho principal.

## Decisão

Migrar para **LangGraph** usando `create_react_agent` (prebuilt) com `SqliteSaver` como
checkpointer. Arquivos `llm.py` e `client.py` removidos; substituídos por `agente.py`.

**SqliteSaver sobre outras opções de persistência:**
Redis e Postgres exigiriam infra extra. SQLite local é suficiente para o volume do projeto
e mantém zero dependência de serviço externo para a camada de memória.

## Consequências

- Memória de conversa por `thread_id` sem nenhuma infra extra além do SQLite
- Loop ReAct gerenciado pelo LangGraph — sem código de orquestração custom
- `chat_stream()` via `astream_events` disponível para o endpoint SSE da Sprint 3
- Nova variável de ambiente: `SQLITE_MEMORIA_PATH` (padrão: `data/memoria.db`)
- ADR 001 atualizado implicitamente: o cliente LLM agora é `ChatGroq` / `ChatOpenAI`
  (LangChain) em vez do SDK `openai` com `base_url` customizado

## Notas de implementação

| Detalhe | Motivo |
| --- | --- |
| Tools retornam `json.dumps(...)` como `str` | Groq rejeita `ToolMessage.content` vazio ou como lista (HTTP 400) |
| `groq_api_base="https://api.groq.com"` passado explicitamente | Evita duplicação de path quando `GROQ_BASE_URL` está no `.env` |
| `asyncio.to_thread(_chat, ...)` no handler HTTP | `agente.invoke()` é síncrono; `to_thread` evita bloquear o event loop do FastMCP |
| Cache keyed por `thread_id:query` | Evita servir resposta cacheada de um usuário para outro |
