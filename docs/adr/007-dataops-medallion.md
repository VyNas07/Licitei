# ADR 007 — Arquitetura Medallion com Kafka para o DataOps

**Status:** Aceito
**Data:** 2026-05-11
**Responsável:** Vyktor Nascimento

---

## Contexto

O ETL existente (`etl/`) opera em modo batch: extrai dados da API PNCP, normaliza e carrega
diretamente no MongoDB Atlas em um único pipeline síncrono. Essa abordagem atende ao Track 1
de Engenharia de Dados, mas não satisfaz os requisitos da disciplina de **Fundamentos de Data Ops**,
que exige:

- Ingestão via mensageria (produtor/consumidor desacoplados)
- Armazenamento em camadas com responsabilidades distintas (Bronze/Silver/Gold)
- Contratos de dados explícitos e validação em cada camada
- Base para reprocessamento sem perda do dado original
- Orquestração observável (Prefect) com logs de validação por camada

O módulo `dataops/` foi criado para implementar esses requisitos de forma independente do ETL,
coexistindo no mesmo monorepo sem interferência.

---

## Decisão

Adotar a **arquitetura Medallion** com **Apache Kafka** como camada de ingestão:

```
API PNCP → Kafka (editais_raw) → Bronze (Parquet) → Silver (Iceberg) → Gold (MongoDB)
```

### Kafka em modo KRaft (sem Zookeeper)

- **Imagem:** `apache/kafka:latest` via Docker Compose
- **Modo:** KRaft (Kafka Raft) — broker único, sem dependência de Zookeeper
- **Topologia:** single broker para desenvolvimento; escalável para multi-broker em produção
- **Tópico:** `editais_raw` (criado automaticamente na primeira mensagem)
- **Semântica:** at-least-once no consumer (commit manual após gravação bem-sucedida)

### Camada Bronze — Parquet particionado

- **Storage:** sistema de arquivos local (`data/bronze/contratacoes/year=Y/month=M/day=D/`)
- **Formato:** Apache Parquet com compressão Snappy via PyArrow
- **Imutabilidade:** arquivos nunca sobrescritos — sufixo de timestamp garante unicidade
- **Particionamento:** por data de extração (`extraido_em`) — facilita consultas por período

### Camada Silver — Apache Iceberg *(Sprint 3)*

- **Storage:** PyIceberg com catálogo local (SQLite) para desenvolvimento
- **Garantias:** ACID, time travel, deduplicação idempotente por `numero_controle_pncp`
- **Contrato:** `EditaisSilverContract` validado via Pydantic antes da escrita

### Camada Gold — MongoDB Atlas *(Sprint 3)*

- **Storage:** coleções MongoDB compartilhadas com o ETL (mesma instância Atlas)
- **Coleções:** `kpi_por_uf`, `kpi_por_cnae`, `kpi_prazos`, `kpi_elegibilidade`, `kpi_dashboard`
- **Contrato:** `EditaisGoldKPI` validado via Pydantic antes da escrita

### Contratos de dados — Pydantic v2

Cada camada tem um modelo Pydantic que valida o dado na entrada. Erros de validação são
logados e o registro é descartado — nunca silenciado.

---

## Consequências

**Positivas:**
- Dado raw preservado indefinidamente na Bronze — qualquer bug na transformação pode ser corrigido
  e reprocessado sem nova extração da API
- Producer e Consumer são desacoplados — podem escalar independentemente
- Contratos Pydantic tornam explícito o schema em cada camada, facilitando testes e debugging
- Time travel na Silver (Sprint 3) permite auditar o estado dos dados em qualquer data passada

**Negativas:**
- Adiciona Docker como dependência de desenvolvimento (Kafka precisa estar rodando)
- Maior complexidade operacional vs. o ETL batch simples
- Kafka local não persiste dados entre `docker compose down` sem volume configurado

**Mitigações:**
- `docker-compose.yml` já está versionado — setup é um único comando
- O ETL batch (`etl/`) continua operacional e independente; DataOps é aditivo
- Volume Docker (`kafka_data`) configurado para persistir mensagens entre reinicios
