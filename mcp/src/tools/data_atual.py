"""Tool: retorna a data e hora atual para raciocínio temporal do LLM."""

from datetime import datetime, timezone

_DIAS_SEMANA = [
    "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado", "domingo",
]

_MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def data_atual() -> dict:
    """Retorna a data e hora atual do servidor.

    Use quando precisar saber a data atual para verificar se um edital está
    vencido ou calcular prazos. Sempre chame esta tool antes de comparar
    datas de encerramento de licitações com "hoje".

    Returns:
        Dict com data_iso, data_formatada (português) e timestamp_utc.
    """
    agora = datetime.now()
    agora_utc = datetime.now(timezone.utc)

    dia_semana = _DIAS_SEMANA[agora.weekday()]
    mes = _MESES[agora.month - 1]
    data_formatada = f"{dia_semana}, {agora.day} de {mes} de {agora.year}"

    return {
        "data_iso": agora.date().isoformat(),
        "data_formatada": data_formatada,
        "timestamp_utc": agora_utc.isoformat(),
    }
