---
status: aceito
date: 2026-04-23
---

# ADR 001 — Provedor LLM

**Data:** 22/04/2026
**Status:** Decidido

## Contexto

O projeto precisa de um LLM para o assistente MCP. A escolha do provedor
impacta custo, velocidade e experiência na apresentação final.

## Alternativas consideradas

- **OpenAI gpt-4o-mini:** rápido, qualidade alta, pago (~R$50 cobre o projeto)
- **qwen2.5:7b via Ollama:** gratuito, roda local, mas lento no hardware
  disponível (RTX 3050 4GB VRAM) — 15-30s por resposta

## Decisão

gpt-4o-mini para produção e apresentação.
qwen2.5:7b local via Ollama para desenvolvimento do dia a dia.

O sistema é agnóstico ao provedor: Ollama expõe API compatível com OpenAI.
Usar `openai.OpenAI(base_url=..., api_key="ollama")` para ambos —
a troca acontece via variável de ambiente, sem mudança de código.

## Consequências

- Custo estimado: ~R$50 de crédito OpenAI cobre desenvolvimento + apresentação
- Variáveis necessárias: `LLM_PROVIDER`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`
- Nenhum acoplamento ao SDK da OpenAI além do client de inicialização
