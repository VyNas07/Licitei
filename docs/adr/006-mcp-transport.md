---
status: aceito
date: 2026-04-23
---

# ADR 006 — Comunicação entre Backend e MCP

**Data:** 22/04/2026
**Status:** Decidido

## Contexto

O assistente LLM (Track 3) precisa se comunicar com o backend (Track 2)
para receber requisições do mobile e retornar respostas em streaming.
Precisávamos definir o protocolo de comunicação.

## Alternativas consideradas

- **REST polling:** mobile faz requisições periódicas para verificar
  resposta. Simples, mas ineficiente e sem experiência de streaming
- **WebSocket:** conexão bidirecional persistente. Mais complexo de
  implementar e manter
- **HTTP + SSE (Server-Sent Events):** backend abre um stream unidirecional
  para o mobile. Nativo no Elysia, suportado pelo FastMCP, sem biblioteca
  adicional

## Decisão

HTTP + SSE. Suporte nativo em Elysia (`new Response(stream)`) e
no FastMCP — sem dependências extras em nenhuma das duas sides.

## Consequências

- Mobile recebe tokens do LLM em tempo real (experiência de chat fluida)
- Implementação mais simples que WebSocket para comunicação unidirecional
- SSE não suporta comunicação bidirecional — adequado para o caso de uso
  (mobile envia pergunta via POST, recebe resposta via SSE stream)
