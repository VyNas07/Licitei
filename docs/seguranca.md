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
| --- | --- |
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
| --- | --- |
| Bucket | `documentos` (privado) |
| Upload | Direto do cliente mobile via Supabase anon key + policy RLS (INSERT restrito a `auth.uid()`) |
| Acesso de leitura | Restrito ao próprio usuário via RLS (SELECT por `auth.uid()`); URL assinada via `createSignedUrl` planejada para quando o botão de visualização for implementado |
| Exclusão | Backend remove o arquivo do Storage antes de deletar o registro no banco (`service_role`) |
| Criptografia em trânsito | TLS 1.2+ obrigatório |

---

### 4. Dados sensíveis armazenados e tratamento

| Dado | Onde fica | Formato armazenado | Sensibilidade |
| --- | --- | --- | --- |
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

**Anonimização em logs:** por inspeção do código-fonte, não há `console.log` ou logger
emitindo campos sensíveis (CNPJ, nome, e-mail) nas rotas do backend. O handler global
de erros (`index.ts:39`) registra apenas `error.code` e `error.message` genéricos do
framework — sem dados do usuário.

> **Nota:** validação em produção (Railway) pendente — projeto ainda não deployado (Sprint 2).
> Verificar logs após o deploy previsto para o final da Sprint 2.

---

## Revisão de Autenticação

### Fluxo JWT — Backend

O backend (`backend/src/middleware/auth.ts`) valida cada requisição via Supabase Auth:

```text
Cliente → Bearer <token> → authPlugin → supabase.auth.getUser(token) → userId, userEmail
```

| Ponto de verificação | Status |
| --- | --- |
| Token extraído do header `Authorization: Bearer` | ✅ |
| Validação delegada ao Supabase (sem lógica própria de JWT) | ✅ |
| Token inválido/expirado retorna HTTP 401 | ✅ |
| `service_role` key nunca exposta no frontend | ✅ (só no backend via variável de ambiente) |
| `persistSession: false` no cliente server-side | ✅ (`backend/src/db/supabase.ts:9`) |
| `autoRefreshToken: false` no cliente server-side | ✅ (`backend/src/db/supabase.ts:8`) |

### Armazenamento de sessão — Mobile

O app mobile (`mobile/src/services/supabase.ts`) usa armazenamento seguro via
`expo-secure-store` para persistir a sessão em dispositivos nativos. A implementação
fica em `mobile/src/utils/secureStorage.ts` e divide valores longos em chunks para
respeitar o limite de tamanho por chave do SecureStore.

| Ponto de verificação | Status |
| --- | --- |
| `autoRefreshToken: true` | ✅ |
| `persistSession: true` | ✅ |
| Storage nativo seguro via `expo-secure-store` | ✅ |
| Divisão de tokens em chunks para respeitar limite do SecureStore | ✅ |
| Web fallback sem SecureStore | ⚠️ Não aplicável ao app mobile nativo |

> **Observação:** o app mobile nativo não armazena tokens em `AsyncStorage`. O uso de
> `AsyncStorage` permanece apenas para cache local de oportunidades na tela inicial, sem
> armazenar credenciais ou tokens de sessão.

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
| --- | --- | --- |
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
| Termos de Uso redigidos | ✅ Rascunho revisado — `docs/termos-de-uso.md` |
| Política de Privacidade redigida | ✅ Rascunho revisado — `docs/politica-de-privacidade.md` |
| Tela de aceite de Termos de Uso e Política de Privacidade no onboarding | ⚠️ Gap — previsto para Sprint 3 (Track 2 Mobile) |
| Log de aceite armazenado (data/hora + versão) | ⚠️ Gap — depende da tela ser implementada (Sprint 3) |

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
| --- | --- | --- |
| ~~Screenshot de encryption at rest no Atlas~~ | ~~Vyktor~~ | ~~13/05~~ ✅ Documentado via política oficial MongoDB |
| ~~Screenshot de encryption at rest no Supabase~~ | ~~Vyktor / Pedro~~ | ~~13/05~~ ✅ Documentado via política oficial Supabase |
| ~~Confirmar RLS ativo em produção (todas as tabelas)~~ | ~~Vyktor / Pedro~~ | ~~13/05~~ ✅ |
| ~~Migrar mobile de `AsyncStorage` → `SecureStore`~~ | ~~Pedro / Yuri~~ | ~~Sprint 2~~ ✅ |
| Revisar logs Railway — confirmar sem PII | Vyktor / Pedro | Pós-deploy (fim Sprint 2) |
| Implementar tela de consentimento no onboarding | Thaíssa / Yuri / Pedro | Sprint 3 |
| Implementar fluxo de exclusão de conta (`DELETE /perfil`) | Pedro / Yuri | Sprint 3 |

---

## S4 — Disponibilidade e proteção contra ataques digitais

### 1. Superfície de ataque considerada

A revisão de disponibilidade e proteção contra ataques digitais considera os principais
pontos de entrada do Licitei:

| Componente | Exposição | Observação |
| --- | --- | --- |
| App mobile | Cliente público | Envia JWT Supabase para o backend e usa anon key pública |
| Backend Elysia | API HTTP pública | Principal superfície de ataque do sistema |
| MCP / Agente IA | API HTTP/SSE interna | Consumido pelo backend para chat e ferramentas de IA |
| Supabase | Auth, Postgres e Storage | Acesso direto do app apenas com anon key e políticas RLS |
| MongoDB Atlas | Banco de licitações | Acesso apenas por backend, MCP e pipeline via credencial privada |
| Pipeline PNCP | Worker interno | Consome API pública PNCP e grava dados tratados |

---

### 2. Controles implementados no backend

| Controle | Implementação | Status |
| --- | --- | --- |
| Autenticação obrigatória | Rotas protegidas usam `authPlugin` e validam JWT via Supabase Auth | ✅ |
| Bloqueio de token ausente/inválido | Retorno HTTP 401 para token ausente, inválido ou expirado | ✅ |
| Rate limiting | `elysia-rate-limit`, configurável por `RATE_LIMIT_WINDOW_MS` e `RATE_LIMIT_MAX_REQUESTS` | ✅ |
| CORS restrito | Origens permitidas via variável `ALLOWED_ORIGINS` | ✅ |
| Validação de entrada | Schemas Elysia (`t.Object`, `t.String`, `t.Numeric`) em rotas com body/query | ✅ |
| Tratamento global de erros | Handler `.onError()` evita retorno de stack trace ao usuário | ✅ |
| Health check | `/health` valida disponibilidade do backend, MongoDB e Supabase | ✅ |
| Timeout no chat IA | Proxy para MCP usa timeout de 30 segundos | ✅ |
| Proteção contra regex injection | Termos de busca são escapados antes de montar regex no MongoDB | ✅ |
| Chaves privadas fora do app | `SUPABASE_SERVICE_ROLE_KEY`, `MONGO_URI` e chaves LLM ficam apenas em variáveis de ambiente server-side | ✅ |

---

### 3. Proteções no app mobile

| Controle | Implementação | Status |
| --- | --- | --- |
| Sessão segura | Tokens persistidos com `expo-secure-store` em ambiente nativo | ✅ |
| Envio de token | Interceptor Axios adiciona `Authorization: Bearer <token>` | ✅ |
| Proteção de rotas | `_layout.tsx` redireciona usuários sem sessão para login | ✅ |
| Chave pública Supabase | Uso apenas da anon key, adequada para cliente público | ✅ |
| Service role não exposta | Não há `service_role` no app mobile | ✅ |

---

### 4. Proteções no MCP / agente de IA

| Controle | Implementação | Status |
| --- | --- | --- |
| Integração via backend | O app chama o backend, que faz proxy para o MCP | ✅ |
| Timeout via backend | Chamadas ao MCP são encerradas após 30 segundos | ✅ |
| Cache de respostas | Cache por `thread_id` + query reduz chamadas repetidas ao LLM | ✅ |
| Resposta amigável em falha | Backend retorna erro controlado quando MCP está indisponível | ✅ |
| Fonte em respostas | Agente orientado a citar fonte PNCP em respostas sobre editais | ✅ |

**Risco residual:** prompts maliciosos podem tentar induzir o agente a ignorar regras ou
expor informações internas. Como mitigação documental, o agente só possui tools de consulta
ao MongoDB de licitações e não recebe ferramentas administrativas de banco, autenticação ou
infraestrutura.

---

### 5. Riscos residuais e mitigação

| Risco | Impacto | Mitigação atual | Ação futura |
| --- | --- | --- | --- |
| Força bruta no login | Tentativas repetidas de senha | Delegado ao Supabase Auth | Revisar políticas de rate limit/MFA no painel Supabase |
| Abuso do chat IA | Consumo excessivo de LLM e custo/indisponibilidade | Rate limit no backend + timeout de 30s | Criar limite específico por usuário para `/chat` |
| Indisponibilidade do MCP | Chat indisponível | Backend retorna erro 503 amigável | Monitoramento e fallback operacional |
| Indisponibilidade do PNCP | Pipeline deixa de atualizar dados | MongoDB mantém última base processada | Reprocessamento quando PNCP voltar |
| Vazamento de credenciais de ambiente | Acesso indevido a bancos/APIs | `.env` fora do Git e uso de variáveis server-side | Rotação periódica de chaves |
| Logs com dados pessoais | Exposição indireta de PII | Revisão indica ausência de logs intencionais de PII no backend | Revisar logs após deploy |

---

## S5 — Backup e continuidade de operação

### 1. Serviços críticos

| Serviço | Dados / Função | Estratégia de continuidade |
| --- | --- | --- |
| Supabase Auth/Postgres | Usuários, perfis, participações, documentos, buscas e alertas | Backup gerenciado pela plataforma; exportação manual SQL no MVP |
| Supabase Storage | Arquivos enviados pelo MEI | Armazenamento gerenciado pela Supabase; bucket privado e metadados no Postgres |
| MongoDB Atlas | Licitações processadas e KPIs | Snapshot/backup conforme plano Atlas; dados públicos podem ser reprocessados pelo pipeline |
| Pipeline PNCP | Extração e transformação de licitações | Reexecução manual ou orquestrada via Prefect |
| Backend Elysia | API consumida pelo app | Reimplantação a partir do GitHub e variáveis de ambiente |
| MCP / Agente IA | Chat e ferramentas de IA | Reimplantação a partir do GitHub e variáveis de ambiente |
| Código-fonte | Aplicação e documentação | Versionado no GitHub |

---

### 2. Classificação de dados quanto à recuperabilidade

| Tipo de dado | Origem | Recuperabilidade |
| --- | --- | --- |
| Licitações PNCP | API pública PNCP | Alta — reprocessável pelo pipeline |
| KPIs Gold | MongoDB, derivados das licitações | Alta — recalculáveis a partir da base de licitações |
| Perfil do usuário | Supabase | Média/Alta — depende de backup/exportação Supabase |
| Participações e buscas salvas | Supabase | Média/Alta — depende de backup/exportação Supabase |
| Documentos enviados | Supabase Storage | Média — depende de backup da plataforma e do arquivo original do usuário |
| Logs | Railway/serviço de hospedagem | Baixa criticidade — usados apenas para diagnóstico |

---

### 3. Plano básico de recuperação

Em caso de indisponibilidade ou perda de ambiente, o procedimento mínimo de recuperação é:

```text
1. Restaurar variáveis de ambiente do backend, MCP, pipeline e mobile.
2. Subir o backend Elysia.
3. Subir o servidor MCP, se o chat estiver no escopo da entrega.
4. Validar `/health` para confirmar conexão com MongoDB e Supabase.
5. Validar login/cadastro pelo Supabase Auth.
6. Reexecutar o pipeline PNCP caso a coleção MongoDB precise ser repopulada.
7. Validar fluxo principal: login → oportunidades → detalhe do edital → acompanhar edital.
8. Validar chat IA e documentos, quando aplicável.
```

---

### 4. Riscos de continuidade

| Cenário | Impacto | Mitigação |
| --- | --- | --- |
| MongoDB indisponível | Listagem de editais e oportunidades indisponível | Manter última base e reprocessar PNCP após retorno |
| Supabase indisponível | Login e dados do usuário indisponíveis | Aguardar restabelecimento; exportações periódicas no MVP |
| Supabase Storage indisponível | Upload/visualização de documentos indisponível | App continua com busca e acompanhamento |
| MCP/Groq indisponível | Chat IA indisponível | Backend retorna erro amigável; app principal continua operacional |
| PNCP indisponível | Novas licitações não são ingeridas | Usar dados já processados no MongoDB |
| Perda de variáveis de ambiente | Serviços não iniciam | Manter inventário seguro de variáveis necessárias por ambiente |

---

### 5. Frequência recomendada de backup no MVP

| Item | Frequência recomendada | Responsável |
| --- | --- | --- |
| Exportação SQL do Supabase | Semanal durante a disciplina | Backend / Segurança |
| Exportação ou snapshot MongoDB | Semanal ou antes da apresentação | Dados / Segurança |
| Verificação do bucket `documentos` | Semanal | Mobile / Backend |
| Validação do `/health` | Antes de cada entrega | Backend |
| Teste de reexecução do pipeline | Antes da apresentação final | Dados |

> **Nota:** por ser um MVP acadêmico em free tier, parte dos backups depende das garantias dos
> fornecedores. A estratégia documentada combina backup gerenciado, exportação manual e
> reprocessamento dos dados públicos do PNCP.

---

## S6 — Gestão de fornecedores

### 1. Fornecedores e suboperadores

| Fornecedor | Uso no projeto | Dados tratados | Risco | Mitigação |
| --- | --- | --- | --- | --- |
| Supabase | Auth, Postgres e Storage | E-mail, perfil MEI, CNPJ, documentos, participações, buscas e alertas | Alto | RLS, JWT, bucket privado, service role apenas no backend, criptografia em repouso |
| MongoDB Atlas | Licitações processadas e KPIs | Dados públicos do PNCP, sem PII direta | Médio | Criptografia em repouso, credencial privada, acesso apenas server-side |
| Groq | LLM da LicIA | Perguntas do usuário e contexto enviado pelo agente | Médio/Alto | Enviar apenas contexto necessário; não usar tools administrativas |
| Railway | Hospedagem do backend/MCP quando deployado | Tráfego da API, logs técnicos e variáveis de ambiente | Médio | HTTPS, variáveis de ambiente e revisão de logs sem PII |
| Expo / EAS | Build e distribuição do app mobile | Artefatos do app e metadados de build | Baixo/Médio | Não incluir secrets privadas no bundle mobile |
| BrasilAPI | Consulta pública de CNPJ/CNAE | CNPJ usado para obter CNAE | Médio | Uso limitado à finalidade de matching de oportunidades |
| PNCP | Fonte oficial de licitações | Dados públicos de contratações | Baixo | Fonte governamental oficial; dados tratados como públicos |
| GitHub | Versionamento do código | Código-fonte e documentação | Médio | Não versionar `.env`; manter `.env.example` sem segredos |

---

### 2. Critérios de avaliação de fornecedores

Os fornecedores foram avaliados conforme os seguintes critérios:

| Critério | Aplicação |
| --- | --- |
| Criptografia em trânsito | Serviços devem operar via HTTPS/TLS |
| Criptografia em repouso | Bancos e storage devem oferecer proteção gerenciada |
| Controle de acesso | Uso de chaves, tokens, JWT, RLS ou credenciais privadas |
| Separação de credenciais | Chaves privadas apenas em backend/MCP/pipeline |
| Revogação de credenciais | Possibilidade de trocar chaves e tokens em caso de incidente |
| Finalidade do tratamento | Cada fornecedor deve receber apenas dados necessários à sua função |
| Transferência internacional | Identificação de serviços fora do Brasil para fins de LGPD |
| Documentação pública de segurança | Preferência por fornecedores com documentação de segurança disponível |

---

### 3. Pontos de atenção por fornecedor

| Fornecedor | Ponto de atenção | Tratamento |
| --- | --- | --- |
| Supabase | Concentra autenticação e dados pessoais | RLS obrigatório, service role protegida, backups/exportações |
| Groq | Pode receber texto digitado pelo usuário no chat | Não enviar documentos sensíveis ao LLM sem necessidade |
| BrasilAPI | Recebe CNPJ para consulta CNAE | Consulta justificada pela finalidade do serviço |
| Railway | Logs podem conter dados se a aplicação registrar PII | Revisar logs após deploy e evitar `console.log` de dados pessoais |
| Expo | Variáveis `EXPO_PUBLIC_*` são públicas no app | Nunca colocar secrets privadas como `service_role` ou `MONGO_URI` no mobile |

---

### 4. Inventário de credenciais

| Credencial | Onde deve existir | Pode ir para o app mobile? |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | ✅ Sim, URL pública |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | ✅ Sim, anon key pública protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend/MCP apenas | ❌ Não |
| `MONGO_URI` | Backend/MCP/pipeline apenas | ❌ Não |
| `GROQ_API_KEY` | MCP apenas | ❌ Não |
| `MCP_URL` | Backend | ❌ Não é segredo, mas é config server-side |
| `PNCP_*` | Pipeline | ❌ Não |

---

### 5. Conclusão da gestão de fornecedores

O Licitei utiliza fornecedores compatíveis com o escopo de um MVP acadêmico. Os maiores
riscos estão concentrados em Supabase, Groq e Railway, por tratarem autenticação, dados
pessoais, prompts de usuário e logs operacionais. A mitigação adotada é minimizar o envio
de dados, manter credenciais privadas fora do app mobile, usar RLS no Supabase e revisar
logs e variáveis de ambiente antes da apresentação final.
