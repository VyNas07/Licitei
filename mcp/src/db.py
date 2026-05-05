"""Gerenciamento da conexão com o MongoDB Atlas."""

from types import TracebackType
from typing import Self

import pymongo
import pymongo.errors
from loguru import logger
from pymongo import MongoClient
from pymongo.collection import Collection


class MongoManager:
    """Gerencia a conexão com o MongoDB Atlas via context manager.

    Garante que a conexão seja encerrada mesmo em caso de exceção.

    Uso:
        with MongoManager(uri, db_name, collection_name) as mongo:
            resultado = mongo.collection.find({"uf": "PE"})

    Args:
        uri: URI de conexão com o MongoDB Atlas.
        db_name: Nome do banco de dados.
        collection_name: Nome da coleção de licitações.
    """

    def __init__(self, uri: str, db_name: str, collection_name: str) -> None:
        """Inicializa o gerenciador sem abrir conexão."""
        self._uri = uri
        self._db_name = db_name
        self._collection_name = collection_name
        self._client: MongoClient | None = None
        self._collection: Collection | None = None

    def __enter__(self) -> Self:
        """Abre e valida a conexão com o MongoDB Atlas."""
        logger.debug("Abrindo conexão com o MongoDB Atlas...")
        try:
            self._client = MongoClient(self._uri, serverSelectionTimeoutMS=10_000)
            self._client.admin.command("ping")
            self._collection = self._client[self._db_name][self._collection_name]
            logger.info("Conexão com o MongoDB Atlas estabelecida")
        except pymongo.errors.ServerSelectionTimeoutError as exc:
            logger.critical(
                f"Não foi possível conectar ao MongoDB Atlas. "
                f"Verifique MONGO_URI e se o IP está liberado no Atlas. Detalhe: {exc}"
            )
            raise
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Encerra a conexão com o MongoDB Atlas."""
        if self._client:
            self._client.close()
            logger.debug("Conexão com o MongoDB Atlas encerrada")

    @property
    def collection(self) -> Collection:
        """Retorna a coleção ativa. Deve ser usado dentro do context manager."""
        assert self._collection is not None, "MongoManager não inicializado com context manager"
        return self._collection
