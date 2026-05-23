"""Transformação PySpark — lê MongoDB Atlas e gera dados tabulares estruturados.

Etapa adicional ao pipeline ETL existente (Extract → Transform → Load).
Lê os documentos já carregados na coleção MongoDB, processa com Apache Spark
e salva o resultado em formato Parquet (Silver layer), pronto para análise.

Requisitos:
    - Java JDK 11 ou 17 instalado e disponível no PATH
    - pyspark instalado (pip install -r requirements.txt)
    - Na primeira execução, o Spark baixa o MongoDB Connector do Maven (~5 min)

Execução:
    python -m src.etl.spark_transform
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import BooleanType, DoubleType, IntegerType, StringType, TimestampType

# Conector oficial MongoDB ↔ Apache Spark (compatível com Spark 3.x)
_MONGO_CONNECTOR = "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0"

# Diretório hadoop/bin com winutils.exe — obrigatório no Windows
# parents[2] = etl/  (spark_transform.py está em etl/src/etl/)
_HADOOP_HOME = Path(__file__).resolve().parents[2] / "hadoop"


def _configurar_hadoop_windows() -> None:
    """Configura HADOOP_HOME no Windows para evitar erro 'winutils.exe not found'.

    O PySpark depende de utilitários nativos do Hadoop para gerenciar arquivos
    temporários no Windows. O winutils.exe é um substituto leve para esses binários.
    Esta função é no-op em sistemas não-Windows.
    """
    if sys.platform != "win32":
        return

    winutils = _HADOOP_HOME / "bin" / "winutils.exe"
    if not winutils.exists():
        logger.critical(
            f"winutils.exe não encontrado em '{winutils}'. "
            "O PySpark não consegue inicializar no Windows sem ele."
        )
        raise SystemExit(1)

    hadoop_bin = str(_HADOOP_HOME / "bin")
    os.environ["HADOOP_HOME"] = str(_HADOOP_HOME)
    os.environ["hadoop.home.dir"] = str(_HADOOP_HOME)
    # Adiciona hadoop/bin ao PATH para o JVM encontrar hadoop.dll via System.loadLibrary
    os.environ["PATH"] = hadoop_bin + os.pathsep + os.environ.get("PATH", "")
    logger.debug(f"HADOOP_HOME configurado: {_HADOOP_HOME}")


def _configurar_logger() -> None:
    """Configura loguru com saída colorida no console."""
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
        colorize=True,
    )


def criar_sessao_spark(mongo_uri: str, db_name: str) -> SparkSession:
    """Cria e configura a SparkSession com o MongoDB Spark Connector.

    O conector é baixado automaticamente do Maven Central na primeira execução
    e mantido em cache local (~/.ivy2/) nas execuções seguintes.

    Args:
        mongo_uri: URI de conexão MongoDB Atlas (mongodb+srv://...).
        db_name: Nome do banco de dados no MongoDB.

    Returns:
        SparkSession configurada e pronta para uso.
    """
    _configurar_hadoop_windows()
    logger.info("Inicializando SparkSession com MongoDB Connector...")
    spark = (
        SparkSession.builder
        .appName("Licitei-PySpark-Silver")
        .config("spark.jars.packages", _MONGO_CONNECTOR)
        .config("spark.mongodb.read.connection.uri", mongo_uri)
        .config("spark.mongodb.read.database", db_name)
        # Reduz verbosidade dos logs internos do Spark
        .config("spark.ui.showConsoleProgress", "false")
        .getOrCreate()
    )
    # Silencia logs INFO do Java/Spark que poluem o terminal
    spark.sparkContext.setLogLevel("WARN")
    logger.info("SparkSession criada com sucesso")
    return spark


def ler_contratacoes(spark: SparkSession, collection: str):
    """Lê a coleção de contratações do MongoDB Atlas como DataFrame Spark.

    O MongoDB Connector infere o schema automaticamente a partir dos documentos.
    Tipos MongoDB (ObjectId, ISODate) são convertidos para tipos Spark equivalentes.

    Args:
        spark: SparkSession ativa.
        collection: Nome da coleção no MongoDB (ex: 'contratacoes').

    Returns:
        DataFrame Spark com os documentos da coleção.
    """
    logger.info(f"Lendo coleção '{collection}' do MongoDB Atlas...")
    df = (
        spark.read
        .format("mongodb")
        .option("collection", collection)
        .load()
    )
    total = df.count()
    logger.info(f"Lidos {total} documentos da coleção '{collection}'")
    return df


def transformar(df):
    """Aplica transformações: schema explícito, filtragem e colunas derivadas.

    Etapas:
    1. Seleciona apenas os campos relevantes e força tipos explícitos (cast)
    2. Descarta registros sem chave primária (numero_controle_pncp nulo)
    3. Deriva 3 novas colunas de negócio:
       - elegivel_mei: se o valor está dentro do teto MEI (R$ 80k)
       - faixa_valor: categorização em 3 faixas de valor
       - dias_ate_encerramento: dias restantes até o prazo de proposta

    Args:
        df: DataFrame bruto lido do MongoDB.

    Returns:
        DataFrame transformado com schema estruturado e colunas derivadas.
    """
    logger.info("Aplicando transformações ao DataFrame...")

    df_silver = (
        df
        # 1. Seleciona e força schema explícito
        .select(
            F.col("numero_controle_pncp").cast(StringType()).alias("numero_controle_pncp"),
            F.col("objeto_compra").cast(StringType()).alias("objeto_compra"),
            F.col("valor_total_estimado").cast(DoubleType()).alias("valor_total_estimado"),
            F.col("modalidade_nome").cast(StringType()).alias("modalidade_nome"),
            F.col("situacao_compra_nome").cast(StringType()).alias("situacao_compra_nome"),
            F.col("orgao_cnpj").cast(StringType()).alias("orgao_cnpj"),
            F.col("orgao_razao_social").cast(StringType()).alias("orgao_razao_social"),
            F.col("uf").cast(StringType()).alias("uf"),
            F.col("municipio").cast(StringType()).alias("municipio"),
            F.col("data_abertura_proposta").cast(TimestampType()).alias("data_abertura_proposta"),
            F.col("data_encerramento_proposta").cast(TimestampType()).alias("data_encerramento_proposta"),
        )
        # 2. Descarta registros sem chave primária
        .filter(F.col("numero_controle_pncp").isNotNull())

        # 3a. Coluna derivada: elegibilidade MEI (teto R$ 80.000)
        .withColumn(
            "elegivel_mei",
            F.when(
                F.col("valor_total_estimado") <= 80_000, True
            ).otherwise(False).cast(BooleanType()),
        )

        # 3b. Coluna derivada: faixa de valor
        .withColumn(
            "faixa_valor",
            F.when(F.col("valor_total_estimado") <= 40_000, "Até R$40k")
             .when(F.col("valor_total_estimado") <= 80_000, "R$40k–R$80k")
             .otherwise("Acima de R$80k")
             .cast(StringType()),
        )

        # 3c. Coluna derivada: dias restantes até encerramento da proposta
        .withColumn(
            "dias_ate_encerramento",
            F.datediff(
                F.col("data_encerramento_proposta"),
                F.current_date(),
            ).cast(IntegerType()),
        )
    )

    validos = df_silver.count()
    logger.info(f"Transformação concluída | {validos} registros válidos no DataFrame Silver")
    return df_silver


def salvar_parquet(df, caminho: str) -> None:
    """Salva o DataFrame transformado em formato Parquet.

    Usa mode 'overwrite' para garantir idempotência — reexecutar o script
    sobrescreve o resultado anterior sem duplicar dados.

    Args:
        df: DataFrame Spark transformado.
        caminho: Caminho de destino do Parquet (ex: 'data/silver/contratacoes').
    """
    Path(caminho).parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Salvando DataFrame em Parquet | destino={caminho}")
    df.write.mode("overwrite").parquet(caminho)
    logger.info(f"Parquet salvo com sucesso em '{caminho}'")


def executar(mongo_uri: str, db_name: str, collection: str, output_path: str) -> None:
    """Orquestra o pipeline PySpark completo: leitura → transformação → saída.

    Args:
        mongo_uri: URI de conexão MongoDB Atlas.
        db_name: Nome do banco de dados.
        collection: Nome da coleção a processar.
        output_path: Caminho de saída do Parquet.
    """
    spark = criar_sessao_spark(mongo_uri, db_name)

    try:
        # Leitura
        df_raw = ler_contratacoes(spark, collection)

        # Transformação
        df_silver = transformar(df_raw)

        # Exibe schema e amostra no terminal (saída tabular)
        logger.info("Schema do DataFrame Silver:")
        df_silver.printSchema()

        logger.info("Amostra (20 registros):")
        df_silver.show(20, truncate=50)

        # Persiste em Parquet
        salvar_parquet(df_silver, output_path)

    finally:
        spark.stop()
        logger.info("SparkSession encerrada")


def main() -> None:
    """Ponto de entrada: carrega configuração do .env e executa o pipeline PySpark."""
    _configurar_logger()
    load_dotenv()

    # Variáveis obrigatórias (reaproveitadas do pipeline ETL existente)
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    collection = os.getenv("MONGO_COLLECTION")

    for nome, valor in [("MONGO_URI", mongo_uri), ("MONGO_DB_NAME", db_name), ("MONGO_COLLECTION", collection)]:
        if not valor:
            logger.critical(
                f"Variável de ambiente '{nome}' não definida. "
                f"Copie .env.example para .env e preencha os valores."
            )
            raise SystemExit(1)

    # Caminho de saída do Parquet (variável opcional com default)
    output_path = os.getenv("SPARK_OUTPUT_PATH", "data/silver/contratacoes")

    logger.info("=" * 60)
    logger.info("Pipeline PySpark — Licitei Silver Layer")
    logger.info(f"  Banco    : {db_name}")
    logger.info(f"  Coleção  : {collection}")
    logger.info(f"  Saída    : {output_path}")
    logger.info("=" * 60)

    executar(
        mongo_uri=mongo_uri,
        db_name=db_name,
        collection=collection,
        output_path=output_path,
    )

    logger.info("=" * 60)
    logger.info("Pipeline PySpark concluído com sucesso")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
