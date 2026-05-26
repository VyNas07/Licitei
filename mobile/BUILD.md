# Build de teste em dispositivo — Licitei Mobile

Este guia descreve o fluxo usado para gerar um APK de teste do app mobile apontando para o backend local.

## Objetivo

Gerar um build Android interno (`.apk`) para instalar em um dispositivo físico e testar o app contra o backend rodando na máquina local.

## Configuração aplicada no projeto

No arquivo `app.json`, o identificador Android foi definido como:

```json
"android": {
  "package": "com.licitei.mobile"
}
```

O perfil de build usado é o `preview` do `eas.json`, que já está configurado para gerar APK:

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

## Pré-requisitos

- Node.js instalado.
- Dependências do mobile instaladas.
- Conta Expo/EAS logada na máquina.
- Celular Android na mesma rede Wi-Fi da máquina que roda o backend.
- Backend rodando localmente.

## 1. Subir o backend local

Na raiz do monorepo:

```bash
cd backend
bun install
bun run dev
```

Por padrão, o backend sobe em:

```text
http://localhost:3000
```

Para o celular acessar, não use `localhost`. Use o IP local da máquina na rede.

No Windows, descubra o IP com:

```powershell
ipconfig
```

Procure o campo `Endereço IPv4`. Exemplo:

```text
192.168.1.10
```

Nesse caso, a URL do backend para o app será:

```text
http://192.168.1.10:3000
```

> Importante: computador e celular precisam estar na mesma rede. Se não conectar, verificar firewall/liberação da porta `3000`.

## 2. Configurar variáveis do mobile

Crie ou atualize o arquivo `.env` dentro de `mobile/`:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

Exemplo usando backend local:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

Não use:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Dentro de um APK instalado no celular, `localhost` aponta para o próprio celular, não para o computador.

## 3. Instalar dependências do mobile

Dentro de `mobile/`:

```bash
npm install
```

## 4. Validar antes do build

Dentro de `mobile/`:

```bash
npm run lint
```

Opcionalmente:

```bash
npx expo-doctor
```

## 5. Login no EAS

Se ainda não estiver logado:

```bash
npx eas login
```

Se o projeto ainda não estiver vinculado ao EAS:

```bash
npx eas build:configure
```

## 6. Gerar APK de teste

Dentro de `mobile/`:

```bash
npx eas build -p android --profile preview
```

Esse comando usa o perfil `preview` do `eas.json` e gera um APK de distribuição interna.

## 7. Instalar no dispositivo

Ao final do build, o EAS fornece um link/QR code para download do APK.

No celular Android:

1. Abra o link gerado pelo EAS.
2. Baixe o APK.
3. Permita instalação de apps externos, se solicitado.
4. Instale o app.
5. Faça login/cadastro e teste os fluxos principais.

## 8. Checklist de teste rápido

Com backend local rodando e celular na mesma rede:

- Abrir o app instalado.
- Fazer login/cadastro via Supabase.
- Verificar carregamento da Home.
- Abrir detalhe de edital.
- Acompanhar um edital.
- Abrir Disputas.
- Abrir Alertas.
- Testar fluxo que chama `/chat`, como checklist, se MCP estiver rodando.

## Observações

- O valor de `EXPO_PUBLIC_API_URL` é embutido no app durante o build. Se o IP local mudar, será necessário gerar outro build ou usar uma URL estável de staging.
- Para testar o chat/checklist completo, além do backend, o serviço MCP também precisa estar rodando e acessível para o backend via `MCP_URL`.
- Para builds futuros com backend publicado, basta trocar `EXPO_PUBLIC_API_URL` para a URL pública antes de gerar o APK.
