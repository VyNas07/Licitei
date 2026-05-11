---
status: aceito
date: 2026-04-23
revisado: 2026-04-24
---

# ADR 001 — Provedor LLM

**Data:** 22/04/2026 — Revisado: 24/04/2026
**Status:** Decidido

## Contexto

O projeto precisa de um LLM para o assistente MCP. A escolha do provedor
impacta custo, velocidade e experiência na apresentação final.

## Investigação — 24/04/2026

OpenAI foi descartado: requer cartão de crédito internacional.
Google AI Studio foi descartado: bloqueado por restrição geográfica no Brasil.
Groq foi identificado como alternativa: free tier sem cartão, API compatível
com OpenAI, modelos de produção estáveis.

## Alternativas consideradas

- **OpenAI gpt-4o-mini:** qualidade alta, mas requer cartão internacional — inviável.
- **Google AI Studio:** bloqueado geograficamente no Brasil — inviável.
- **Groq llama-3.3-70b-versatile:** free tier (1.000 req/dia), API compatível com
  OpenAI, 131K tokens de contexto, modelos de produção sem descontinuação sem aviso.
- **qwen2.5:7b via Ollama:** gratuito, roda local, mas lento no hardware disponível
  (RTX 3050 4GB VRAM) — 15-30s por resposta. Mantido como fallback.

## Decisão

**Groq** como provider principal (`llama-3.3-70b-versatile`).
**Ollama local** (`qwen2.5:7b`) como fallback de desenvolvimento e em caso de rate limit.

O sistema usa `openai.OpenAI(base_url=..., api_key=...)` para ambos — sem acoplamento
ao SDK de nenhum provider específico. A troca acontece via `LLM_PROVIDER` no `.env`.

Retry com backoff exponencial (1s, 2s, 4s) em respostas 429.
Após retries esgotados, fallback automático para Ollama com log via loguru.

## Rate limits do Groq (free tier)

| Modelo | RPM | RPD | TPM |
| --- | --- | --- | --- |
| llama-3.3-70b-versatile | 30 | 1.000 | 12.000 |
| llama-3.1-8b-instant | 30 | 14.400 | 6.000 |

O RPD (1.000/dia) é o limite mais restritivo. Suficiente para desenvolvimento
e apresentação. Múltiplas API keys não contornam o limite (por organização).

## Consequências

- Sem custo para desenvolvimento e apresentação (free tier)
- Variáveis necessárias: `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `OLLAMA_BASE_URL`
- Factory em `mcp/src/client.py` centraliza a criação do cliente e a lógica de retry
- Nenhum acoplamento ao SDK da Groq — usa `openai.OpenAI` com `base_url` configurado
