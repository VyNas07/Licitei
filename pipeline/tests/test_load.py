"""Testes unitários do Load Worker — SQLite upsert e contratos Silver."""

import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.contracts import EditaisSilverContract
from workers.load_worker import _DDL_LICITACOES, _upsert_sqlite


def _criar_silver(numero: str = "2026PE000001-1-00001-0001-00001") -> EditaisSilverContract:
    """Retorna um contrato Silver de teste."""
    return EditaisSilverContract(
        numero_controle_pncp=numero,
        objeto_compra="Materiais de escritório",
        valor_total_estimado=45_000.0,
        modalidade_nome="Pregão Eletrônico",
        situacao_compra_nome="Divulgada no PNCP",
        orgao_cnpj="12345678000199",
        orgao_razao_social="Prefeitura de Recife",
        uf="PE",
        municipio="Recife",
        ano_mes="2026-06",
        ativo=True,
        dias_ate_encerramento=10,
        elegivel_mei=True,
        faixa_valor="pequeno",
        processado_em=datetime.now(tz=timezone.utc),
        versao=1,
    )


class TestUpsertSqlite:
    """Testa o upsert SQLite do Load Worker."""

    def test_insere_novo_registro(self):
        """Deve inserir um registro novo e retornar 1."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            conn = sqlite3.connect(tmp.name)
            conn.execute(_DDL_LICITACOES)
            conn.commit()

            silver = _criar_silver()
            n = _upsert_sqlite(conn, [silver])
            assert n == 1

            row = conn.execute(
                "SELECT numero_controle_pncp FROM licitacoes WHERE numero_controle_pncp=?",
                (silver.numero_controle_pncp,),
            ).fetchone()
            assert row is not None
            conn.close()

    def test_upsert_nao_duplica(self):
        """Inserir o mesmo registro duas vezes não deve criar duplicata."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            conn = sqlite3.connect(tmp.name)
            conn.execute(_DDL_LICITACOES)
            conn.commit()

            silver = _criar_silver()
            _upsert_sqlite(conn, [silver])
            _upsert_sqlite(conn, [silver])

            count = conn.execute("SELECT COUNT(*) FROM licitacoes").fetchone()[0]
            assert count == 1
            conn.close()

    def test_insere_multiplos_registros(self):
        """Deve inserir múltiplos registros distintos."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            conn = sqlite3.connect(tmp.name)
            conn.execute(_DDL_LICITACOES)
            conn.commit()

            registros = [_criar_silver(f"ID-{i}") for i in range(5)]
            n = _upsert_sqlite(conn, registros)
            assert n == 5

            count = conn.execute("SELECT COUNT(*) FROM licitacoes").fetchone()[0]
            assert count == 5
            conn.close()

    def test_lista_vazia_retorna_zero(self):
        """Lista vazia não deve causar erro e retorna 0."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            conn = sqlite3.connect(tmp.name)
            conn.execute(_DDL_LICITACOES)
            conn.commit()

            n = _upsert_sqlite(conn, [])
            assert n == 0
            conn.close()
