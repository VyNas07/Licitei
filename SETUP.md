# Setup Backend + Mobile — Licitei

Este guia cobre o fluxo local da Track 2: backend Elysia com Bun e app mobile React Native/Expo.

Para detalhes específicos, consulte também:

| Projeto | Guia |
| --- | --- |
| Backend | [`backend/README.md`](backend/README.md) |
| Mobile | [`mobile/README.md`](mobile/README.md) |
| Build mobile | [`mobile/BUILD.md`](mobile/BUILD.md) |
| Contrato da API | [`docs/api-contract.md`](docs/api-contract.md) |
| Integração backend/mobile | [`backend/INTEGRATION.md`](backend/INTEGRATION.md) |

---

## Pré-requisitos

- Bun 1.0+ para o backend.
- Node.js 18+ e npm para o mobile.
- MongoDB Atlas com dados de licitações carregados.
- Projeto Supabase com Auth e tabelas configuradas.
- Expo Go, emulador Android, iOS Simulator ou navegador para rodar o app.

---

## 1. Backend

```bash
cd backend
bun install
cp .env.example .env
```

Preencha `backend/.env`:

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster.mongodb.net/
MONGO_DB_NAME=licitei
MONGO_COLLECTION=contratos_ativos
JWT_SECRET=<string-aleatoria-longa>
JWT_EXPIRES_IN=7d
```

Inicie:

```bash
bun run dev
```

Valide:

```bash
curl http://localhost:3000/health
```

Swagger:

```text
http://localhost:3000/docs
```

---

## 2. Mobile

Em outro terminal:

```bash
cd mobile
npm install
cp .env.example .env
```

Preencha `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://SEU_BACKEND:3000
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Use o mesmo projeto Supabase configurado no backend. A chave `service_role` fica somente no backend; no mobile use apenas a chave `anon`.

Escolha `EXPO_PUBLIC_API_URL` conforme o alvo:

| Alvo | URL |
| --- | --- |
| Celular físico com Expo Go | `http://<IP-LAN-DA-MAQUINA>:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator | `http://localhost:3000` |
| Expo Web local | `http://localhost:3000` |
| Render/staging | `https://licitei-backend.onrender.com` ou URL vigente |

Inicie:

```bash
npm run start
```

---

## 3. Checklist rápido

1. Backend rodando em `:3000`.
2. `/health` respondendo `status: ok` ou, no mínimo, indicando claramente qual dependência está `disconnected`.
3. `mobile/.env` apontando para uma URL acessível pelo dispositivo.
4. Supabase do mobile e backend apontando para o mesmo projeto.
5. App aberto pelo Expo.
6. Login/cadastro validado.
7. Fluxos principais testados: Home, detalhe do edital, acompanhar edital, Disputas, Documentos e Alertas.

---

## Gerenciadores e locks

| Projeto | Gerenciador | Lock versionado |
| --- | --- | --- |
| `backend/` | Bun | `backend/bun.lock` |
| `mobile/` | npm | `mobile/package-lock.json` |

Não adicione `package-lock.json` no backend.

---

## Observações para build mobile

O perfil `preview` do EAS aponta para `https://licitei-backend.onrender.com` via `EXPO_PUBLIC_API_URL`. Como variáveis `EXPO_PUBLIC_` são embutidas no bundle, qualquer troca de backend exige reiniciar o Expo ou gerar um novo build.

Para APK interno:

```bash
cd mobile
npx eas login
npx eas build -p android --profile preview
```
