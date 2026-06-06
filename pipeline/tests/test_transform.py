"""Testes unitários do Transform Worker — transformações e enriquecimentos."""

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.contracts import EditaisSilverContract
from workers.transform_worker import (
    _calcular_dias_encerramento,
    _faixa_valor,
    _transformar,
)


# ---------------------------------------------------------------------------
# _faixa_valor
# ---------------------------------------------------------------------------

class TestFaixaValor:
    """Testa a classificação de faixas de valor para MEI."""

    def test_micro(self):
        assert _faixa_valor(0.0) == "micro"
        assert _faixa_valor(9_999.99) == "micro"

    def test_pequeno(self):
        assert _faixa_valor(10_000.0) == "pequeno"
        assert _faixa_valor(81_000.0) == "pequeno"

    def test_medio(self):
        assert _faixa_valor(81_000.01) == "medio"
        assert _faixa_valor(500_000.0) == "medio"

    def test_grande(self):
        assert _faixa_valor(500_000.01) == "grande"
        assert _faixa_valor(1_000_000.0) == "grande"


# ---------------------------------------------------------------------------
# _calcular_dias_encerramento
# ---------------------------------------------------------------------------

class TestCalcularDiasEncerramento:
    """Testa o cálculo de dias até encerramento da proposta."""

    def test_data_none_retorna_menos_um(self):
        assert _calcular_dias_encerramento(None) == -1

    def test_data_futura_retorna_positivo(self):
        from datetime import timedelta
        futuro = datetime.now(tz=timezone.utc) + timedelta(days=10)
        dias = _calcular_dias_encerramento(futuro)
        assert dias >= 9

    def test_data_passada_retorna_menos_um(self):
        from datetime import timedelta
        passado = datetime.now(tz=timezone.utc) - timedelta(days=5)
        dias = _calcular_dias_encerramento(passado)
        assert dias == -1


# ---------------------------------------------------------------------------
# _transformar
# ---------------------------------------------------------------------------

def _payload_raw() -> dict:
    """Retorna um payload bruto de contrato raw simulado."""
    return {
        "numero_controle_pncp": "2026PE000001-1-00001-0001-00001",
        "objeto_compra": "Aquisição de materiais",
        "valor_total_estimado": 45_000.0,
        "modalidade_nome": "Pregão Eletrônico",
        "situacao_compra_nome": "Divulgada no PNCP",
        "data_abertura_proposta": "2026-06-01T10:00:00+00:00",
        "data_encerramento_proposta": None,
        "orgao_cnpj": "12345678000199",
        "orgao_razao_social": "Prefeitura de Recife",
        "uf": "PE",
        "municipio": "Recife",
        "extraido_em": datetime.now(tz=timezone.utc).isoformat(),
        "fonte": "PNCP",
    }


class TestTransformar:
    """Testa a função de transformação e enriquecimento de payloads."""

    def test_retorna_dict_com_campos_silver(self):
        """Deve retornar dicionário com todos os campos necessários para Silver."""
        agora = datetime.now(tz=timezone.utc)
        resultado = _transformar(_payload_raw(), agora)

        assert "ano_mes" in resultado
        assert "ativo" in resultado
        assert "dias_ate_encerramento" in resultado
        assert "elegivel_mei" in resultado
        assert "faixa_valor" in resultado

    def test_elegivel_mei_abaixo_do_teto(self):
        """Valor <= 81k deve ser elegível para MEI."""
        agora = datetime.now(tz=timezone.utc)
        payload = _payload_raw()
        payload["valor_total_estimado"] = 45_000.0
        resultado = _transformar(payload, agora)
        assert resultado["elegivel_mei"] is True

    def test_nao_elegivel_acima_do_teto(self):
        """Valor > 81k não deve ser elegível para MEI."""
        agora = datetime.now(tz=timezone.utc)
        payload = _payload_raw()
        payload["valor_total_estimado"] = 100_000.0
        resultado = _transformar(payload, agora)
        assert resultado["elegivel_mei"] is False

    def test_faixa_valor_calculada(self):
        """faixa_valor deve estar entre micro/pequeno/medio/grande."""
        agora = datetime.now(tz=timezone.utc)
        resultado = _transformar(_payload_raw(), agora)
        assert resultado["faixa_valor"] in {"micro", "pequeno", "medio", "grande"}

    def test_ano_mes_derivado_de_data_abertura(self):
        """ano_mes deve ser derivado da data de abertura."""
        agora = datetime.now(tz=timezone.utc)
        resultado = _transformar(_payload_raw(), agora)
        assert resultado["ano_mes"] == "2026-06"

    def test_resultado_valida_silver_contract(self):
        """O dicionário transformado deve passar na validação EditaisSilverContract."""
        agora = datetime.now(tz=timezone.utc)
        resultado = _transformar(_payload_raw(), agora)
        silver = EditaisSilverContract(**resultado)
        assert silver.numero_controle_pncp == "2026PE000001-1-00001-0001-00001"
