"""Factory de cliente LLM com retry e fallback para Ollama."""

import time

from loguru import logger
from openai import OpenAI, RateLimitError

from src.config import Config

_RETRY_DELAYS = [1, 2, 4]


def get_llm_client(config: Config) -> tuple[OpenAI, str]:
    """Retorna (cliente OpenAI-compatível, modelo) baseado em LLM_PROVIDER.

    Suporta 'groq' e 'ollama'. Para ambos usa openai.OpenAI com base_url
    e api_key configurados via env — sem acoplamento ao SDK de cada provider.

    Args:
        config: Configurações do servidor.

    Returns:
        Tupla (client, model_string) pronta para uso.
    """
    if config.llm_provider == "groq" and config.groq_api_key:
        logger.debug(f"LLM provider: groq | modelo={config.llm_model}")
        return (
            OpenAI(api_key=config.groq_api_key, base_url=config.groq_base_url),
            config.llm_model,
        )

    logger.debug(f"LLM provider: ollama (fallback) | modelo={config.ollama_model}")
    return (
        OpenAI(api_key="ollama", base_url=config.ollama_base_url),
        config.ollama_model,
    )


def _get_ollama_client(config: Config) -> tuple[OpenAI, str]:
    """Retorna cliente Ollama para uso exclusivo no fallback após rate limit."""
    return (
        OpenAI(api_key="ollama", base_url=config.ollama_base_url),
        config.ollama_model,
    )


def completions_com_retry(
    config: Config,
    messages: list[dict],
    tools: list[dict],
) -> object:
    """Chama o LLM com retry exponencial e fallback para Ollama em 429.

    Tenta o provider configurado até 3 vezes com backoff (1s, 2s, 4s).
    Se todos os retries falharem por rate limit, faz fallback para Ollama.
    Outros erros são propagados imediatamente.

    Args:
        config: Configurações do servidor.
        messages: Lista de mensagens no formato OpenAI.
        tools: Schema de tools para function calling.

    Returns:
        Objeto de resposta da API OpenAI/Groq/Ollama.
    """
    client, model = get_llm_client(config)

    for tentativa, delay in enumerate(_RETRY_DELAYS, start=1):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools,
            )
        except RateLimitError as exc:
            retry_after = _extrair_retry_after(exc)
            espera = retry_after or delay
            logger.warning(
                f"Rate limit atingido (tentativa {tentativa}/3) | "
                f"aguardando {espera}s | provider={config.llm_provider}"
            )
            time.sleep(espera)

    logger.error("Retries esgotados. Fazendo fallback para Ollama.")
    fallback_client, fallback_model = _get_ollama_client(config)
    return fallback_client.chat.completions.create(
        model=fallback_model,
        messages=messages,
        tools=tools,
    )


def _extrair_retry_after(exc: RateLimitError) -> float | None:
    """Extrai o valor de retry-after do header da resposta 429, se disponível."""
    try:
        return float(exc.response.headers.get("retry-after", 0)) or None
    except Exception:
        return None
