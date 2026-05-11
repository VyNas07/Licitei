"""Kafka Producer da camada DataOps.

Extrai contratações da API PNCP, valida cada registro com PNCPRawContract
e publica no tópico Kafka configurado em KAFKA_TOPIC_RAW.

Execução:
    python -m src.producer
"""

import json
import sys
import time
from datetime import datetime, timezone
from typing import Any

import requests
from kafka import KafkaProducer
from kafka.errors import KafkaError
from loguru import logger
from pydantic import ValidationError

from src.config import carregar_config
from src.contracts import PNCPRawContract

_MAX_TENTATIVAS = 3
_BACKOFF_BASE = 1.0


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


def _get_pagina(
    session: requests.Session,
    url: str,
    params: dict[str, Any],
    pagina: int,
    timeout: int,
) -> dict | None:
    """Busca uma página da API PNCP com retry e backoff exponencial.

    Retorna None em HTTP 204 (sem mais páginas) ou após esgotar tentativas.
    """
    params_paginados = {**params, "pagina": pagina}

    for tentativa in range(1, _MAX_TENTATIVAS + 1):
        try:
            resp = session.get(url, params=params_paginados, timeout=timeout)

            if resp.status_code == 204:
                return None

            if resp.status_code == 200:
                return resp.json()

            if 400 <= resp.status_code < 500:
                logger.error(f"Erro permanente HTTP {resp.status_code} | página={pagina}")
                return None

            logger.warning(
                f"HTTP {resp.status_code} | página={pagina} | "
                f"tentativa={tentativa}/{_MAX_TENTATIVAS}"
            )

        except requests.RequestException as exc:
            logger.warning(f"Falha de rede | página={pagina} | tentativa={tentativa} | {exc}")

        if tentativa < _MAX_TENTATIVAS:
            backoff = _BACKOFF_BASE * (2 ** (tentativa - 1))
            time.sleep(backoff)

    logger.error(f"Página {pagina} abandonada após {_MAX_TENTATIVAS} tentativas")
    return None


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


def _serializar(contrato: PNCPRawContract) -> bytes:
    """Serializa um contrato para JSON em bytes (UTF-8)."""
    return contrato.model_dump_json().encode("utf-8")


def publicar(config=None) -> int:
    """Executa o ciclo completo de extração e publicação no Kafka.

    Retorna o total de mensagens publicadas com sucesso.
    """
    if config is None:
        config = carregar_config()

    producer = KafkaProducer(
        bootstrap_servers=config.kafka_bootstrap_servers,
        value_serializer=lambda v: v,
        acks="all",
        retries=3,
    )

    session = requests.Session()
    session.headers.update({"User-Agent": "Licitei-DataOps/1.0 (CESAR School ADS)"})

    url = f"{config.pncp_base_url}/contratacoes/publicacao"
    params_base = {
        "dataInicial": config.pncp_data_inicial,
        "dataFinal": config.pncp_data_final,
        "codigoModalidadeContratacao": config.pncp_codigo_modalidade,
        "tamanhoPagina": config.pncp_tamanho_pagina,
    }

    extraido_em = datetime.now(tz=timezone.utc)
    total_publicados = 0
    total_invalidos = 0
    pagina = 1

    logger.info(
        f"Iniciando extração PNCP | "
        f"modalidade={config.pncp_codigo_modalidade} | "
        f"período={config.pncp_data_inicial}→{config.pncp_data_final}"
    )

    while True:
        dados = _get_pagina(session, url, params_base, pagina, timeout=60)
        if dados is None:
            logger.info(f"Extração encerrada na página {pagina} (sem mais dados)")
            break

        registros = dados.get("data", [])
        if not registros:
            break

        publicados_na_pagina = 0
        for raw in registros:
            normalizado = _normalizar_registro(raw, extraido_em)
            if normalizado is None:
                total_invalidos += 1
                continue

            try:
                contrato = PNCPRawContract(**normalizado)
            except ValidationError as exc:
                logger.warning(
                    f"Registro inválido descartado | "
                    f"id={normalizado.get('numero_controle_pncp')} | {exc}"
                )
                total_invalidos += 1
                continue

            try:
                producer.send(config.kafka_topic_raw, value=_serializar(contrato))
                publicados_na_pagina += 1
            except KafkaError as exc:
                logger.error(f"Falha ao publicar mensagem | {exc}")

        total_publicados += publicados_na_pagina
        logger.info(
            f"Página {pagina} publicada | "
            f"{publicados_na_pagina} registros | "
            f"total acumulado={total_publicados}"
        )
        pagina += 1

    producer.flush()
    producer.close()
    session.close()

    logger.info(
        f"Publicação concluída | "
        f"total={total_publicados} mensagens | "
        f"descartados={total_invalidos} registros inválidos"
    )
    return total_publicados


if __name__ == "__main__":
    _configurar_logger()
    publicar()
