"""Extract Worker — extrai licitações da API PNCP e publica no Kafka.

Responsabilidades:
  - Recebe --dataInicial e --dataFinal via argparse
  - Itera sobre as páginas da API via PNCPExtractor
  - Publica uma mensagem Kafka por licitação em raw.licitacoes
  - Em erro de publicação → envia para raw.licitacoes.dlq com stack trace

Execução:
    python workers/extract_worker.py --dataInicial 20260601 --dataFinal 20260602
"""

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from confluent_kafka import Producer
from loguru import logger
from pydantic import ValidationError

# Garante que src/ seja encontrado quando executado a partir de pipeline/
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.config import carregar_config
from src.contracts import PNCPRawContract
from src.ingestion.extractor import PNCPExtractor

_TETO_MEI = 81_000.0


def _configurar_logger() -> None:
    """Configura loguru com formato estruturado."""
    logger.remove()
    logger.add(
        sys.stderr,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> — "
            "<level>{message}</level>"
        ),
        level="INFO",
    )


def _normalizar_registro(raw: dict, extraido_em: datetime) -> dict | None:
    """Normaliza um registro bruto da API para o formato do contrato.

    Retorna None se o campo obrigatório numero_controle_pncp estiver ausente.
    """
    numero_controle = raw.get("numeroControlePNCP")
    if not numero_controle:
        return None

    orgao = raw.get("orgaoEntidade") or {}
    unidade = raw.get("unidadeOrgao") or {}

    valor_raw = raw.get("valorTotalEstimado")
    try:
        valor = float(valor_raw) if valor_raw is not None else 0.0
    except (TypeError, ValueError):
        valor = 0.0

    def _parse_dt(campo: str) -> datetime | None:
        val = raw.get(campo)
        if not val:
            return None
        try:
            return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None

    return {
        "numero_controle_pncp": numero_controle,
        "objeto_compra": (raw.get("objetoCompra") or "Não informado").strip(),
        "valor_total_estimado": valor,
        "modalidade_nome": (raw.get("modalidadeNome") or "Não informado").strip(),
        "situacao_compra_nome": (raw.get("situacaoCompraNome") or "Não informado").strip(),
        "data_abertura_proposta": _parse_dt("dataAberturaProposta"),
        "data_encerramento_proposta": _parse_dt("dataEncerramentoProposta"),
        "orgao_cnpj": (orgao.get("cnpj") or "").strip(),
        "orgao_razao_social": (
            orgao.get("razaoSocial") or unidade.get("nomeUnidade") or "Não informado"
        ).strip(),
        "uf": (unidade.get("ufSigla") or raw.get("uf") or "").strip(),
        "municipio": (unidade.get("municipioNome") or "").strip(),
        "extraido_em": extraido_em,
        "fonte": "PNCP",
    }


def _delivery_report(err, msg) -> None:
    """Callback de entrega do confluent-kafka."""
    if err is not None:
        logger.error(f"Falha na entrega | tópico={msg.topic()} | erro={err}")


def _publicar_dlq(producer: Producer, topico_dlq: str, numero_controle: str, erro: str) -> None:
    """Publica um registro de erro no tópico DLQ."""
    payload = json.dumps(
        {
            "numero_controle_pncp": numero_controle,
            "erro": erro,
            "falhou_em": datetime.now(tz=timezone.utc).isoformat(),
        },
        ensure_ascii=False,
    ).encode("utf-8")
    producer.produce(topico_dlq, value=payload, on_delivery=_delivery_report)


def executar(data_inicial: str, data_final: str, config=None) -> int:
    """Executa o ciclo completo de extração e publicação no Kafka.

    Args:
        data_inicial: Data de início no formato YYYYMMDD.
        data_final: Data de fim no formato YYYYMMDD.
        config: Configuração carregada do .env (None = carrega automaticamente).

    Returns:
        Total de mensagens publicadas com sucesso em raw.licitacoes.
    """
    if config is None:
        config = carregar_config()

    topico_raw = config.kafka_topic_raw
    topico_dlq = f"{topico_raw}.dlq"

    producer = Producer(
        {
            "bootstrap.servers": config.kafka_bootstrap_servers,
            "acks": "all",
            "retries": 3,
            "enable.idempotence": True,
        }
    )

    extractor = PNCPExtractor(
        base_url=config.pncp_base_url,
        tamanho_pagina=config.pncp_tamanho_pagina,
    )

    logger.info(
        f"Extract Worker iniciado | "
        f"modalidade={config.pncp_codigo_modalidade} | "
        f"período={data_inicial}→{data_final}"
    )

    registros_raw = extractor.extrair_publicacoes(
        codigo_modalidade=config.pncp_codigo_modalidade,
        data_inicial=data_inicial,
        data_final=data_final,
    )

    extraido_em = datetime.now(tz=timezone.utc)
    total_publicados = 0
    total_invalidos = 0
    total_dlq = 0

    for raw in registros_raw:
        numero_controle = raw.get("numeroControlePNCP", "desconhecido")

        normalizado = _normalizar_registro(raw, extraido_em)
        if normalizado is None:
            total_invalidos += 1
            continue

        try:
            contrato = PNCPRawContract(**normalizado)
        except ValidationError as exc:
            logger.warning(
                f"Registro inválido descartado | id={numero_controle} | {exc}"
            )
            total_invalidos += 1
            continue

        # Mensagem publicada: envelope com metadados + payload do contrato
        mensagem = json.dumps(
            {
                "extracted_at": extraido_em.isoformat(),
                "payload": contrato.model_dump(mode="json"),
            },
            ensure_ascii=False,
            default=str,
        ).encode("utf-8")

        try:
            producer.produce(topico_raw, value=mensagem, on_delivery=_delivery_report)
            total_publicados += 1
        except Exception as exc:
            erro = traceback.format_exc()
            logger.error(f"Falha ao publicar | id={numero_controle} | {exc}")
            _publicar_dlq(producer, topico_dlq, numero_controle, erro)
            total_dlq += 1

        # Polling periódico para processar callbacks de entrega
        producer.poll(0)

    producer.flush()

    logger.info(
        f"Extract Worker concluído | "
        f"publicados={total_publicados} | "
        f"inválidos={total_invalidos} | "
        f"dlq={total_dlq}"
    )
    return total_publicados


def _parse_args() -> argparse.Namespace:
    """Parseia os argumentos de linha de comando."""
    parser = argparse.ArgumentParser(
        description="Extract Worker — PNCP → Kafka raw.licitacoes"
    )
    parser.add_argument(
        "--dataInicial",
        required=True,
        help="Data inicial no formato YYYYMMDD (ex: 20260601)",
    )
    parser.add_argument(
        "--dataFinal",
        required=True,
        help="Data final no formato YYYYMMDD (ex: 20260602)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    _configurar_logger()
    args = _parse_args()
    executar(data_inicial=args.dataInicial, data_final=args.dataFinal)
