# Backend — Track 2

> API REST do Licitei. Serve os dados de licitações para o app mobile e encaminha queries ao assistente de IA (MCP).

Parte do monorepo [Licitei](../README.md) · CESAR School — ADS 5º período · Grupo 10

**Responsáveis:** Pedro, Yuri

---

## Stack

| Tecnologia | Uso |
| --- | --- |
| [Bun](https://bun.sh) | Runtime e gerenciador de pacotes |
| [Elysia](https://elysiajs.com) | Framework web (nativo Bun) |
| [TypeScript](https://www.typescriptlang.org) | Linguagem |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Licitações (dados do ETL) |
| [Supabase](https://supabase.com) | Perfis MEI, participações e auth |

---

## Pré-requisitos

- [Bun](https://bun.sh) 1.0+
- Acesso ao MongoDB Atlas (mesma instância do ETL)
- Projeto Supabase com as 6 tabelas criadas (`mei_profile`, `participacoes`, `saved_searches`, `checklist_itens`, `documentos`, `alertas`)

---

## Instalação e execução

```bash
# 1. Entrar no diretório
cd backend

# 2. Instalar dependências
bun install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Iniciar em modo desenvolvimento (hot reload)
bun run dev

# 5. Iniciar em produção
bun run start
```

O servidor sobe em `http://localhost:3000` por padrão.

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. **Nunca commite o `.env`.**

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `PORT` | Não | Porta do servidor. Padrão: `3000` |
| `NODE_ENV` | Não | `development` ou `production` |
| `SUPABASE_URL` | Sim | URL do projeto Supabase (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave `service_role` do Supabase — nunca expor no frontend |
| `MONGO_URI` | Sim | URI do MongoDB Atlas (mesma usada pelo ETL) |
| `MONGO_DB_NAME` | Sim | Nome do banco. Ex: `licitei` |
| `MONGO_COLLECTION` | Sim | Nome da coleção. Ex: `contratacoes` |
| `MCP_URL` | Não | URL do servidor MCP. Padrão: `http://localhost:8000` |

---

## Endpoints

Todos os endpoints exceto `/health` exigem autenticação via `Authorization: Bearer <jwt>`.
O token JWT é obtido pelo app mobile via Supabase Auth.

| Método | Path | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Status do servidor e conectividade MongoDB |
| `GET` | `/editais` | Listagem paginada de licitações com filtros |
| `GET` | `/editais/:id` | Detalhe completo de uma licitação pelo ID PNCP |
| `GET` | `/oportunidades` | Editais filtrados automaticamente pelo CNAE do MEI |
| `GET` | `/perfil` | Perfil do MEI autenticado |
| `PUT` | `/perfil` | Criar ou atualizar perfil (CNPJ, UF, ramo) |
| `GET` | `/participacoes` | Lista de licitações que o MEI está acompanhando |
| `POST` | `/participacoes` | Iniciar acompanhamento de um edital |
| `PATCH` | `/participacoes/:id` | Atualizar status de uma participação |
| `DELETE` | `/participacoes/:id` | Remover participação |
| `GET` | `/alertas` | Alertas automáticos: teto MEI, prazos e novos editais |
| `POST` | `/chat` | Proxy para o assistente de IA (MCP — Sprint 2) |

Documentação completa de payloads e exemplos em [`docs/api-contract.md`](../docs/api-contract.md).

---

## Estrutura

```text
backend/
├── src/
│   ├── index.ts              # Entrada — Elysia app, CORS, rotas
│   ├── config.ts             # Variáveis de ambiente (falha rápido se faltando)
│   ├── db/
│   │   ├── mongo.ts          # Singleton de conexão MongoDB
│   │   └── supabase.ts       # Client Supabase (service_role)
│   ├── middleware/
│   │   └── auth.ts           # Validação JWT via Supabase Auth
│   ├── routes/
│   │   ├── health.ts
│   │   ├── editais.ts
│   │   ├── oportunidades.ts
│   │   ├── perfil.ts
│   │   ├── participacoes.ts
│   │   ├── alertas.ts
│   │   └── chat.ts
│   └── services/
│       └── brasilapi.ts      # Consulta CNAE a partir do CNPJ
├── migrations.sql            # Referência do schema Supabase (não executar)
├── .env.example
├── package.json
└── tsconfig.json
```
