"""Carregamento e validação das variáveis de ambiente do servidor MCP."""

import os
import sys
from dataclasses import dataclass

from dotenv import load_dotenv
from loguru import logger


@dataclass(frozen=True)
class Config:
    """Configurações do servidor MCP carregadas do .env."""

    mongo_uri: str
    mongo_db_name: str
    mongo_collection: str

    supabase_url: str
    supabase_service_role_key: str

    llm_provider: str
    groq_api_key: str | None
    groq_base_url: str
    llm_model: str
    ollama_base_url: str
    ollama_model: str

    mcp_host: str
    mcp_port: int
    cache_ttl: int


def _ler_opcional(var: str) -> str | None:
    """Retorna o valor da variável ou None se ausente ou placeholder."""
    valor = os.getenv(var)
    if not valor or valor.startswith("<"):
        return None
    return valor


def carregar_config() -> Config:
    """Carrega e valida as variáveis de ambiente do arquivo .env.

    Variáveis obrigatórias ausentes encerram o servidor com SystemExit(1).

    Returns:
        Instância de Config com todas as configurações validadas.
    """
    load_dotenv()

    obrigatorias = [
        "MONGO_URI",
        "MONGO_DB_NAME",
        "MONGO_COLLECTION",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
    for var in obrigatorias:
        if not os.getenv(var):
            logger.critical(
                f"Variável de ambiente '{var}' não definida. "
                "Copie .env.example para .env e preencha os valores."
            )
            raise SystemExit(1)

    return Config(
        mongo_uri=os.environ["MONGO_URI"],
        mongo_db_name=os.environ["MONGO_DB_NAME"],
        mongo_collection=os.environ["MONGO_COLLECTION"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        llm_provider=os.getenv("LLM_PROVIDER", "groq"),
        groq_api_key=_ler_opcional("GROQ_API_KEY"),
        groq_base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        llm_model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        ollama_model=os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
        mcp_host=os.getenv("MCP_HOST", "0.0.0.0"),
        mcp_port=int(os.getenv("MCP_PORT", "8000")),
        cache_ttl=int(os.getenv("CACHE_TTL", "3600")),
    )
