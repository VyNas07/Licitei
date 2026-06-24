<div align="center">

<img src="mobile/assets/images/licitei-logo.png" alt="Licitei" width="180" />

# Licitei

**Plataforma que conecta MEIs às licitações públicas do governo federal.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Bun](https://img.shields.io/badge/Bun-1.x-F9F1E1?logo=bun&logoColor=black)](https://bun.sh)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-Streaming-231F20?logo=apache-kafka&logoColor=white)](https://kafka.apache.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

*Projeto Integrador · CESAR School · ADS 5º período · Grupo 10*

</div>

---

## O problema

Participar de licitações públicas é burocrático e pouco acessível para pequenos empreendedores. As oportunidades existem — mas estão espalhadas em portais complexos, com linguagem técnica e sem filtros práticos para quem está começando.

## A solução

O **Licitei** consome dados em tempo real da API pública do [PNCP (Portal Nacional de Contratações Públicas)](https://www.gov.br/pncp), processa e organiza essas informações e as entrega via aplicativo mobile com um assistente de IA integrado — tornando as licitações visíveis e alcançáveis para MEIs.

---

## Screenshots

![Home — Oportunidades e Chat com LicIA](docs/assets/screenshots/home-chat.png)

![Minhas Disputas](docs/assets/screenshots/disputas.png)

---

## Arquitetura

![Arquitetura geral do Licitei](docs/assets/diagrams/licitei_system_overview.svg)

---

## Funcionalidades

| Funcionalidade | Descrição |
| --- | --- |
| Oportunidades personalizadas | Filtra editais pelo CNAE do MEI com teto de R$81k |
| Busca e filtros | Pesquisa por texto, UF, município, valor e categoria |
| Assistente LicIA | Chat com IA que interpreta editais em linguagem simples |
| Checklist de habilitação | Documentos necessários gerados automaticamente por edital |
| Gestão de participações | Acompanhe o status de cada licitação que você está disputando |
| Alertas de prazo | Notificações de editais encerrando em 7, 15 ou 30 dias |
| Pipeline automatizado | Ingestão diária de dados do PNCP com Prefect às 6h UTC |
| Dashboard de monitoramento | Streamlit com KPIs da pipeline em tempo real |

---

## Subprojetos

| Subprojeto | Descrição | Stack | README |
| --- | --- | --- | --- |
| `pipeline/` | ETL Kafka + Medallion (Bronze → Silver → Gold) | Python, Kafka, Parquet, Iceberg, MongoDB | [pipeline/README.md](pipeline/README.md) |
| `mcp/` | Servidor MCP + Agente LicIA | Python, FastMCP, LangGraph, Groq | [mcp/README.md](mcp/README.md) |
| `backend/` | API REST com autenticação JWT | TypeScript, Bun, Elysia, Supabase | [backend/README.md](backend/README.md) |
| `mobile/` | App React Native | Expo SDK 54, TypeScript, Axios | [mobile/README.md](mobile/README.md) |

---

## Stack completa

| Camada | Tecnologias |
| --- | --- |
| **Mobile** | React Native · Expo Router v6 · TypeScript · Supabase JS |
| **Backend** | Bun · Elysia · TypeScript · MongoDB Atlas · Supabase |
| **Pipeline** | Python · Apache Kafka · Parquet · Apache Iceberg · Prefect · Pydantic |
| **IA / MCP** | Python · FastMCP · LangGraph · LangChain · Groq · SQLite |
| **Banco de dados** | MongoDB Atlas · Supabase (Postgres) · SQLite |
| **Infra** | Docker · Railway (staging) |

---

## Como começar

| Subprojeto | Instruções |
| --- | --- |
| Backend + Mobile (setup local) | [SETUP.md](SETUP.md) |
| Pipeline (Kafka + Medallion) | [pipeline/README.md](pipeline/README.md) |
| Backend (API REST) | [backend/README.md](backend/README.md) |
| App Mobile (Expo) | [mobile/README.md](mobile/README.md) |
| MCP / Assistente LicIA | [mcp/README.md](mcp/README.md) |

---

## Time

| Membro | Papel |
| --- | --- |
| [Vyktor Fellype](https://www.linkedin.com/in/vyktor-nascimento/) | Porta-Voz · Gerente de Projeto · Pipeline · MCP |
| Pierre Costa | Guardião dos Dados · Track 5 — Negócios |
| Mariana Ferreira | Track 4 — Segurança |
| Pedro Diniz | Track 2 — Backend |
| Thaíssa Fernandes | Track 2 — Artefatos · Track 3 — MCP |
| Ylson dos Santos | Track 2 — Mobile · Track 5 — Negócios |
| Yuri Ricardo | Track 2 — Mobile |
| Júlia Veríssimo | Track 2 — Artefatos Mobile |

---

<div align="center">

Desenvolvido na CESAR School · ADS 5º período · Grupo 10  
Dados extraídos da API pública do [PNCP — Portal Nacional de Contratações Públicas](https://www.gov.br/pncp)

</div>
