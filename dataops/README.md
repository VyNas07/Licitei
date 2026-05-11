# DataOps — Track 1B

> Pipeline de ingestão em streaming e arquitetura Medallion (Bronze → Silver → Gold) do Licitei.

Parte do monorepo [Licitei](../README.md) · CESAR School — ADS 5º período · Grupo 10

**Responsável:** Vyktor Nascimento
**Disciplina:** Fundamentos de Data Ops

---

## Visão geral

O módulo `dataops/` implementa a arquitetura Medallion completa, paralela ao ETL batch (`etl/`).
Em vez de carregar dados diretamente no MongoDB, o dado percorre três camadas com responsabilidades distintas:

| Camada | Storage | Ferramenta | Papel |
| --- | --- | --- | --- |
| **Bronze** | Parquet (local, particionado por data) | PyArrow | Dado bruto da PNCP, imutável — base para reprocessamento |
| **Silver** | Apache Iceberg | PyIceberg | Dado limpo, tipado, deduplicado — ACID e time travel *(Sprint 3)* |
| **Gold** | MongoDB Atlas | pymongo | KPIs agregados prontos para o app e o dashboard *(Sprint 3)* |

---

## Arquitetura

```
API PNCP
  └─► Producer (src/producer.py)
        └─► Kafka (tópico: editais_raw)
              └─► Consumer (src/consumer.py)
                    └─► Bronze (data/bronze/**/*.parquet)
                          └─► Silver (PyIceberg — Sprint 3)
                                └─► Gold (MongoDB Atlas — Sprint 3)
```

**Contratos de dados** (`src/contracts.py`) validam cada registro em todas as camadas via Pydantic:
- `PNCPRawContract` — dado bruto que circula no Kafka e é gravado na Bronze
- `EditaisSilverContract` — dado enriquecido na Silver *(Sprint 3)*
- `EditaisGoldKPI` — KPI agregado gravado no Gold *(Sprint 3)*

---

## Pré-requisitos

- Python 3.11+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) em execução

---

## Setup

```bash
# 1. Entrar no diretório
cd dataops

# 2. Criar e ativar o ambiente virtual
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/Mac

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env: ajuste PNCP_DATA_INICIAL e PNCP_DATA_FINAL

# 5. Subir o Kafka
docker compose up -d

# Aguarde ~30s e verifique o status
docker compose ps
```

---

## Execução

**Producer** — extrai da API PNCP e publica no Kafka:

```bash
python -m src.producer
```

**Consumer** — lê o Kafka e grava na camada Bronze (Parquet particionado):

```bash
python -m src.consumer
```

**Validar Bronze gerado:**

```bash
python -c "
import pyarrow.parquet as pq, glob
arquivos = glob.glob('data/bronze/**/*.parquet', recursive=True)
print(f'{len(arquivos)} arquivo(s) encontrado(s)')
t = pq.read_table(arquivos[0])
print(t.schema)
print(f'{len(t)} linhas')
"
```

---

## Variáveis de ambiente (`dataops/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `KAFKA_BOOTSTRAP_SERVERS` | Sim | Ex: `localhost:9092` |
| `KAFKA_TOPIC_RAW` | Sim | Ex: `editais_raw` |
| `PNCP_BASE_URL` | Sim | `https://pncp.gov.br/api/consulta/v1` |
| `PNCP_CODIGO_MODALIDADE` | Sim | Ex: `8` (Dispensa de Licitação) |
| `PNCP_DATA_INICIAL` | Sim | Ex: `20260101` (formato YYYYMMDD) |
| `PNCP_DATA_FINAL` | Sim | Ex: `20260511` |
| `BRONZE_BASE_PATH` | Sim | Caminho local. Ex: `data/bronze` |
| `PNCP_TAMANHO_PAGINA` | Não | Padrão: `50` (máx. da API) |

---

## Estrutura

```text
dataops/
├── docker-compose.yml          # Kafka KRaft (apache/kafka, sem Zookeeper)
├── requirements.txt
├── .env.example
└── src/
    ├── __init__.py
    ├── config.py               # Carregamento e validação do .env
    ├── contracts.py            # Pydantic: PNCPRawContract, Silver, Gold
    ├── producer.py             # PNCP → Kafka (editais_raw)
    ├── consumer.py             # Kafka → Bronze (Parquet, at-least-once)
    └── bronze/
        ├── __init__.py
        └── loader.py           # Grava Parquet particionado por year/month/day
```

---

## Roadmap

| Sprint | Entrega |
| --- | --- |
| **2** | ✅ Estrutura + Docker Compose + contratos Pydantic + Producer + Consumer + Bronze |
| **3** | Silver com PyIceberg + deduplicação idempotente |
| **3** | Gold no MongoDB com 5 coleções de KPIs |
| **4** | Prefect orquestrando Bronze → Silver → Gold |
| **4** | Observabilidade + README final |
