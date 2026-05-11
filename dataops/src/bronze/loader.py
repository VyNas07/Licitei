"""Loader da camada Bronze — persiste batches em Parquet particionado por data.

Particionamento:
    {BRONZE_BASE_PATH}/contratacoes/year=YYYY/month=MM/day=DD/batch_<timestamp>.parquet

O arquivo é imutável após criação. O sufixo timestamp garante que execuções
repetidas para a mesma data não sobrescrevam arquivos anteriores.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
from loguru import logger

from src.contracts import PNCPRawContract

_SCHEMA = pa.schema(
    [
        pa.field("numero_controle_pncp", pa.string()),
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
        pa.field("extraido_em", pa.timestamp("us", tz="UTC")),
        pa.field("fonte", pa.string()),
    ]
)


class BronzeLoader:
    """Grava batches de contratos validados em arquivos Parquet particionados."""

    def __init__(self, base_path: str) -> None:
        """Inicializa o loader com o caminho base da camada Bronze.

        Args:
            base_path: Diretório raiz onde os arquivos Parquet serão gravados.
        """
        self._base = Path(base_path)
        logger.info(f"BronzeLoader inicializado | base_path={self._base.resolve()}")

    def gravar(self, registros: list[PNCPRawContract]) -> Path:
        """Grava um batch de registros em um único arquivo Parquet.

        O particionamento usa a data de extraido_em do primeiro registro.
        O arquivo nunca é sobrescrito — o timestamp no nome garante unicidade.

        Args:
            registros: Lista de contratos validados a gravar.

        Returns:
            Caminho do arquivo Parquet criado.

        Raises:
            ValueError: Se a lista de registros estiver vazia.
        """
        if not registros:
            raise ValueError("Batch vazio — nenhum arquivo gravado.")

        data_ref = registros[0].extraido_em.date()
        timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S_%f")

        particao = (
            self._base
            / "contratacoes"
            / f"year={data_ref.year}"
            / f"month={data_ref.month:02d}"
            / f"day={data_ref.day:02d}"
        )
        particao.mkdir(parents=True, exist_ok=True)

        destino = particao / f"batch_{timestamp}.parquet"

        linhas = [_contrato_para_dict(r) for r in registros]
        tabela = pa.Table.from_pylist(linhas, schema=_SCHEMA)
        pq.write_table(tabela, destino, compression="snappy")

        logger.info(
            f"Batch gravado | "
            f"{len(registros)} registros | "
            f"arquivo={destino}"
        )
        return destino


def _contrato_para_dict(contrato: PNCPRawContract) -> dict:
    """Converte um contrato para dicionário compatível com o schema PyArrow."""

    def _normalizar_dt(dt):
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
        "data_abertura_proposta": _normalizar_dt(contrato.data_abertura_proposta),
        "data_encerramento_proposta": _normalizar_dt(contrato.data_encerramento_proposta),
        "orgao_cnpj": contrato.orgao_cnpj,
        "orgao_razao_social": contrato.orgao_razao_social,
        "uf": contrato.uf,
        "municipio": contrato.municipio,
        "extraido_em": _normalizar_dt(contrato.extraido_em),
        "fonte": contrato.fonte,
    }
