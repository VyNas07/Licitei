"""Cache em memória com TTL para respostas do servidor MCP."""

import hashlib
import time


class Cache:
    """Cache em memória com expiração por TTL.

    Armazena respostas do LLM indexadas por hash do input para evitar
    chamadas repetidas à API em queries idênticas.

    Args:
        ttl: Tempo de vida de cada entrada em segundos.
    """

    def __init__(self, ttl: int) -> None:
        """Inicializa o cache vazio."""
        self._ttl = ttl
        self._store: dict[str, tuple[str, float]] = {}

    @staticmethod
    def chave(texto: str) -> str:
        """Gera a chave de cache a partir do texto normalizado."""
        return hashlib.md5(texto.strip().lower().encode()).hexdigest()

    def get(self, chave: str) -> str | None:
        """Retorna o valor se existir e não estiver expirado, senão None."""
        entrada = self._store.get(chave)
        if entrada is None:
            return None
        valor, timestamp = entrada
        if time.time() - timestamp > self._ttl:
            del self._store[chave]
            return None
        return valor

    def set(self, chave: str, valor: str) -> None:
        """Armazena um valor com o timestamp atual."""
        self._store[chave] = (valor, time.time())

    def tamanho(self) -> int:
        """Retorna a quantidade de entradas ativas no cache."""
        return len(self._store)
