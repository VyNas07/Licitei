# Mobile — Licitei

> App React Native/Expo do Licitei. Permite que MEIs consultem licitações públicas, acompanhem editais e gerenciem documentos integrados ao backend.

Parte do monorepo [Licitei](../README.md) · CESAR School — ADS 5º período · Grupo 10

---

## Stack

| Tecnologia | Uso |
| --- | --- |
| React Native | Aplicativo mobile |
| Expo SDK 54 | Tooling, execução local e builds |
| Expo Router v6 | Roteamento baseado em arquivos |
| TypeScript | Tipagem |
| Supabase JS | Autenticação e sessão |
| Axios | Chamadas REST para o backend |
| EAS | Builds internos e produção |

---

## Pré-requisitos

- Node.js 18+.
- npm, usando o `package-lock.json` versionado em `mobile/`.
- Expo Go instalado no dispositivo físico, ou emulador/simulador configurado.
- Backend Licitei rodando localmente ou uma URL pública do backend.
- Projeto Supabase configurado com Auth e as tabelas esperadas pelo backend.

---

## Setup local

```bash
cd mobile
npm install
cp .env.example .env
```

Preencha `mobile/.env` com as URLs e chaves públicas:

```env
EXPO_PUBLIC_API_URL=http://SEU_BACKEND:3000
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

Inicie o Expo:

```bash
npm run start
```

Depois, escolha o alvo no terminal do Expo:

| Alvo | Comando |
| --- | --- |
| Expo Go com QR code | `npm run start` |
| Android | `npm run android` |
| iOS | `npm run ios` |
| Web | `npm run web` |

---

## Variáveis de ambiente

O Expo expõe para o app apenas variáveis prefixadas com `EXPO_PUBLIC_`. Copie [`mobile/.env.example`](.env.example) para `mobile/.env`. Nunca commite o `.env`.

| Variável | Obrigatória | Exemplo | Descrição |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Sim | `http://192.168.1.10:3000` | URL base do backend. |
| `EXPO_PUBLIC_SUPABASE_URL` | Sim | `https://<project-ref>.supabase.co` | URL pública do Supabase. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sim | `<anon_key>` | Chave pública `anon` do Supabase, usada no cliente mobile. |

Não coloque `SUPABASE_SERVICE_ROLE_KEY` no mobile. Essa chave é exclusiva do backend.

---

## Como escolher a URL do backend

A URL correta depende de onde o app está rodando:

| Ambiente | `EXPO_PUBLIC_API_URL` recomendado |
| --- | --- |
| Expo Go em celular físico | `http://<IP-LAN-DA-MAQUINA>:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator | `http://localhost:3000` |
| Expo Web local | `http://localhost:3000` |
| Backend publicado | `https://licitei-backend.onrender.com` ou URL vigente |

Para celular físico, computador e celular precisam estar na mesma rede. Se o app não conseguir acessar a API, valide firewall e liberação da porta `3000`.

Exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

---

## Backend e autenticação

O app autentica usuários com Supabase Auth. As chamadas ao backend passam automaticamente o JWT da sessão no header:

```text
Authorization: Bearer <jwt>
```

Essa configuração fica em [`src/services/api.ts`](src/services/api.ts). O cliente Supabase fica em [`src/services/supabase.ts`](src/services/supabase.ts).

Antes de testar fluxos autenticados, garanta que:

- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` apontam para o mesmo projeto usado pelo backend.
- O backend tem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do mesmo projeto.
- O backend está acessível a partir do dispositivo onde o app roda.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm install` | Instala dependências conforme `package-lock.json`. |
| `npm run start` | Abre o servidor Expo. |
| `npm run android` | Abre o app no Android. |
| `npm run ios` | Abre o app no iOS. |
| `npm run web` | Abre o app no navegador. |
| `npm run lint` | Executa o lint do Expo. |
| `npm run reset-project` | Executa script de reset do template. Use com cuidado. |

---

## Build de teste

O projeto possui [`eas.json`](eas.json) com perfis `development`, `preview` e `production`.

Para gerar APK interno de preview:

```bash
cd mobile
npx eas login
npx eas build -p android --profile preview
```

O perfil `preview` define `EXPO_PUBLIC_API_URL=https://licitei-backend.onrender.com` no `eas.json`. Se precisar testar outro backend, ajuste a variável antes do build ou configure a variável no ambiente do EAS.

Guia detalhado: [`BUILD.md`](BUILD.md).

---

## Estrutura de rotas

```text
app/
├── index.tsx                  # Landing page
├── onboarding.tsx             # Onboarding inicial
├── completar-perfil.tsx       # Complemento de cadastro/perfil
├── paywall.tsx                # Tela de planos/paywall
├── _layout.tsx                # Layout raiz e controle de sessão
├── (auth)/
│   ├── login.tsx              # Login
│   └── cadastro.tsx           # Cadastro
├── (tabs)/
│   ├── home.tsx               # Listagem de editais
│   ├── disputas.tsx           # Participações
│   ├── documentos.tsx         # Documentos
│   ├── alertas.tsx            # Alertas
│   ├── perfil.tsx             # Perfil e logout
│   └── planos.tsx             # Planos
├── checklist/
│   └── [id].tsx               # Checklist por edital
└── edital/
    └── [id].tsx               # Detalhe do edital
```

---

## Componentes e serviços principais

| Caminho | Descrição |
| --- | --- |
| `src/services/api.ts` | Axios com interceptor de JWT. |
| `src/services/supabase.ts` | Cliente Supabase com storage seguro em mobile. |
| `src/hooks/useParticipacoes.ts` | Fluxo de editais acompanhados. |
| `src/hooks/useAlertas.ts` | Consulta de alertas. |
| `src/hooks/useDocumentos.ts` | Gestão de documentos. |
| `src/hooks/useChecklist.ts` | Checklist por edital. |
| `src/components/editais/EditalCard.tsx` | Card de edital. |
| `src/components/editais/FilterModal.tsx` | Filtros avançados. |
| `src/components/auth/AuthHeader.tsx` | Header de telas autenticadas. |

---

## Checklist de execução local

1. Rodar o backend com `bun run dev`.
2. Validar `http://localhost:3000/health` na máquina do backend.
3. Configurar `mobile/.env` com a URL correta para o dispositivo.
4. Rodar `npm run start`.
5. Abrir o app no Expo Go, emulador, simulador ou web.
6. Fazer login/cadastro e validar Home, detalhe de edital, participação, documentos e alertas.
