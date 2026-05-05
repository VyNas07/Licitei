---
status: aceito
date: 2026-04-23
---

# ADR 003 — Banco Relacional

**Data:** 18/04/2026
**Status:** Decidido

## Contexto

O projeto precisava de um banco relacional para dados estruturados
(perfil do MEI, autenticação, buscas salvas). A escolha precisava
ser gratuita e acessível por todos os membros do time.

## Alternativas consideradas

- **SQLite local:** zero configuração, mas arquivo local — cada membro
  teria seu próprio banco, inviável para desenvolvimento colaborativo
- **PostgreSQL com Docker:** Postgres real, mas cada membro precisaria
  rodar Docker localmente
- **Supabase:** Postgres gerenciado, free tier de 500MB, interface visual,
  acessível por todos via URL

## Decisão

Supabase. Free tier cobre o projeto com folga.

## Consequências

- Todos os membros acessam o mesmo banco durante o desenvolvimento
- Free tier do Supabase hiberna projetos inativos após 1 semana —
  reativar manualmente se necessário
- SQLite permanece como banco local de análise na Track 1 (ETL)