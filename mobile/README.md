# Licitei — App Mobile

App React Native do Licitei. Permite que MEIs consultem licitações públicas, acompanhem editais e gerenciem participações — integrado ao backend Elysia e ao Supabase Auth.

---

## Stack

| Tecnologia | Papel |
| --- | --- |
| React Native + Expo | Framework mobile |
| Expo Router v6 | Roteamento baseado em arquivos |
| Supabase JS | Autenticação (Auth) |
| Axios | Chamadas ao backend REST |
| TypeScript | Tipagem estática |

---

## Pré-requisitos

- Node.js 18+
- Expo Go instalado no dispositivo físico (Android ou iOS)
- Backend rodando localmente (`cd backend && bun dev`)

---

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # preencher EXPO_PUBLIC_API_URL
npx expo start
```

Escaneie o QR code com o Expo Go para abrir no dispositivo.

---

## Variáveis de ambiente (`mobile/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Sim | URL base do backend. Em dispositivo físico, usar o IP LAN da máquina (não `localhost`). Ex: `http://192.168.1.10:3000` |

Para descobrir o IP LAN no Windows: `ipconfig` → "Endereço IPv4".

---

## Estrutura de telas

```text
app/
├── index.tsx                  # Landing page (sem auth)
├── _layout.tsx                # Root layout + auth guard
├── (auth)/
│   ├── login.tsx              # Login com Supabase
│   └── cadastro.tsx           # Cadastro com Supabase + perfil MEI
├── (tabs)/
│   ├── home.tsx               # Listagem de editais com filtros e paginação
│   ├── disputas.tsx           # Participações do MEI
│   ├── documentos.tsx         # Gestão de documentos (Sprint 2)
│   ├── perfil.tsx             # Perfil do MEI + logout
│   ├── alertas.tsx            # Alertas de prazo (Sprint 2, oculto na tab bar)
│   └── planos.tsx             # Planos PRO (Sprint 3, oculto na tab bar)
└── edital/
    └── [id].tsx               # Detalhe do edital + botão "Acompanhar"
```

---

## Arquitetura de autenticação

O `_layout.tsx` raiz observa a sessão via `supabase.auth.onAuthStateChange`. Quando a sessão muda:

- Usuário **sem sessão** tentando acessar `/(tabs)/*` → redireciona para `/(auth)/login`
- Usuário **com sessão** na landing page ou em `/(auth)/*` → redireciona para `/(tabs)/home`

Todas as chamadas ao backend incluem o JWT do Supabase automaticamente via interceptor Axios em `src/services/api.ts`.

---

## Fluxo principal (Milestone 1)

```text
Landing → Login/Cadastro → Home (editais)
                               ↓
                         Detalhe do edital
                               ↓
                     "Acompanhar edital" → Disputas
```

---

## Componentes principais

| Caminho | Descrição |
| --- | --- |
| `src/services/api.ts` | Instância Axios com interceptor JWT |
| `src/services/supabase.ts` | Cliente Supabase configurado |
| `src/components/editais/EditalCard.tsx` | Card de edital reutilizável |
| `src/components/editais/FilterModal.tsx` | Modal de filtros avançados |
| `src/components/editais/CategoryModal.tsx` | Modal de categorias/setores |
| `src/components/auth/AuthHeader.tsx` | Header padrão das telas autenticadas |
| `src/components/perfil/RevenueCard.tsx` | Card de faturamento MEI |
