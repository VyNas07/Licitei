"""Contratos de dados Pydantic para as três camadas da arquitetura Medallion.

- PNCPRawContract        → mensagem Kafka raw.licitacoes + Bronze Parquet
- EditaisSilverContract  → mensagem Kafka transformed.licitacoes + Silver Iceberg
- KpiPorUf               → Gold: total de editais e valor médio por UF
- KpiPorModalidade       → Gold: contagem e valor total por modalidade
- KpiPrazos              → Gold: editais encerrando em 7, 15 e 30 dias
- KpiElegibilidade       → Gold: editais dentro do teto MEI (R$81k)
- KpiDashboard           → Gold: totais gerais (count, valor agregado, por modalidade)
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Camada Bronze — dado bruto circulando no Kafka
# ---------------------------------------------------------------------------

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
    data_abertura_proposta: Optional[datetime] = None
    data_encerramento_proposta: Optional[datetime] = None
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


# ---------------------------------------------------------------------------
# Camada Silver — dado limpo e enriquecido
# ---------------------------------------------------------------------------

class EditaisSilverContract(BaseModel):
    """Contrato do dado limpo, enriquecido e validado na camada Silver.

    Publicado no tópico transformed.licitacoes e persistido no PyIceberg.
    """

    numero_controle_pncp: str
    objeto_compra: str
    valor_total_estimado: float
    modalidade_nome: str
    situacao_compra_nome: str
    data_abertura_proposta: Optional[datetime] = None
    data_encerramento_proposta: Optional[datetime] = None
    orgao_cnpj: str
    orgao_razao_social: str
    uf: str
    municipio: str

    # Campos enriquecidos pelo Transform Worker
    ano_mes: str = Field(description="YYYY-MM derivado de data_abertura_proposta")
    ativo: bool
    dias_ate_encerramento: int = Field(ge=-1, description="-1 se data ausente")
    elegivel_mei: bool = Field(description="True se valor <= R$81.000")
    faixa_valor: str = Field(
        description="micro (<10k), pequeno (10k–81k), medio (81k–500k), grande (>500k)"
    )

    processado_em: datetime
    versao: int = Field(default=1, ge=1)

    @field_validator("uf")
    @classmethod
    def uf_maiuscula(cls, v: str) -> str:
        """Garante que a UF esteja em maiúsculas."""
        return v.upper()

    @field_validator("faixa_valor")
    @classmethod
    def faixa_valida(cls, v: str) -> str:
        """Garante que a faixa_valor seja um dos valores esperados."""
        opcoes = {"micro", "pequeno", "medio", "grande"}
        if v not in opcoes:
            raise ValueError(f"faixa_valor deve ser um de {opcoes}")
        return v


# ---------------------------------------------------------------------------
# Camada Gold — KPIs agregados no MongoDB Atlas
# ---------------------------------------------------------------------------

class KpiPorUf(BaseModel):
    """KPI Gold: total de editais abertos e valor médio por UF."""

    uf: str
    total_editais: int = Field(ge=0)
    valor_medio: float = Field(ge=0.0)
    valor_total: float = Field(ge=0.0)
    data_referencia: date
    atualizado_em: datetime


class KpiPorModalidade(BaseModel):
    """KPI Gold: contagem e valor total por modalidade de contratação."""

    modalidade: str
    total_editais: int = Field(ge=0)
    valor_total: float = Field(ge=0.0)
    data_referencia: date
    atualizado_em: datetime


class KpiPrazos(BaseModel):
    """KPI Gold: editais com encerramento em 7, 15 e 30 dias."""

    editais_7d: int = Field(ge=0)
    editais_15d: int = Field(ge=0)
    editais_30d: int = Field(ge=0)
    data_referencia: date
    atualizado_em: datetime


class KpiElegibilidade(BaseModel):
    """KPI Gold: editais dentro do teto MEI (R$81k)."""

    total_elegiveis_mei: int = Field(ge=0)
    valor_total_elegiveis: float = Field(ge=0.0)
    percentual_elegivel: float = Field(ge=0.0, le=100.0)
    data_referencia: date
    atualizado_em: datetime


class KpiDashboard(BaseModel):
    """KPI Gold: totais gerais para o dashboard principal."""

    total_editais: int = Field(ge=0)
    valor_agregado_total: float = Field(ge=0.0)
    ticket_medio: float = Field(ge=0.0)
    total_orgaos_distintos: int = Field(ge=0)
    editais_ativos: int = Field(ge=0)
    data_referencia: date
    atualizado_em: datetime
