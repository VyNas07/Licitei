"""Tool: extrai contexto de um CNAE para geração de keywords de busca.

O JSON de subclasses é carregado uma vez em memória na primeira chamada
e reutilizado nas chamadas seguintes.
"""

import json
from functools import lru_cache
from pathlib import Path

_CNAE_PATH = Path(__file__).parent.parent.parent / "data" / "cnae.json"


@lru_cache(maxsize=1)
def _carregar_cnae() -> list[dict]:
    """Carrega o JSON de subclasses CNAE em memória (executado uma vez)."""
    return json.loads(_CNAE_PATH.read_text(encoding="utf-8"))


def keywords_cnae(codigo_cnae: str) -> dict:
    """Retorna descrição e atividades de uma subclasse CNAE pelo código.

    O resultado deve ser usado pelo LLM para derivar termos de busca
    para a tool buscar_licitacoes.

    Args:
        codigo_cnae: Código da subclasse CNAE do MEI (ex: "4751201").

    Returns:
        Dict com id, descricao, atividades e grupo_descricao,
        ou {"erro": "..."} se o código não for encontrado.
    """
    codigo = codigo_cnae.strip()
    cnae = _carregar_cnae()

    registro = next((c for c in cnae if c["id"] == codigo), None)
    if registro is None:
        return {"erro": f"CNAE '{codigo}' não encontrado na base IBGE."}

    return {
        "id": registro["id"],
        "descricao": registro["descricao"],
        "atividades": registro["atividades"],
        "grupo_descricao": registro["grupo_descricao"],
    }
