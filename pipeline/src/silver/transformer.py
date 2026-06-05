"""Camada Silver — persistência ACID com PyIceberg.

Responsabilidades:
  - Criação automática da tabela Iceberg se não existir
  - Deduplicação idempotente por numero_controle_pncp (overwrite por chave)
  - ACID + snapshots para time travel
  - Valida cada registro com EditaisSilverContract antes de persistir
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pyarrow as pa
from loguru import logger
from pyiceberg.catalog.sql import SqlCatalog
from pyiceberg.exceptions import NoSuchTableError
from pyiceberg.schema import Schema
from pyiceberg.types import (
    BooleanType,
    DateType,
    DoubleType,
    IntegerType,
    LongType,
    NestedField,
    StringType,
    TimestamptzType,
)

from src.contracts import EditaisSilverContract

_TABLE_NAME = "licitacoes_silver"
_NAMESPACE = "licitei"

_ICEBERG_SCHEMA = Schema(
    NestedField(1, "numero_controle_pncp", StringType(), required=True),
    NestedField(2, "objeto_compra", StringType(), required=False),
    NestedField(3, "valor_total_estimado", DoubleType(), required=False),
    NestedField(4, "modalidade_nome", StringType(), required=False),
    NestedField(5, "situacao_compra_nome", StringType(), required=False),
    NestedField(6, "data_abertura_proposta", TimestamptzType(), required=False),
    NestedField(7, "data_encerramento_proposta", TimestamptzType(), required=False),
    NestedField(8, "orgao_cnpj", StringType(), required=False),
    NestedField(9, "orgao_razao_social", StringType(), required=False),
    NestedField(10, "uf", StringType(), required=False),
    NestedField(11, "municipio", StringType(), required=False),
    NestedField(12, "ano_mes", StringType(), required=False),
    NestedField(13, "ativo", BooleanType(), required=False),
    NestedField(14, "dias_ate_encerramento", IntegerType(), required=False),
    NestedField(15, "elegivel_mei", BooleanType(), required=False),
    NestedField(16, "faixa_valor", StringType(), required=False),
    NestedField(17, "processado_em", TimestamptzType(), required=False),
    NestedField(18, "versao", IntegerType(), required=False),
)

_ARROW_SCHEMA = pa.schema(
    [
        pa.field("numero_controle_pncp", pa.string(), nullable=False),
        pa.field("objeto_compra", pa.string()),
        pa.field("valor_total_estimado", pa.float64()),
        pa.field("modalidade_nome", pa.string()),
        pa.field("situacao_compra_nome", pa.string()),
        pa.field("data_abertura_proposta", pa.timestamp("us", tz="UTC")),
        pa.field("data_encerramento_proposta", pa.timestamp("us", tz="UTC")),
        pa.field("orgao_cnpj", pa.string()),
        pa.field("orgao_razao_social", pa.string()),
        pa.field("uf", pa.string()),
        pa.field("municipio", pa.string()),
        pa.field("ano_mes", pa.string()),
        pa.field("ativo", pa.bool_()),
        pa.field("dias_ate_encerramento", pa.int32()),
        pa.field("elegivel_mei", pa.bool_()),
        pa.field("faixa_valor", pa.string()),
        pa.field("processado_em", pa.timestamp("us", tz="UTC")),
        pa.field("versao", pa.int32()),
    ]
)


class SilverTransformer:
    """Gerencia a camada Silver usando PyIceberg com catalog SQLite local."""

    def __init__(self, catalog_path: str) -> None:
        """Inicializa o catálogo PyIceberg e garante que a tabela exista.

        Args:
            catalog_path: Caminho para o diretório do catálogo Iceberg.
        """
        self._catalog_path = Path(catalog_path)
        self._catalog_path.mkdir(parents=True, exist_ok=True)

        catalog_uri = f"sqlite:///{self._catalog_path / 'catalog.db'}"
        warehouse = str(self._catalog_path)

        self._catalog = SqlCatalog(
            "licitei_catalog",
            **{
                "uri": catalog_uri,
                "warehouse": f"file://{warehouse}",
            },
        )

        self._garantir_namespace()
        self._tabela = self._garantir_tabela()
        logger.info(
            f"SilverTransformer inicializado | "
            f"catalog={self._catalog_path} | "
            f"tabela={_NAMESPACE}.{_TABLE_NAME}"
        )

    def _garantir_namespace(self) -> None:
        """Cria o namespace se não existir."""
        try:
            self._catalog.create_namespace(_NAMESPACE)
            logger.debug(f"Namespace '{_NAMESPACE}' criado")
        except Exception:
            pass  # Namespace já existe

    def _garantir_tabela(self) -> Any:
        """Retorna a tabela Iceberg, criando-a se necessário."""
        identificador = (_NAMESPACE, _TABLE_NAME)
        try:
            return self._catalog.load_table(identificador)
        except NoSuchTableError:
            tabela = self._catalog.create_table(
                identifier=identificador,
                schema=_ICEBERG_SCHEMA,
            )
            logger.info(f"Tabela Iceberg '{_NAMESPACE}.{_TABLE_NAME}' criada")
            return tabela

    def persistir(self, registros: list[EditaisSilverContract]) -> int:
        """Persiste um batch de registros na tabela Silver com deduplicação idempotente.

        Para cada registro, realiza overwrite dos dados com o mesmo numero_controle_pncp,
        garantindo que não haja duplicatas mesmo em caso de reprocessamento.

        Args:
            registros: Lista de contratos Silver validados.

        Returns:
            Quantidade de registros persistidos.
        """
        if not registros:
            return 0

        linhas = [_silver_para_dict(r) for r in registros]
        tabela_arrow = pa.Table.from_pylist(linhas, schema=_ARROW_SCHEMA)

        # Coleta os IDs do batch para overwrite idêntico
        ids = [r.numero_controle_pncp for r in registros]

        self._tabela.overwrite(
            tabela_arrow,
            overwrite_filter=_construir_filtro_ids(ids),
        )

        logger.info(
            f"Silver persistido | "
            f"{len(registros)} registros | "
            f"tabela={_NAMESPACE}.{_TABLE_NAME}"
        )
        return len(registros)

    def contar_snapshots(self) -> int:
        """Retorna o número de snapshots disponíveis para time travel."""
        return len(list(self._tabela.history()))


def _silver_para_dict(contrato: EditaisSilverContract) -> dict:
    """Converte um contrato Silver para dicionário compatível com o schema PyArrow."""

    def _norm_dt(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    return {
        "numero_controle_pncp": contrato.numero_controle_pncp,
        "objeto_compra": contrato.objeto_compra,
        "valor_total_estimado": contrato.valor_total_estimado,
        "modalidade_nome": contrato.modalidade_nome,
        "situacao_compra_nome": contrato.situacao_compra_nome,
        "data_abertura_proposta": _norm_dt(contrato.data_abertura_proposta),
        "data_encerramento_proposta": _norm_dt(contrato.data_encerramento_proposta),
        "orgao_cnpj": contrato.orgao_cnpj,
        "orgao_razao_social": contrato.orgao_razao_social,
        "uf": contrato.uf,
        "municipio": contrato.municipio,
        "ano_mes": contrato.ano_mes,
        "ativo": contrato.ativo,
        "dias_ate_encerramento": contrato.dias_ate_encerramento,
        "elegivel_mei": contrato.elegivel_mei,
        "faixa_valor": contrato.faixa_valor,
        "processado_em": _norm_dt(contrato.processado_em),
        "versao": contrato.versao,
    }


def _construir_filtro_ids(ids: list[str]):
    """Constrói um filtro PyIceberg para overwrite por lista de IDs."""
    from pyiceberg.expressions import In

    return In("numero_controle_pncp", ids)
