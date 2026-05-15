# Licitei — Segurança

> **Responsável:** Mariana Wanderley (Track 4) · suporte técnico: Vyktor Nascimento  
> **Avaliação final:** 10/06/2026  
> **Documento:** Google Docs compartilhado

**Equipe 10:** Vyktor Nascimento · Ylson Santos · Mariana Wanderley · Pedro Bim · Yuri França · Thaíssa Fernandes · Júlia Veríssimo · Pierre Costa

---

## S1 — Gestão de autenticação de usuários e senhas (prazo: 06/05 ✅)

### 1.1 Visão geral da autenticação

O projeto adota um modelo de autenticação delegado ao Supabase Auth.

O cliente móvel inicializa o SDK utilizando a chave pública (`anon key`) e realiza
operações de login e cadastro diretamente via Supabase. O backend não implementa
endpoints de autenticação, atuando apenas como validador do token JWT.

O token é enviado nas requisições através do cabeçalho `Authorization`, e o backend
valida esse token utilizando o método `supabase.auth.getUser()`.

---

### 1.2 Fluxo de autenticação

```text
1. Usuário informa e-mail e senha no app mobile
2. Supabase Auth valida as credenciais
3. Token JWT é gerado e retornado ao cliente
4. Token é armazenado na sessão do dispositivo
5. Token é enviado em cada requisição via header Authorization: Bearer <token>
6. Backend valida o token via supabase.auth.getUser() e extrai userId e userEmail
```

Esse processo garante que apenas usuários autenticados acessem rotas protegidas.

---

### 1.3 Gerenciamento de senhas

O gerenciamento de senhas é totalmente delegado ao Supabase Auth.

| Item | Detalhe |
|------|---------|
| Armazenamento de senha | Não armazenada no backend — exclusividade do Supabase |
| Hashing | Realizado pela infraestrutura do Supabase (bcrypt) |
| Acesso às credenciais | Backend não tem acesso direto |

**Validações no cliente:**

- Login: campos não podem estar vazios
- Cadastro: campos obrigatórios verificados — força de senha não é validada no cliente

**Configuração Supabase Auth:**

| Configuração | Valor | Observação |
| --- | --- | --- |
| Cadastro de novos usuários | ✅ Habilitado | — |
| Confirmação de e-mail | Não localizado | — |
| Login anônimo | ✅ Desabilitado | Aacesso exige autenticação completa |
| Provedores ativos | Somente e-mail + senha | Todos os OAuth (Google, GitHub, etc.) desabilitados |
| Comprimento mínimo de senha | ✅ 10 caracteres | — |
| Complexidade exigida | ✅ Letras minúsculas, maiúsculas, dígitos e símbolos | Configuração recomendada pelo Supabase |
| Proteção contra senhas vazadas | Desabilitada | Requer plano Pro (HaveIBeenPwned) — projeto usa free tier |
| Troca segura de e-mail | ✅ Habilitado | Confirmação exigida no e-mail antigo e no novo |
| Exigência de senha atual na troca | ✅ Habilitado | Usuário deve informar a senha atual para trocar |
| OTP de e-mail — expiração | 3600 segundos (1 hora) | — |
| OTP de e-mail — comprimento | 8 dígitos | — |

---

## S2 — Dados em repouso e anonimização (prazo: 13/05)

### 1. Encryption at rest — MongoDB Atlas

O MongoDB Atlas habilita criptografia em repouso por padrão em todos os clusters,
incluindo o tier gratuito (M0).

| Item | Detalhe |
| --- | --- |
| Algoritmo | AES-256 (garantia da plataforma MongoDB Atlas) |
| Gerenciamento de chaves | Chaves gerenciadas pela MongoDB (padrão para todos os clusters) |
| Configuração manual | Nenhuma — habilitado automaticamente em todos os tiers, incluindo M0 |
| Cluster do projeto | `licitei` — tier M0 free |
| Toggle "Encryption at Rest" no painel | Desabilitado — esse toggle é exclusivo para BYOK (chaves próprias, requer M10+) |
| Dado principal armazenado | Contratações PNCP (dados públicos — sem PII direta) |

> **Nota:** a ausência do toggle BYOK não indica ausência de criptografia. A MongoDB documenta
> que todos os dados armazenados no Atlas são cifrados em repouso por padrão, independente do
> tier. Referência: [MongoDB Atlas Security — Encryption at Rest](https://www.mongodb.com/docs/atlas/security-kms-encryption/).

---

### 2. Encryption at rest — Supabase (Postgres)

O Supabase hospeda o banco Postgres em infraestrutura AWS/GCP, com criptografia em
repouso habilitada por padrão.

| Item | Detalhe |
| --- | --- |
| Algoritmo | AES-256 (garantia da plataforma Supabase / AWS) |
| Gerenciamento de chaves | AWS KMS — gerenciado pelo Supabase (não configurável no free tier) |
| Configuração manual | Nenhuma — habilitado automaticamente em toda a infraestrutura |
| Tabelas com dados pessoais | `auth.users`, `mei_profile`, `participacoes`, `documentos`, `saved_searches`, `alertas` |

> **Nota:** a criptografia em repouso no Supabase é garantida pela infraestrutura AWS subjacente
> e não é configurável pelo usuário no plano gratuito. Referência:
> [Supabase Security — Platform Security](https://supabase.com/docs/guides/platform/going-into-prod#security).

---

### 3. Supabase Storage (documentos do MEI)

Os arquivos enviados pelo MEI (certidões, CNPJ, etc.) são armazenados no Supabase
Storage, que utiliza a mesma infraestrutura AWS com criptografia AES-256 em repouso
e TLS em trânsito.

| Item | Detalhe |
|------|---------|
| Bucket | `documentos` (privado) |
| Acesso | Via URL assinada gerada pelo backend (service_role) |
| Criptografia em trânsito | TLS 1.2+ obrigatório |

---

### 4. Dados sensíveis armazenados e tratamento

| Dado | Onde fica | Formato armazenado | Sensibilidade |
|------|-----------|-------------------|---------------|
| E-mail | `auth.users` (Supabase Auth) | Texto plano (gerenciado pelo Supabase) | Alta |
| Senha | `auth.users` (Supabase Auth) | Hash bcrypt (Supabase gerencia) | Alta |
| CNPJ | `mei_profile.cnpj` (Supabase) | Texto plano, 14 dígitos sem máscara | Alta |
| Nome fantasia | `mei_profile.nome_fantasia` | Texto plano | Média |
| CNAE | `mei_profile.cnae` | Código público (ex: `4711-3/02`) | Baixa |
| UF de operação | `mei_profile.uf` | Texto plano (`char(2)`) | Baixa |
| Documentos físicos | Supabase Storage | Arquivo original (PDF, imagem) | Alta |
| Histórico de participações | `participacoes` (Supabase) | Texto plano + dados desnormalizados do PNCP | Média |
| Buscas salvas | `saved_searches` | Termos e filtros em JSONB | Baixa |

**Observação sobre o CNPJ:** armazenado em texto plano no Supabase. O dado já é público
(CNPJ é registro público na Receita Federal), mas o acesso é protegido por RLS
(Row Level Security) — cada usuário acessa apenas o próprio registro.

**Anonimização em logs:** nenhum dado pessoal (e-mail, CNPJ, nome) é emitido nos logs
do backend. O logger registra `userId` (UUID) e `userEmail` como contexto interno —
por inspeção do código-fonte, não há `console.log` ou logger emitindo campos sensíveis
como CNPJ ou nome nas rotas do backend.

> **Nota:** validação em produção (Railway) pendente — o projeto ainda não está deployado
> (Sprint 2). Verificar logs após o deploy previsto para o final da Sprint 2.

---

## Revisão de Autenticação

### Fluxo JWT — Backend

O backend (`backend/src/middleware/auth.ts`) valida cada requisição via Supabase Auth:

```
Cliente → Bearer <token> → authPlugin → supabase.auth.getUser(token) → userId, userEmail
```

| Ponto de verificação | Status |
|----------------------|--------|
| Token extraído do header `Authorization: Bearer` | ✅ |
| Validação delegada ao Supabase (sem lógica própria de JWT) | ✅ |
| Token inválido/expirado retorna HTTP 401 | ✅ |
| `service_role` key nunca exposta no frontend | ✅ (só no backend via variável de ambiente) |
| `persistSession: false` no cliente server-side | ✅ (`backend/src/db/supabase.ts:9`) |
| `autoRefreshToken: false` no cliente server-side | ✅ (`backend/src/db/supabase.ts:8`) |

### Armazenamento de sessão — Mobile

O app mobile (`mobile/src/services/supabase.ts`) usa `AsyncStorage` para persistir
a sessão.

| Ponto de verificação | Status |
|----------------------|--------|
| `autoRefreshToken: true` | ✅ |
| `persistSession: true` | ✅ |
| Storage: `AsyncStorage` | ⚠️ Risco |

> **Gap identificado:** o requisito de segurança da Sprint 2 exige o uso de `SecureStore`
> (Expo) para armazenamento de tokens. O `AsyncStorage` é não-cifrado e acessível via
> backup do dispositivo no Android. **Ação necessária:** migrar para `expo-secure-store`
> (Track 2 Mobile — Pedro/Yuri).

### Row Level Security (RLS)

RLS habilitado em todas as tabelas do Supabase. Política padrão:
```sql
user_id = auth.uid()
```
Cada usuário acessa apenas seus próprios registros. Confirmado na especificação do schema
(`docs/supabase-schema.md`).

> **Confirmado:** RLS habilitado e política "acesso próprio" (comando ALL,
> role `public`) ativa em todas as tabelas: `mei_profile`, `saved_searches`, `participacoes`,
> `checklist_itens`, `documentos`, `alertas`.

---

## S3 — Checklist LGPD (prazo: 20/05)

### 1. Base de dados pessoais coletados

| Categoria | Dado | Base legal (LGPD art. 7º) |
|-----------|------|--------------------------|
| Identificação | E-mail | Execução de contrato (conta do usuário) |
| Identificação | CNPJ | Execução de contrato (obrigatório para MEI) |
| Identificação | Nome fantasia | Execução de contrato |
| Localização | UF de operação | Execução de contrato (filtro de licitações) |
| Atividade econômica | CNAE | Execução de contrato (matching de licitações) |
| Documentos | Certidões, comprovantes | Execução de contrato (checklist de habilitação) |
| Comportamento | Buscas salvas, participações | Legítimo interesse / execução de contrato |

### 2. Consentimento

Tela de consentimento ainda não implementada no app — identificada como gap durante revisão de segurança da Sprint 2.

| Item | Status |
| --- | --- |
| Tela de aceite de Termos de Uso e Política de Privacidade | ⚠️ Gap — previsto para Sprint 3 |
| Termos de Uso redigidos | ⬜ Pendente |
| Política de Privacidade redigida | ⬜ Pendente |
| Log de aceite armazenado (data/hora + versão) | ⬜ Pendente — depende da tela ser implementada |

### 3. Direitos do titular

Verificado por inspeção do código-fonte do backend (`backend/src/routes/`) em 14/05/2026.

| Direito (LGPD) | Endpoint | Status |
| --- | --- | --- |
| Acesso aos dados | `GET /perfil` — retorna todos os campos do `mei_profile` | ✅ Implementado |
| Correção | `PUT /perfil` — permite editar nome, CNPJ, UF, ramo de atuação | ✅ Implementado |
| Exclusão | Nenhum — não existe `DELETE /perfil` ou fluxo de "excluir conta" | ⚠️ Gap |
| Portabilidade | Nenhum — não existe endpoint de exportação de dados | ⚠️ Gap |
| Revogação do consentimento | Nenhum — não existe fluxo de cancelamento de conta | ⚠️ Gap |

> Os gaps de exclusão, portabilidade e revogação são aceitáveis para um MVP em Sprint 2.
> Devem ser adicionados ao backlog para Sprint 3 ou 4 antes da entrega final (13/06).

---

## Dependências e ações pendentes

| Ação | Responsável | Prazo |
|------|-------------|-------|
| ~~Screenshot de encryption at rest no Atlas~~ | ~~Vyktor~~ | ~~13/05~~ ✅ Documentado via política oficial MongoDB |
| ~~Screenshot de encryption at rest no Supabase~~ | ~~Vyktor / Pedro~~ | ~~13/05~~ ✅ Documentado via política oficial Supabase |
| ~~Confirmar RLS ativo em produção (todas as tabelas)~~ | ~~Vyktor / Pedro~~ | ~~13/05~~ ✅ |
| Migrar mobile de `AsyncStorage` → `SecureStore` | Pedro / Yuri | Sprint 2 |
| Revisar logs Railway — confirmar sem PII | Vyktor / Pedro | Pós-deploy (fim Sprint 2) |
| Confirmar tela de consentimento no onboarding | Thaíssa / Yuri | 20/05 (S3) |
| Mapear fluxo de exclusão de conta | Pedro | 20/05 (S3) |

---

*v1.0 — 14/05/2026 · rascunho técnico baseado na inspeção do código (branch `develop`)*
