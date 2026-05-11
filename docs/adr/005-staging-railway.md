---
status: aceito
date: 2026-04-23
---

# ADR 005 — Ambiente de Staging

**Data:** 22/04/2026
**Status:** Decidido

## Contexto

Mobile e MCP precisam de um backend acessível remotamente durante
o desenvolvimento — rodar localmente não permite testes integrados
entre membros do time.

## Alternativas consideradas

- **Render free tier:** simples, mas cold start lento (~30s)
- **Railway free tier:** deploy automático via GitHub, cold start menor,
  interface mais amigável

## Decisão

Railway free tier para o backend.

## Consequências

- Deploy automático a cada push na branch `develop`
- Cold start de ~10-30s após inatividade — avisar na apresentação
  ou implementar ping periódico para manter o serviço ativo
- Free tier tem limite de horas mensais — monitorar uso próximo à apresentação
- Deploy deve estar no ar até o final de Sprint 2 (16/05)