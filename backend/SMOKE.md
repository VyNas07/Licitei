# Smoke tests de producao — Backend

Este smoke valida se o backend publicado esta vivo e se os principais endpoints read-only respondem com o formato esperado.

O script nao executa `POST`, `PATCH` ou `DELETE` em producao.

---

## O que e testado

| Check | Expectativa |
| --- | --- |
| `GET /health` | HTTP `200`, `status: ok`, MongoDB e Supabase conectados. |
| Login Supabase | Usuario teste autentica e retorna `access_token`. |
| `GET /perfil` | HTTP `200` ou `404` com mensagem de perfil ausente. |
| `GET /editais?limit=1` | HTTP `200` e campo `data` como array. |
| `GET /editais/:id` | HTTP `200` quando a listagem retorna ao menos um edital. |
| `GET /oportunidades?limit=1` | HTTP `200` e campo `data` como array. |
| `GET /participacoes` | HTTP `200` e campo `data` como array. |
| `GET /alertas` | HTTP `200`, campo `data` como array e `total` numerico. |
| `GET /saved-searches` | HTTP `200` e campo `data` como array. |
| `GET /documentos` | HTTP `200` e campo `data` como array. |

---

## Variaveis necessarias

Copie os valores para `backend/.env`, para o ambiente local ou para as secrets do job que executara o smoke. O script le `SMOKE_BASE_URL`; ele nao usa URL hardcoded.

```env
SMOKE_BASE_URL=https://licitei-backend.onrender.com
SMOKE_SUPABASE_URL=https://<project-ref>.supabase.co
SMOKE_SUPABASE_ANON_KEY=<anon_key>
SMOKE_TEST_EMAIL=<email_usuario_teste>
SMOKE_TEST_PASSWORD=<senha_usuario_teste>
SMOKE_TIMEOUT_MS=15000
```

Use um usuario de teste dedicado. O smoke so faz leitura, mas o usuario precisa existir no mesmo Supabase usado pelo backend publicado.

---

## Execucao

Com `backend/.env` preenchido:

```bash
cd backend
bun install
bun run smoke:prod
```

Ou passando as variaveis diretamente:

```bash
cd backend
bun install
SMOKE_BASE_URL=https://licitei-backend.onrender.com \
SMOKE_SUPABASE_URL=https://<project-ref>.supabase.co \
SMOKE_SUPABASE_ANON_KEY=<anon_key> \
SMOKE_TEST_EMAIL=<email_usuario_teste> \
SMOKE_TEST_PASSWORD=<senha_usuario_teste> \
bun run smoke:prod
```

Tambem e possivel exportar as variaveis antes:

```bash
export SMOKE_BASE_URL=https://licitei-backend.onrender.com
export SMOKE_SUPABASE_URL=https://<project-ref>.supabase.co
export SMOKE_SUPABASE_ANON_KEY=<anon_key>
export SMOKE_TEST_EMAIL=<email_usuario_teste>
export SMOKE_TEST_PASSWORD=<senha_usuario_teste>

bun run smoke:prod
```

Saida esperada:

```text
[INFO] Running backend smoke tests against https://licitei-backend.onrender.com
[PASS] /health (200, 120ms)
[PASS] Supabase Auth sign in
[PASS] /perfil (200, 80ms)
[PASS] /editais/<id> (200, 110ms)
[PASS] /editais?limit=1 (200, 140ms)
[PASS] /oportunidades?limit=1 (200, 160ms)
[PASS] /participacoes (200, 70ms)
[PASS] /alertas (200, 90ms)
[PASS] /saved-searches (200, 70ms)
[PASS] /documentos (200, 75ms)
[PASS] 10 smoke checks completed
```

Se a listagem de editais estiver vazia, o check de detalhe nao roda e o total esperado cai para `9`.

Se algum check falhar, o processo sai com codigo `1` e imprime a rota e o motivo.
