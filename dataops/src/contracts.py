"""Contratos de dados Pydantic para as três camadas da arquitetura Medallion.

- PNCPRawContract   → Bronze: dado bruto validado que circula no tópico Kafka
- EditaisSilverContract → Silver: dado limpo, deduplicado (Sprint 3)
- EditaisGoldKPI    → Gold: KPIs agregados para o app (Sprint 3)
"""

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class PNCPRawContract(BaseModel):
    """Contrato do dado bruto extraído da API PNCP.

    Representa exatamente um edital normalizado pelo extrator, publicado
    no tópico Kafka e gravado na camada Bronze (Parquet).
    """

    numero_controle_pncp: str
    objeto_compra: str
    valor_total_estimado: float
    modalidade_nome: str
    situacao_compra_nome: str
    data_abertura_proposta: datetime | None = None
    data_encerramento_proposta: datetime | None = None
    orgao_cnpj: str
    orgao_razao_social: str
    uf: str
    municipio: str
    extraido_em: datetime
    fonte: str = "PNCP"

    @field_validator("uf")
    @classmethod
    def uf_maiuscula(cls, v: str) -> str:
        """Garante que a UF esteja em maiúsculas."""
        return v.upper()

    @field_validator("valor_total_estimado")
    @classmethod
    def valor_nao_negativo(cls, v: float) -> float:
        """Garante que o valor estimado não seja negativo."""
        return max(v, 0.0)


class EditaisSilverContract(BaseModel):
    """Contrato do dado limpo e enriquecido na camada Silver.

    Utilizado na Sprint 3 — definido agora para orientar o design do pipeline.
    """

    numero_controle_pncp: str
    objeto_compra: str
    valor_total_estimado: float
    uf: str
    municipio: str
    dias_ate_encerramento: int = Field(ge=-1)
    elegivel_mei_80k: bool
    processado_em: datetime
    versao: int = Field(ge=1)


class EditaisGoldKPI(BaseModel):
    """Contrato de um KPI agregado gravado no MongoDB Atlas na camada Gold.

    Utilizado na Sprint 3 — definido agora para orientar o design do pipeline.

    Exemplos de chave: 'uf_PE', 'cnae_5411-3', 'prazo_7d', 'elegibilidade_mei'.
    """

    chave: str
    valor_numerico: float
    contagem: int = Field(ge=0)
    data_referencia: date
    atualizado_em: datetime
