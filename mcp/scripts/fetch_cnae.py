"""Gera mcp/data/cnae.json a partir da API pública do IBGE.

Uso:
    python mcp/scripts/fetch_cnae.py

Salva um JSON flat com subclasses CNAE — id, descrição, atividades e
descrição do grupo — para uso offline pela tool keywords_cnae.
"""

import json
import sys
from pathlib import Path

import httpx

API_URL = "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses"
DESTINO = Path(__file__).parent.parent / "data" / "cnae.json"


def _flatten(subclasse: dict) -> dict:
    """Retorna apenas os campos relevantes para geração de keywords."""
    return {
        "id": subclasse["id"],
        "descricao": subclasse["descricao"],
        "atividades": subclasse.get("atividades", []),
        "grupo_descricao": subclasse["classe"]["grupo"]["descricao"],
    }


def main() -> None:
    print(f"Buscando subclasses CNAE em {API_URL} ...")
    try:
        response = httpx.get(API_URL, timeout=30)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        print(f"Erro ao buscar API IBGE: {exc}", file=sys.stderr)
        sys.exit(1)

    dados = response.json()
    flattened = [_flatten(s) for s in dados]

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(
        json.dumps(flattened, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvo: {DESTINO}  ({len(flattened)} subclasses)")


if __name__ == "__main__":
    main()
