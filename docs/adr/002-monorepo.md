---
status: aceito
date: 2026-04-23
---

# ADR 002 — Estrutura do Repositório

**Data:** 18/04/2026
**Status:** Decidido

## Contexto

O projeto tem 5 tracks com stacks diferentes (Python, TypeScript, React Native).
Precisávamos decidir se cada track teria seu próprio repositório ou se tudo
ficaria em um único lugar.

## Alternativas consideradas

- **Monorepo:** tudo em um repositório, organizado por pastas de track
- **Polyrepo:** um repositório por track (ex: licitei-api, licitei-mobile)

## Decisão

Monorepo. Decisão aprovada por votação do grupo em 18/04/2026.

## Consequências

- Um único link para portfólio e avaliação acadêmica
- Mudanças que cruzam tracks (ex: schema do banco) ficam em um commit
- Professores enxergam o projeto completo sem navegar entre repositórios
- Overhead de múltiplos repos eliminado dado o tamanho e prazo do time