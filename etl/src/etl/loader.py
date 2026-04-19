"""Módulo de carga dos dados transformados no MongoDB Atlas e SQLite."""

import sqlite3
from datetime import datetime
from pathlib import Path
from types import TracebackType
from typing import Self

import pymongo
import pymongo.errors
from loguru import logger
from pymongo import MongoClient, UpdateOne


class PNCPLoader:
    """Carrega documentos normalizados no MongoDB Atlas (obrigatório) e SQLite (diferencial).

    Utiliza o padrão de context manager para garantir que a conexão com o MongoDB
    seja sempre encerrada, mesmo em caso de exceção.

    A carga no MongoDB usa upsert via bulk_write, evitando duplicatas em execuções
    repetidas. A carga no SQLite usa INSERT OR REPLACE com chave primária.

    Uso:
        with PNCPLoader(mongo_uri, db_name, collection, sqlite_path) as loader:
            loader.garantir_indice()
            loader.carregar_mongo(registros)
            loader.carregar_sqlite(registros)  # diferencial

    Args:
        mongo_uri: URI de conexão com o MongoDB Atlas.
        db_name: Nome do banco de dados no MongoDB.
        collection_name: Nome da coleção no MongoDB.
        sqlite_path: Caminho para o arquivo SQLite. None desabilita a carga no SQLite.
    """

    def __init__(
        self,
        mongo_uri: str,
        db_name: str,
        collection_name: str,
        sqlite_path: str | None = None,
    ) -> None:
        """Inicializa o loader com as configurações de conexão."""
        self._mongo_uri = mongo_uri
        self._db_name = db_name
        self._collection_name = collection_name
        self._sqlite_path = sqlite_path
        self._client: MongoClient | None = None
        self._collection: pymongo.collection.Collection | None = None
        logger.info(
            f"PNCPLoader inicializado | db={db_name} | collection={collection_name} "
            f"| sqlite={'habilitado' if sqlite_path else 'desabilitado'}"
        )

    def __enter__(self) -> Self:
        """Abre a conexão com o MongoDB Atlas."""
        logger.debug("Abrindo conexão com o MongoDB Atlas...")
        try:
            self._client = MongoClient(self._mongo_uri, serverSelectionTimeoutMS=10_000)
            # Força verificação imediata da conectividade
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

    def garantir_indice(self) -> None:
        """Cria índice único em 'numero_controle_pncp' se ainda não existir.

        A operação é idempotente — segura para executar em toda execução do pipeline.
        O índice único garante deduplicação em nível de banco, complementando o upsert.
        """
        assert self._collection is not None, "Loader não inicializado com context manager"
        self._collection.create_index(
            "numero_controle_pncp",
            unique=True,
            background=True,
        )
        logger.debug("Índice único em 'numero_controle_pncp' verificado/criado")

    def carregar_mongo(self, registros: list[dict]) -> dict[str, int]:
        """Carrega registros no MongoDB Atlas via upsert em lote.

        Usa bulk_write com UpdateOne(upsert=True) para cada registro.
        ordered=False permite que falhas individuais não interrompam o lote.

        Args:
            registros: Lista de documentos normalizados (saída do PNCPTransformer).

        Returns:
            Dicionário com contagem de documentos inseridos e atualizados.

        Raises:
            pymongo.errors.PyMongoError: Em caso de falha na comunicação com o MongoDB.
        """
        assert self._collection is not None, "Loader não inicializado com context manager"

        if not registros:
            logger.warning("carregar_mongo chamado com lista vazia — nada a fazer")
            return {"inseridos": 0, "atualizados": 0}

        logger.info(f"Iniciando carga no MongoDB | {len(registros)} documentos")

        operacoes = [
            UpdateOne(
                filter={"numero_controle_pncp": r["numero_controle_pncp"]},
                update={"$set": r},
                upsert=True,
            )
            for r in registros
        ]

        try:
            resultado = self._collection.bulk_write(operacoes, ordered=False)
        except pymongo.errors.PyMongoError as exc:
            logger.critical(f"Falha na carga do MongoDB: {exc}")
            raise

        inseridos = resultado.upserted_count
        atualizados = resultado.modified_count
        logger.info(f"MongoDB | inseridos={inseridos} | atualizados={atualizados}")
        return {"inseridos": inseridos, "atualizados": atualizados}

    def carregar_sqlite(self, registros: list[dict]) -> int:
        """Carrega registros no SQLite local via INSERT OR REPLACE (diferencial).

        Cria a tabela 'contratacoes' se não existir. Usa numero_controle_pncp como
        chave primária para garantir deduplicação em execuções repetidas.
        Campos datetime são convertidos para string ISO 8601, pois o SQLite não possui
        tipo datetime nativo.

        Args:
            registros: Lista de documentos normalizados (saída do PNCPTransformer).

        Returns:
            Quantidade de registros inseridos/atualizados.

        Raises:
            ValueError: Se sqlite_path não foi configurado.
        """
        if not self._sqlite_path:
            raise ValueError("sqlite_path não configurado — carga SQLite desabilitada")

        if not registros:
            logger.warning("carregar_sqlite chamado com lista vazia — nada a fazer")
            return 0

        Path(self._sqlite_path).parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Iniciando carga no SQLite | {len(registros)} registros | path={self._sqlite_path}")

        ddl = """
        CREATE TABLE IF NOT EXISTS contratacoes (
            numero_controle_pncp       TEXT PRIMARY KEY,
            objeto_compra              TEXT,
            valor_total_estimado       REAL,
            modalidade_nome            TEXT,
            situacao_compra_nome       TEXT,
            orgao_cnpj                 TEXT,
            orgao_razao_social         TEXT,
            uf                         TEXT,
            municipio                  TEXT,
            data_abertura_proposta     TEXT,
            data_encerramento_proposta TEXT,
            extraido_em                TEXT
        )
        """

        def _iso(valor: datetime | None) -> str | None:
            return valor.isoformat() if isinstance(valor, datetime) else None

        linhas = [
            (
                r["numero_controle_pncp"],
                r.get("objeto_compra"),
                r.get("valor_total_estimado"),
                r.get("modalidade_nome"),
                r.get("situacao_compra_nome"),
                r.get("orgao_cnpj"),
                r.get("orgao_razao_social"),
                r.get("uf"),
                r.get("municipio"),
                _iso(r.get("data_abertura_proposta")),
                _iso(r.get("data_encerramento_proposta")),
                _iso(r.get("_extraido_em")),
            )
            for r in registros
        ]

        with sqlite3.connect(self._sqlite_path) as conn:
            conn.execute(ddl)
            conn.executemany(
                """
                INSERT OR REPLACE INTO contratacoes VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                linhas,
            )

        logger.info(f"SQLite | {len(linhas)} registros carregados em '{self._sqlite_path}'")
        return len(linhas)
