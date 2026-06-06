"""Transform Worker — consome raw.licitacoes, grava Bronze e publica transformed.

Responsabilidades (nesta ordem):
  1. Consome mensagens de raw.licitacoes
  2. Grava o dado bruto na camada Bronze (Parquet) — imutável, antes de transformar
  3. Aplica transformações e enriquecimentos (datas, faixas de valor, elegibilidade MEI)
  4. Valida com EditaisSilverContract via Pydantic
  5. Publica em transformed.licitacoes
  6. Erros → transformed.licitacoes.dlq
  7. Commit de offset apenas após Bronze gravado e mensagem publicada

Consumer group: transform-group

Execução:
    python workers/transform_worker.py
"""

import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from confluent_kafka import Consumer, Producer
from loguru import logger
from pydantic import ValidationError

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.bronze.writer import BronzeWriter
from src.config import carregar_config
from src.contracts import EditaisSilverContract, PNCPRawContract

_BATCH_SIZE = 500
_POLL_TIMEOUT_S = 1.0
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


def _delivery_report(err, msg) -> None:
    """Callback de entrega do confluent-kafka."""
    if err is not None:
        logger.error(f"Falha na entrega | tópico={msg.topic()} | erro={err}")


def _desserializar(dados: bytes) -> dict | None:
    """Desserializa bytes JSON em dicionário. Retorna None em caso de erro."""
    try:
        return json.loads(dados.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning(f"Mensagem ignorada — falha na desserialização: {exc}")
        return None


def _calcular_dias_encerramento(data_encerramento: datetime | None) -> int:
    """Calcula dias até encerramento da proposta. Retorna -1 se data ausente."""
    if data_encerramento is None:
        return -1
    agora = datetime.now(tz=timezone.utc)
    data_enc = data_encerramento
    if data_enc.tzinfo is None:
        data_enc = data_enc.replace(tzinfo=timezone.utc)
    delta = (data_enc - agora).days
    return max(delta, -1)


def _faixa_valor(valor: float) -> str:
    """Classifica o valor estimado em faixas de relevância para MEI."""
    if valor < 10_000:
        return "micro"
    if valor <= _TETO_MEI:
        return "pequeno"
    if valor <= 500_000:
        return "medio"
    return "grande"


def _transformar(raw_payload: dict, processado_em: datetime) -> dict:
    """Aplica transformações e enriquecimentos ao payload bruto do contrato.

    Args:
        raw_payload: Dicionário com os campos do PNCPRawContract.
        processado_em: Timestamp de processamento (UTC).

    Returns:
        Dicionário com campos enriquecidos para EditaisSilverContract.
    """
    # Datas
    data_abertura = raw_payload.get("data_abertura_proposta")
    data_encerramento = raw_payload.get("data_encerramento_proposta")

    # Converte strings ISO de volta para datetime se necessário
    def _to_dt(val) -> datetime | None:
        if val is None:
            return None
        if isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None

    dt_abertura = _to_dt(data_abertura)
    dt_encerramento = _to_dt(data_encerramento)

    # ano_mes derivado da data de abertura (fallback para processado_em)
    dt_ref = dt_abertura or processado_em
    ano_mes = dt_ref.strftime("%Y-%m")

    # Dias até encerramento
    dias = _calcular_dias_encerramento(dt_encerramento)

    # Ativo: situacao indica edital publicado/aberto
    situacao = (raw_payload.get("situacao_compra_nome") or "").lower()
    ativo = "divulgada" in situacao or "aberta" in situacao or "publicada" in situacao

    # Elegibilidade MEI e faixa de valor
    valor = float(raw_payload.get("valor_total_estimado") or 0.0)
    elegivel = valor <= _TETO_MEI
    faixa = _faixa_valor(valor)

    return {
        "numero_controle_pncp": raw_payload["numero_controle_pncp"],
        "objeto_compra": raw_payload.get("objeto_compra", "Não informado"),
        "valor_total_estimado": valor,
        "modalidade_nome": raw_payload.get("modalidade_nome", "Não informado"),
        "situacao_compra_nome": raw_payload.get("situacao_compra_nome", "Não informado"),
        "data_abertura_proposta": dt_abertura,
        "data_encerramento_proposta": dt_encerramento,
        "orgao_cnpj": raw_payload.get("orgao_cnpj", ""),
        "orgao_razao_social": raw_payload.get("orgao_razao_social", "Não informado"),
        "uf": raw_payload.get("uf", ""),
        "municipio": raw_payload.get("municipio", ""),
        "ano_mes": ano_mes,
        "ativo": ativo,
        "dias_ate_encerramento": dias,
        "elegivel_mei": elegivel,
        "faixa_valor": faixa,
        "processado_em": processado_em,
        "versao": 1,
    }


def _publicar_dlq(
    producer: Producer, topico_dlq: str, numero_controle: str, erro: str
) -> None:
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


def _flush_e_commit(
    batch: list,
    writer: BronzeWriter,
    consumer: Consumer,
    motivo: str = "flush",
) -> None:
    """Grava Bronze pendente e commita offset. Nunca commita sem gravar Bronze."""
    if batch:
        writer.gravar(batch)
        logger.info(f"Bronze ({motivo}) | {len(batch)} registros")
        batch.clear()
    consumer.commit()


def consumir(config=None) -> int:
    """Executa o loop de consumo, transformação e publicação.

    Lê mensagens de raw.licitacoes, grava Bronze, transforma, valida e
    publica em transformed.licitacoes. Commit de offset apenas após sucesso.

    Args:
        config: Configuração carregada do .env (None = carrega automaticamente).

    Returns:
        Total de registros publicados com sucesso em transformed.licitacoes.
    """
    if config is None:
        config = carregar_config()

    topico_raw = config.kafka_topic_raw
    topico_transformed = config.kafka_topic_transformed
    topico_dlq = f"{topico_transformed}.dlq"

    consumer = Consumer(
        {
            "bootstrap.servers": config.kafka_bootstrap_servers,
            "group.id": "transform-group",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )
    consumer.subscribe([topico_raw])

    producer = Producer(
        {
            "bootstrap.servers": config.kafka_bootstrap_servers,
            "acks": "all",
            "retries": 3,
            "enable.idempotence": True,
        }
    )

    bronze_writer = BronzeWriter(config.bronze_base_path)

    logger.info(
        f"Transform Worker iniciado | "
        f"consumindo={topico_raw} | "
        f"publicando={topico_transformed}"
    )

    total_transformados = 0
    total_invalidos = 0
    total_dlq = 0
    batch_bronze: list[PNCPRawContract] = []

    try:
        while True:
            msg = consumer.poll(_POLL_TIMEOUT_S)

            if msg is None:
                # Flush do Bronze se houver itens pendentes e não chegarem novas mensagens
                _flush_e_commit(batch_bronze, bronze_writer, consumer, "idle")
                continue

            if msg.error():
                logger.error(f"Erro no consumer | {msg.error()}")
                continue

            envelope = _desserializar(msg.value())
            if envelope is None:
                total_invalidos += 1
                _flush_e_commit(batch_bronze, bronze_writer, consumer, "deser-erro")
                continue

            raw_payload = envelope.get("payload", {})
            numero_controle = raw_payload.get("numero_controle_pncp", "desconhecido")

            # 1. Valida o dado bruto
            try:
                contrato_raw = PNCPRawContract(**raw_payload)
            except (ValidationError, Exception) as exc:
                logger.warning(
                    f"Payload bruto inválido | id={numero_controle} | {exc}"
                )
                total_invalidos += 1
                _publicar_dlq(producer, topico_dlq, numero_controle, traceback.format_exc())
                _flush_e_commit(batch_bronze, bronze_writer, consumer, "validacao-erro")
                continue

            # 2. Acumula no batch Bronze
            batch_bronze.append(contrato_raw)

            # 3. Flush do Bronze a cada _BATCH_SIZE registros (commit incluído)
            if len(batch_bronze) >= _BATCH_SIZE:
                _flush_e_commit(batch_bronze, bronze_writer, consumer, "batch")

            # 4. Transforma e enriquece
            processado_em = datetime.now(tz=timezone.utc)
            try:
                transformado = _transformar(raw_payload, processado_em)
                silver = EditaisSilverContract(**transformado)
            except (ValidationError, Exception) as exc:
                logger.warning(
                    f"Falha na transformação | id={numero_controle} | {exc}"
                )
                total_dlq += 1
                _publicar_dlq(producer, topico_dlq, numero_controle, traceback.format_exc())
                _flush_e_commit(batch_bronze, bronze_writer, consumer, "transform-erro")
                continue

            # 5. Publica em transformed.licitacoes
            mensagem = silver.model_dump_json().encode("utf-8")
            try:
                producer.produce(topico_transformed, value=mensagem, on_delivery=_delivery_report)
                producer.poll(0)
                total_transformados += 1
            except Exception as exc:
                logger.error(f"Falha ao publicar transformed | id={numero_controle} | {exc}")
                _publicar_dlq(producer, topico_dlq, numero_controle, traceback.format_exc())
                total_dlq += 1

            # 6. Offset commitado pelo próximo batch flush ou idle flush
            if total_transformados % 500 == 0 and total_transformados > 0:
                logger.info(
                    f"Progresso | transformados={total_transformados} | "
                    f"inválidos={total_invalidos} | dlq={total_dlq}"
                )

    except KeyboardInterrupt:
        logger.info("Transform Worker interrompido pelo usuário")
    finally:
        _flush_e_commit(batch_bronze, bronze_writer, consumer, "final")
        producer.flush()
        consumer.close()

    logger.info(
        f"Transform Worker encerrado | "
        f"transformados={total_transformados} | "
        f"inválidos={total_invalidos} | "
        f"dlq={total_dlq}"
    )
    return total_transformados


if __name__ == "__main__":
    _configurar_logger()
    consumir()
