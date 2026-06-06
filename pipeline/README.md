# Pipeline Licitei — Arquitetura Medallion Unificada

**Projeto Integrador · CESAR School · ADS 5º período**  
Disciplinas: Eletiva Eng. de Dados e Big Data + Fundamentos de DataOps

---

## Arquitetura

```
API PNCP → Extract Worker → raw.licitacoes → Transform Worker → transformed.licitacoes → Load Worker
                                ↓                    ↓                                         ↓
                            raw.dlq           Bronze (Parquet)                       Silver (Iceberg)
                                             transformed.dlq                         SQLite (upsert)
                                                                                     Gold (MongoDB)
```

**Infraestrutura Kafka:** Zookeeper + `confluentinc/cp-kafka:7.5.0`  
**Client Python:** `confluent-kafka==2.3.0`

---

## Tópicos Kafka

| Tópico | Producer | Consumer |
|---|---|---|
| `raw.licitacoes` | Extract Worker | Transform Worker |
| `raw.licitacoes.dlq` | Extract Worker (erro) | Monitoramento |
| `transformed.licitacoes` | Transform Worker | Load Worker |
| `transformed.licitacoes.dlq` | Transform Worker (erro) | Monitoramento |

---

## Setup

```bash
cd pipeline
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas credenciais
```

---

## Execução manual

```bash
# 1. Subir Kafka
cd kafka && docker compose up -d && cd ..

# 2. Iniciar Transform Worker (Terminal 1 — fica em loop aguardando mensagens)
python workers/transform_worker.py

# 3. Iniciar Load Worker (Terminal 2 — fica em loop aguardando mensagens)
python workers/load_worker.py

# 4. Disparar extração (Terminal 3 — inicia o pipeline)
python workers/extract_worker.py --dataInicial 20260601 --dataFinal 20260602

# 5. Dashboard
streamlit run dashboard/app.py
```

---

## Execução orquestrada (Prefect)

```bash
# Execução única
python orchestration/flows.py

# Agendamento diário às 6h UTC
python orchestration/flows.py --serve
```

---

## Camadas de dados

| Camada | Tecnologia | Localização | Semântica |
|---|---|---|---|
| **Bronze** | Parquet (Snappy) | `data/bronze/contratacoes/year=…/month=…/day=…/` | Dado bruto imutável |
| **Silver** | PyIceberg | `data/iceberg/` | ACID, dedup por `numero_controle_pncp`, time travel |
| **SQLite** | SQLite | `data/licitacoes.db` | Upsert relacional (requisito Eng. de Dados) |
| **Gold** | MongoDB Atlas | 5 coleções `kpi_*` | KPIs agregados para backend e dashboard |

### Coleções Gold

| Coleção | Conteúdo |
|---|---|
| `contratos_ativos` | Contratos individuais enriquecidos — coleção principal consumida pelo backend e MCP |
| `kpi_por_uf` | Total de editais e valor médio por UF |
| `kpi_por_modalidade` | Contagem e valor total por modalidade (substitui `kpi_por_cnae` — campo CNAE ausente na API PNCP) |
| `kpi_prazos` | Editais encerrando em 7, 15 e 30 dias |
| `kpi_elegibilidade` | Editais dentro do teto MEI (R$81k) |
| `kpi_dashboard` | Totais gerais: count, valor, órgãos, ativos |

> Os KPIs são recalculados via agregação sobre a coleção `contratos_ativos` completa após cada ciclo de ingestão (`agregar_do_banco()`), garantindo que reflitam o dataset total e não apenas o último batch.

---

## Testes

```bash
cd pipeline
pytest tests/ -v
```

---

## Variáveis de ambiente

Ver `.env.example` para a lista completa. Variáveis obrigatórias:
- `KAFKA_BOOTSTRAP_SERVERS`
- `PNCP_CODIGO_MODALIDADE`
- `PNCP_DATA_INICIAL` / `PNCP_DATA_FINAL`
- `BRONZE_BASE_PATH`
- `ICEBERG_CATALOG_PATH`
- `SQLITE_DB_PATH`
- `MONGO_URI` / `MONGO_DB_NAME`

---

## Histórico das sprints anteriores

As implementações das sprints 1 e 2 estão preservadas no histórico git:

- **Sprint 1 — ETL + PySpark + Dashboard:** commit `6eb46d1` e anteriores (pasta `etl/`)
- **Sprint 2 — Kafka Producer/Consumer + Bronze Parquet:** commit `d039770` e anteriores (pasta `dataops/`)

```bash
git show HEAD~5  # navega pelo histórico
git log --oneline etl/  # commits da pasta etl/
```

---

## Estrutura

```
pipeline/
├── workers/
│   ├── extract_worker.py      # Producer: PNCP → raw.licitacoes
│   ├── transform_worker.py    # Consumer+Producer: raw → Bronze + transformed
│   └── load_worker.py         # Consumer: transformed → Silver + SQLite + Gold
├── kafka/
│   └── docker-compose.yml     # Zookeeper + Kafka 7.5.0
├── src/
│   ├── config.py              # Variáveis de ambiente unificadas
│   ├── contracts.py           # Contratos Pydantic (Raw, Silver, 5x Gold)
│   ├── ingestion/extractor.py # PNCPExtractor com paginação e retry
│   ├── bronze/writer.py       # Parquet particionado por data
│   ├── silver/transformer.py  # PyIceberg ACID + dedup
│   └── gold/loader.py         # 5 coleções KPI no MongoDB
├── orchestration/flows.py     # Prefect: 3 tasks sequenciais, cron 6h UTC
├── dashboard/app.py           # Streamlit lendo Gold MongoDB
├── tests/                     # Testes unitários por camada
├── requirements.txt
└── .env.example
```
