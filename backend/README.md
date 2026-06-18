# Backend — Licitei

> API REST do Licitei. Serve os dados de licitações para o app mobile e valida autenticação via Supabase.

Parte do monorepo [Licitei](../README.md) · CESAR School — ADS 5º período · Grupo 10

---

## Stack

| Tecnologia | Uso |
| --- | --- |
| [Bun](https://bun.sh) | Runtime e gerenciador de pacotes |
| [Elysia](https://elysiajs.com) | Framework HTTP |
| [TypeScript](https://www.typescriptlang.org) | Linguagem |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Dados de licitações vindos do pipeline |
| [Supabase](https://supabase.com) | Auth, perfis MEI, participações, documentos e buscas salvas |
| [Swagger](https://swagger.io/) | Documentação interativa exposta em `/docs` |

---

## Pré-requisitos

- Bun 1.0+ instalado.
- Acesso ao projeto Supabase usado pelo app.
- Acesso ao MongoDB Atlas com a coleção de licitações carregada pelo pipeline.

O backend usa `bun.lock`. Não gere nem commite `package-lock.json` dentro de `backend/`.

---

## Setup local

```bash
cd backend
bun install
cp .env.example .env
```

Depois de copiar o arquivo, preencha `backend/.env` com as credenciais reais.

```bash
bun run dev
```

Em modo desenvolvimento o servidor sobe com hot reload em:

```text
http://localhost:3000
```

A documentação Swagger fica disponível em:

```text
http://localhost:3000/docs
```

Para rodar sem hot reload:

```bash
bun run start
```

---

## Variáveis de ambiente

Copie [`backend/.env.example`](.env.example) para `backend/.env`. Nunca commite o `.env`.

| Variável | Obrigatória | Exemplo | Descrição |
| --- | --- | --- | --- |
| `PORT` | Não | `3000` | Porta HTTP do backend. |
| `NODE_ENV` | Não | `development` | Ambiente de execução. |
| `ALLOWED_ORIGINS` | Não | `http://localhost:3000,http://localhost:5173` | Lista separada por vírgulas de origens aceitas pelo CORS. Inclua a origem do Expo Web, se usar. |
| `RATE_LIMIT_WINDOW_MS` | Não | `60000` | Janela do rate limit em milissegundos. |
| `RATE_LIMIT_MAX_REQUESTS` | Não | `120` | Máximo de requisições por janela. |
| `SUPABASE_URL` | Sim | `https://<project-ref>.supabase.co` | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | `<service_role_key>` | Chave `service_role` usada apenas pelo backend. Não exponha no mobile. |
| `MONGO_URI` | Sim | `mongodb+srv://...` | URI do MongoDB Atlas. |
| `MONGO_DB_NAME` | Sim | `licitei` | Nome do banco MongoDB. |
| `MONGO_COLLECTION` | Não | `contratos_ativos` | Coleção com os editais/contratações. |
| `JWT_SECRET` | Não | `<string-aleatoria-longa>` | Mantida no exemplo para compatibilidade futura. A autenticação atual usa JWT do Supabase. |
| `JWT_EXPIRES_IN` | Não | `7d` | Mantida no exemplo para compatibilidade futura. |

---

## Supabase

O backend espera que o Supabase tenha Auth habilitado e as tabelas de domínio configuradas. O guia de integração detalha os campos esperados em [`backend/INTEGRATION.md`](INTEGRATION.md), e o schema geral está em [`../docs/supabase-schema.md`](../docs/supabase-schema.md).

Tabelas usadas pelo backend:

| Tabela | Uso |
| --- | --- |
| `mei_profile` | Perfil do MEI autenticado. |
| `participacoes` | Editais acompanhados pelo usuário. |
| `saved_searches` | Buscas salvas. |
| `documentos` | Metadados de documentos e certidões. |
| `alertas` | Alertas persistidos, quando aplicável. |
| `checklist_itens` | Itens de checklist usados pelos fluxos mobile. |

O backend usa `SUPABASE_SERVICE_ROLE_KEY`, então as regras de RLS devem continuar protegendo o acesso direto pelo cliente mobile, mas o serviço consegue consultar e persistir dados necessários para a API.

---

## MongoDB

Configure `MONGO_URI`, `MONGO_DB_NAME` e `MONGO_COLLECTION` apontando para a mesma base populada pelo pipeline de dados. O `/health` faz ping no MongoDB e também valida uma consulta simples no Supabase.

```bash
curl http://localhost:3000/health
```

Resposta esperada quando tudo está disponível:

```json
{
  "status": "ok",
  "mongo": "connected",
  "supabase": "connected",
  "timestamp": "2026-06-08T00:00:00.000Z"
}
```

---

## Integração com o mobile

O mobile precisa apontar `EXPO_PUBLIC_API_URL` para a URL base deste backend.

Se estiver usando Expo Go em dispositivo físico, não use `localhost`, porque no celular ele aponta para o próprio dispositivo. Use o IP LAN da máquina que está rodando o backend:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Se estiver usando emulador Android, normalmente é possível usar:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

Se estiver usando iOS Simulator na mesma máquina:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `bun install` | Instala dependências respeitando `bun.lock`. |
| `bun run dev` | Inicia a API com hot reload. |
| `bun run start` | Inicia a API sem hot reload. |
| `bun run smoke:prod` | Executa smoke tests read-only contra o backend publicado. |

Guia dos smoke tests: [`SMOKE.md`](SMOKE.md).

---

## Rotas principais

`/health` é pública. As demais rotas esperam `Authorization: Bearer <jwt>` com o token emitido pelo Supabase Auth.

| Método | Path | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Status do backend, MongoDB e Supabase. |
| `GET` | `/docs` | Swagger UI. |
| `GET` | `/editais` | Listagem paginada de licitações com filtros. |
| `GET` | `/editais/:id` | Detalhe de uma licitação. |
| `GET` | `/oportunidades` | Editais filtrados pelo perfil/CNAE do MEI. |
| `GET` | `/perfil` | Perfil do MEI autenticado. |
| `PUT` | `/perfil` | Cria ou atualiza perfil. |
| `GET` | `/participacoes` | Lista acompanhamentos do usuário. |
| `POST` | `/participacoes` | Acompanha um edital. |
| `PATCH` | `/participacoes/:id` | Atualiza status da participação. |
| `DELETE` | `/participacoes/:id` | Remove acompanhamento. |
| `GET` | `/documentos` | Lista documentos do usuário. |
| `POST` | `/documentos` | Cadastra metadados de documento. |
| `PATCH` | `/documentos/:id` | Atualiza status ou validade. |
| `DELETE` | `/documentos/:id` | Remove documento e arquivo do Storage. |
| `GET` | `/alertas` | Alertas de prazo, teto MEI e novos editais. |
| `GET` | `/saved-searches` | Lista buscas salvas. |
| `POST` | `/saved-searches` | Cria busca salva. |
| `DELETE` | `/saved-searches/:id` | Remove busca salva. |

Contrato de payloads e exemplos: [`../docs/api-contract.md`](../docs/api-contract.md).

---

## Docker

O backend possui [`Dockerfile`](Dockerfile). Para build local:

```bash
cd backend
docker build -t licitei-backend .
```

Para executar, passe as variáveis de ambiente necessárias:

```bash
docker run --env-file .env -p 3000:3000 licitei-backend
```

---

## Estrutura

```text
backend/
├── src/
│   ├── index.ts              # App Elysia, CORS, Swagger, rate limit e rotas
│   ├── config.ts             # Leitura e validação de variáveis de ambiente
│   ├── db/
│   │   ├── mongo.ts          # Conexão MongoDB
│   │   └── supabase.ts       # Client Supabase service_role
│   ├── middleware/
│   │   └── auth.ts           # Validação JWT via Supabase Auth
│   ├── routes/               # Rotas HTTP
│   └── services/             # Integrações auxiliares
├── .env.example
├── Dockerfile
├── bun.lock
├── package.json
└── tsconfig.json
```
