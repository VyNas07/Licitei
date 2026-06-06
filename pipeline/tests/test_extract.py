"""Testes unitários do Extract Worker e do PNCPExtractor."""

import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.contracts import PNCPRawContract
from workers.extract_worker import _normalizar_registro


# ---------------------------------------------------------------------------
# _normalizar_registro
# ---------------------------------------------------------------------------

def _registro_completo(numero: str = "2026PE000001-1-00001-0001-00001") -> dict:
    """Retorna um dicionário simulando um registro bruto da API PNCP."""
    return {
        "numeroControlePNCP": numero,
        "objetoCompra": "Aquisição de materiais de escritório",
        "valorTotalEstimado": 5000.0,
        "modalidadeNome": "Pregão Eletrônico",
        "situacaoCompraNome": "Divulgada no PNCP",
        "dataAberturaProposta": "2026-06-01T10:00:00Z",
        "dataEncerramentoProposta": "2026-06-10T18:00:00Z",
        "orgaoEntidade": {
            "cnpj": "12345678000199",
            "razaoSocial": "Prefeitura Municipal de Recife",
        },
        "unidadeOrgao": {
            "ufSigla": "PE",
            "municipioNome": "Recife",
        },
    }


class TestNormalizarRegistro:
    """Testa a função de normalização de registros brutos da API."""

    def test_registro_completo_retorna_dict(self):
        """Registro completo deve gerar dicionário com todos os campos."""
        agora = datetime.now(tz=timezone.utc)
        resultado = _normalizar_registro(_registro_completo(), agora)

        assert resultado is not None
        assert resultado["numero_controle_pncp"] == "2026PE000001-1-00001-0001-00001"
        assert resultado["objeto_compra"] == "Aquisição de materiais de escritório"
        assert resultado["valor_total_estimado"] == 5000.0
        assert resultado["uf"] == "PE"
        assert resultado["municipio"] == "Recife"
        assert resultado["orgao_cnpj"] == "12345678000199"

    def test_sem_numero_controle_retorna_none(self):
        """Registro sem numeroControlePNCP deve retornar None."""
        agora = datetime.now(tz=timezone.utc)
        raw = _registro_completo()
        del raw["numeroControlePNCP"]
        resultado = _normalizar_registro(raw, agora)
        assert resultado is None

    def test_valor_none_vira_zero(self):
        """valorTotalEstimado=None deve resultar em 0.0."""
        agora = datetime.now(tz=timezone.utc)
        raw = _registro_completo()
        raw["valorTotalEstimado"] = None
        resultado = _normalizar_registro(raw, agora)
        assert resultado is not None
        assert resultado["valor_total_estimado"] == 0.0

    def test_objeto_compra_ausente_nao_informado(self):
        """objetoCompra ausente deve virar 'Não informado'."""
        agora = datetime.now(tz=timezone.utc)
        raw = _registro_completo()
        raw["objetoCompra"] = None
        resultado = _normalizar_registro(raw, agora)
        assert resultado is not None
        assert resultado["objeto_compra"] == "Não informado"

    def test_contrato_raw_valida_resultado(self):
        """O dict normalizado deve passar na validação PNCPRawContract."""
        agora = datetime.now(tz=timezone.utc)
        raw = _registro_completo()
        resultado = _normalizar_registro(raw, agora)
        assert resultado is not None
        contrato = PNCPRawContract(**resultado)
        assert contrato.uf == "PE"

    def test_uf_vira_maiuscula_no_contrato(self):
        """UF minúscula deve ser normalizada para maiúscula pelo validador do contrato."""
        agora = datetime.now(tz=timezone.utc)
        raw = _registro_completo()
        raw["unidadeOrgao"] = {"ufSigla": "pe", "municipioNome": "Recife"}
        resultado = _normalizar_registro(raw, agora)
        assert resultado is not None
        contrato = PNCPRawContract(**resultado)
        assert contrato.uf == "PE"
