# Licitei

> Plataforma que simplifica o acesso de Microempreendedores Individuais (MEIs) às licitações públicas governamentais.

Projeto Integrador — 5º período de Análise e Desenvolvimento de Sistemas | [CESAR School](https://www.cesar.school/) | Grupo 10

---

## O problema

Participar de licitações públicas é burocrático e pouco acessível para pequenos empreendedores. As oportunidades existem — mas estão fragmentadas em portais complexos, com linguagem técnica e sem filtros práticos para quem está começando.

## A solução

O **Licitei** consome dados em tempo real da API pública do [PNCP (Portal Nacional de Contratações Públicas)](https://www.gov.br/pncp), processa e organiza essas informações e as entrega via aplicativo mobile com um assistente de IA integrado — tornando as licitações visíveis e alcançáveis para MEIs.

---

## Arquitetura

```mermaid
flowchart LR
    A[Dados do Governo] --> B[API PNCP]
    B --> C[ETL]
    C --> D[(SQL - Supabase)]
    C --> E[(Atlas MongoDB)]
    C --> F[Data Science]
    C --> G[MCP / FastMCP]
    G --> H{LLM}
    D --> I[Backend - Elysia]
    E --> I
    F --> I
    H --> I
    H --> J[Frontend Mobile]
    F --> J
    I <--> J
```

---

## Tracks

| Track | Descrição | Stack | Responsável |
| --- | --- | --- | --- |
| Track 1 — Dados | ETL, engenharia de dados e análises | Python, MongoDB Atlas, Supabase | Vyktor |
| Track 2 — Mobile & Backend | App mobile e API REST | React Native, Elysia, TypeScript | Pedro, Yuri, Ylson |
| Track 3 — IA & MCP | Assistente inteligente via LLM | FastMCP, Python, HTTP + SSE | Vyktor, Thaíssa |
| Track 4 — Segurança | Revisão transversal de segurança | — | Mariana |
| Track 5 — Negócios | Monetização, métricas e UX | — | Ylson |

---

## Estrutura do monorepo

```text
licitei/
├── etl/              # Track 1 — ETL e engenharia de dados
├── data-science/     # Track 1 — análises exploratórias e modelos
├── mcp/              # Track 3 — servidor FastMCP + LLM
├── backend/          # Track 2 — API REST (Elysia)
├── mobile/           # Track 2 — app React Native
├── infra/            # configurações de deploy e CI/CD
├── docs/             # documentação técnica geral
└── tests/            # testes de integração entre tracks
```

Cada subprojeto é independente e possui seu próprio `README.md` com instruções de instalação e execução.

---

## Como começar

Escolha o track em que vai trabalhar e siga o README correspondente:

| Subprojeto | README |
| --- | --- |
| ETL (extração e carga de dados) | [etl/README.md](etl/README.md) |
| Data Science (análises e modelos) | [data-science/README.md](data-science/README.md) *(em breve)* |
| Backend (API REST) | [backend/README.md](backend/README.md) *(em breve)* |
| Mobile (app React Native) | [mobile/README.md](mobile/README.md) *(em breve)* |
| MCP / IA (assistente LLM) | [mcp/README.md](mcp/README.md) *(em breve)* |
| Infra (deploy e CI/CD) | [infra/README.md](infra/README.md) *(em breve)* |

---

## Branch strategy

| Branch | Uso |
| --- | --- |
| `main` | código em produção |
| `develop` | integração contínua — código funcionando |
| `feature/<descricao>` | desenvolvimento de funcionalidades |
| `chore/<descricao>` | configuração e infraestrutura |

---

## Time

| Membro | Papel | Contato |
| --- | --- | --- |
| Vyktor Fellype Pereira do Nascimento | Porta-Voz · Gerente de Projeto | [LinkedIn](https://www.linkedin.com/in/vyktor-nascimento/) |
| Pierre Costa Santiago de Oliveira Neto | Guardião dos Dados | — |
| Mariana Ferreira Wanderley | Track 4 — Segurança | — |
| Pedro Diniz Bim Vasconcelos e Silva | Track 2 — Backend | — |
| Thaíssa Fernandes Siqueira Silva | Track 3 — IA & MCP | — |
| Ylson dos Santos Queiroz Filho | Track 2 — Mobile · Track 5 — Negócios | — |
| Yuri Ricardo Albuquerque de França | Track 2 — Mobile | — |

---

## 🔗 Links Rápidos

| Recurso | Link |
| --- | --- |
| Formulário Semanal (até terça 17h) | [forms.gle/bwTUUNx78rQUCw4e7](https://forms.gle/bwTUUNx78rQUCw4e7) |
| Repositório GitHub | [github.com/VyNas07/Licitei](https://github.com/VyNas07/Licitei) |
| API PNCP | [pncp.gov.br/api/consulta](https://pncp.gov.br/api/consulta) |
| Documentação Notion | [Projeto Integrador — MEI Licitações](https://www.notion.so/Projeto-Integrador-MEI-Licita-es-CESAR-School-33c97155b5d980dca01fe04fc306670e) |

---

Projeto desenvolvido na CESAR School — ADS 5º período · Grupo 10 · Dados extraídos da API pública do [PNCP — Portal Nacional de Contratações Públicas](https://www.gov.br/pncp)
