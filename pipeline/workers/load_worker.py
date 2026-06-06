"""Load Worker — consome transformed.licitacoes e persiste em Silver, SQLite e Gold.

Responsabilidades:
  1. Consome mensagens de transformed.licitacoes
  2. Silver → PyIceberg (ACID, dedup por numero_controle_pncp, time travel)
  3. SQLite → upsert por numero_controle_pncp (requisito Eng. de Dados)
  4. Gold  → MongoDB Atlas (5 coleções KPIs)
  5. Commit de offset apenas após todas as persistências bem-sucedidas

Consumer group: load-group

Execução:
    python workers/load_worker.py
"""

import json
import sqlite3
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from confluent_kafka import Consumer, Producer
from loguru import logger

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.config import carregar_config
from src.contracts import EditaisSilverContract
from src.gold.loader import GoldLoader
from src.silver.transformer import SilverTransformer

_BATCH_SIZE = 500
_POLL_TIMEOUT_S = 1.0

_DDL_LICITACOES = """
CREATE TABLE IF NOT EXISTS licitacoes (
    numero_controle_pncp  TEXT PRIMARY KEY,
    objeto_compra         TEXT,
    valor_total_estimado  REAL,
    modalidade_nome       TEXT,
    situacao_compra_nome  TEXT,
    data_abertura_proposta TEXT,
    data_encerramento_proposta TEXT,
    orgao_cnpj            TEXT,
    orgao_razao_social    TEXT,
    uf                    TEXT,
    municipio             TEXT,
    ano_mes               TEXT,
    ativo                 INTEGER,
    dias_ate_encerramento INTEGER,
    elegivel_mei          INTEGER,
    faixa_valor           TEXT,
    processado_em         TEXT,
    versao                INTEGER
);
"""


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
    """Callback de entrega do confluent-kafka (DLQ)."""
    if err is not None:
        logger.error(f"Falha na entrega DLQ | tópico={msg.topic()} | erro={err}")


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


def _inicializar_sqlite(db_path: str) -> sqlite3.Connection:
    """Cria a conexão SQLite e garante que a tabela licitacoes exista."""
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute(_DDL_LICITACOES)
    conn.commit()
    logger.info(f"SQLite inicializado | path={db_path}")
    return conn


def _upsert_sqlite(conn: sqlite3.Connection, registros: list[EditaisSilverContract]) -> int:
    """Upsert em lote na tabela licitacoes do SQLite.

    Args:
        conn: Conexão SQLite ativa.
        registros: Lista de contratos Silver a persistir.

    Returns:
        Quantidade de linhas afetadas.
    """
    def _to_iso(dt: datetime | None) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()

    linhas = [
        (
            r.numero_controle_pncp,
            r.objeto_compra,
            r.valor_total_estimado,
            r.modalidade_nome,
            r.situacao_compra_nome,
            _to_iso(r.data_abertura_proposta),
            _to_iso(r.data_encerramento_proposta),
            r.orgao_cnpj,
            r.orgao_razao_social,
            r.uf,
            r.municipio,
            r.ano_mes,
            int(r.ativo),
            r.dias_ate_encerramento,
            int(r.elegivel_mei),
            r.faixa_valor,
            _to_iso(r.processado_em),
            r.versao,
        )
        for r in registros
    ]

    sql = """
        INSERT OR REPLACE INTO licitacoes (
            numero_controle_pncp, objeto_compra, valor_total_estimado,
            modalidade_nome, situacao_compra_nome, data_abertura_proposta,
            data_encerramento_proposta, orgao_cnpj, orgao_razao_social,
            uf, municipio, ano_mes, ativo, dias_ate_encerramento,
            elegivel_mei, faixa_valor, processado_em, versao
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """
    conn.executemany(sql, linhas)
    conn.commit()
    return len(linhas)


def _parsear_mensagem(
    msg,
    producer: Producer,
    topico_dlq: str,
) -> EditaisSilverContract | None:
    """Parseia e valida uma mensagem Kafka. Publica no DLQ em caso de erro.

    Args:
        msg: Mensagem confluent-kafka.
        producer: Producer para envio ao DLQ.
        topico_dlq: Nome do tópico DLQ.

    Returns:
        Contrato Silver validado, ou None se a mensagem for inválida.
    """
    numero_controle = "desconhecido"
    try:
        dados = json.loads(msg.value().decode("utf-8"))
        numero_controle = dados.get("numero_controle_pncp", "desconhecido")
        return EditaisSilverContract(**dados)
    except Exception as exc:
        logger.warning(f"Mensagem inválida descartada | id={numero_controle} | {exc}")
        _publicar_dlq(producer, topico_dlq, numero_controle, traceback.format_exc())
        return None


def consumir(config=None) -> int:
    """Executa o loop de consumo e persistência nas três camadas.

    Args:
        config: Configuração carregada do .env (None = carrega automaticamente).

    Returns:
        Total de registros persistidos com sucesso.
    """
    if config is None:
        config = carregar_config()

    topico_transformed = config.kafka_topic_transformed
    topico_dlq = f"{topico_transformed}.dlq"

    consumer = Consumer(
        {
            "bootstrap.servers": config.kafka_bootstrap_servers,
            "group.id": "load-group",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )
    consumer.subscribe([topico_transformed])

    producer = Producer({"bootstrap.servers": config.kafka_bootstrap_servers, "acks": "all"})

    silver = SilverTransformer(config.iceberg_catalog_path)
    gold = GoldLoader(mongo_uri=config.mongo_uri, db_name=config.mongo_db_name)
    sqlite_conn = _inicializar_sqlite(config.sqlite_db_path)

    logger.info(
        f"Load Worker iniciado | "
        f"consumindo={topico_transformed} | "
        f"silver=PyIceberg | sqlite={config.sqlite_db_path} | "
        f"gold=MongoDB({config.mongo_db_name})"
    )

    total_carregados = 0
    total_invalidos = 0
    total_dlq = 0
    batch: list[EditaisSilverContract] = []

    def _persistir_batch() -> None:
        nonlocal total_carregados
        if not batch:
            return

        silver.persistir(batch)

        n_sqlite = _upsert_sqlite(sqlite_conn, batch)
        logger.info(f"SQLite upsert | {n_sqlite} registros")

        gold.carregar(batch)

        total_carregados += len(batch)
        batch.clear()
        consumer.commit()

    try:
        while True:
            msg = consumer.poll(_POLL_TIMEOUT_S)

            if msg is None:
                if batch:
                    _persistir_batch()
                    logger.info(f"Batch (idle flush) persistido | total={total_carregados}")
                    gold.agregar_do_banco()
                continue

            if msg.error():
                logger.error(f"Erro no consumer | {msg.error()}")
                continue

            contract = _parsear_mensagem(msg, producer, topico_dlq)
            if contract is None:
                total_invalidos += 1
                consumer.commit()
                continue

            batch.append(contract)

            if len(batch) >= _BATCH_SIZE:
                _persistir_batch()
                logger.info(
                    f"Batch ({_BATCH_SIZE}) persistido | "
                    f"total={total_carregados} | "
                    f"inválidos={total_invalidos}"
                )

    except KeyboardInterrupt:
        logger.info("Load Worker interrompido pelo usuário")
    finally:
        if batch:
            _persistir_batch()
            logger.info(f"Batch final persistido | total={total_carregados}")
            gold.agregar_do_banco()
        producer.flush()
        consumer.close()
        sqlite_conn.close()
        gold.fechar()

    logger.info(
        f"Load Worker encerrado | "
        f"carregados={total_carregados} | "
        f"inválidos={total_invalidos} | "
        f"dlq={total_dlq}"
    )
    return total_carregados


if __name__ == "__main__":
    _configurar_logger()
    consumir()
