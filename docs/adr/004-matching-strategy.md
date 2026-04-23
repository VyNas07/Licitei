---
status: aceito
date: 2026-04-23
---

# ADR 004 — Estratégia de Matching de Licitações

**Data:** 22/04/2026
**Status:** Decidido

## Contexto

Queríamos que o MEI encontrasse licitações relevantes para seu negócio
automaticamente, sem precisar conhecer os termos técnicos dos editais.

## Alternativas consideradas

- **Matching por CNAE:** MEI informa seu CNAE, sistema filtra licitações
  compatíveis. Bloqueado: a API PNCP usa CATMAT/CATSER, não CNAE.
  Exigiria reescrever o ETL e um mapeamento público inexistente.
- **Matching por palavra-chave no objeto_compra:** MEI informa ramo em
  linguagem natural (ex: "limpeza", "TI"), backend filtra via $regex/$text
  no MongoDB. Implementação estimada: 1-2 dias.

## Decisão

Matching por palavra-chave no campo `objeto_compra`, implementado
no backend (não no MCP). O MCP usa os resultados do backend.

## Consequências

- ETL não precisa ser modificado
- Busca é performática e reutilizável pelo mobile sem depender do LLM
- Qualidade do matching depende da clareza do termo informado pelo MEI
- Matching real por CNAE pode ser implementado em versão futura