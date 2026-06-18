# Política de Privacidade — Licitei

**Versão:** 1.1  
**Vigência:** 14/05/2026  
**Última atualização:** 10/06/2026

---

## 1. Quem somos

O **Licitei** é uma plataforma desenvolvida pelo **Grupo 10 da CESAR School**, com sede em Recife/PE, Brasil. Para fins desta Política de Privacidade, o Grupo 10 é o **controlador dos dados**, ou seja, quem decide como e por que os seus dados são tratados.

**Contato do controlador:**  
E-mail: [EMAIL DE CONTATO]  
Endereço: CESAR School — Recife/PE, Brasil

---

## 2. Para quem é este documento

Esta política se aplica a qualquer pessoa que utilize o aplicativo Licitei, em especial **Microempreendedores Individuais (MEIs)** que usam a plataforma para buscar e acompanhar licitações públicas.

---

## 3. Quais dados coletamos e como

### 3.1 Dados fornecidos por você

| Dado | Quando é coletado |
| --- | --- |
| E-mail | No cadastro e login |
| Senha | No cadastro (nunca armazenamos sua senha em texto — veja seção 7) |
| Nome fantasia | Ao preencher seu perfil |
| CNPJ | Ao preencher seu perfil |
| CNAE (ramo de atividade) | Automaticamente a partir do CNPJ via base pública (BrasilAPI) |
| UF de operação | Ao preencher seu perfil |
| Documentos (certidões, comprovantes) | Quando você os envia pelo app |
| Buscas salvas | Quando você salva uma busca no app |
| Participações em licitações | Quando você registra interesse em um edital |
| Alertas de prazo | Quando você configura notificações |

### 3.2 Dados coletados automaticamente

| Dado | Como é coletado |
| --- | --- |
| Identificador de sessão (UUID) | Gerado automaticamente pelo Supabase Auth no login |
| Logs de erro do sistema | Gerados automaticamente pelo servidor — sem dados pessoais identificáveis |

> Não utilizamos cookies de rastreamento nem compartilhamos dados com plataformas de publicidade.

---

## 4. Por que usamos seus dados (finalidade e base legal)

Toda coleta de dados tem uma razão específica. A tabela abaixo explica cada uma delas, com a base legal da LGPD (Lei 13.709/2018, art. 7º) que nos autoriza:

| Dado | Finalidade | Base legal (LGPD) |
| --- | --- | --- |
| E-mail e senha | Criar e proteger sua conta | Execução de contrato (art. 7º, V) |
| Nome fantasia e CNPJ | Identificar você como MEI e personalizar resultados | Execução de contrato (art. 7º, V) |
| CNAE e UF | Filtrar licitações relevantes para o seu ramo e região | Execução de contrato (art. 7º, V) |
| Documentos enviados | Organizar e exibir seus documentos no checklist de habilitação | Execução de contrato (art. 7º, V) |
| Buscas salvas | Permitir que você reutilize buscas frequentes | Legítimo interesse (art. 7º, IX) |
| Participações e alertas | Acompanhar editais e enviar notificações de prazo | Execução de contrato (art. 7º, V) |
| Logs de erro | Diagnosticar problemas técnicos no sistema | Legítimo interesse (art. 7º, IX) |

---

## 5. Com quem compartilhamos seus dados

Não vendemos seus dados. Não compartilhamos com anunciantes. Utilizamos apenas os seguintes **suboperadores** — empresas que nos ajudam a operar a plataforma com segurança:

| Suboperador | O que faz | País dos servidores |
| --- | --- | --- |
| **Supabase** | Armazena seu perfil, documentos, participações e autenticação | EUA (AWS) |
| **MongoDB Atlas** | Armazena dados de licitações (informações públicas do PNCP) | Brasil (AWS São Paulo) |
| **Render** | Hospeda o servidor do aplicativo (backend e agente IA) | EUA |
| **Groq** | Processa as consultas ao assistente de IA integrado | EUA |
| **Expo / EAS** | Distribui as atualizações do app mobile | EUA |
| **BrasilAPI** | Consulta pública para obter o CNAE a partir do CNPJ | Brasil |

Todos os suboperadores são contratados para finalidades específicas e não podem usar seus dados para outros fins.

---

## 6. Por quanto tempo guardamos seus dados

| Dado | Prazo de retenção |
| --- | --- |
| Dados de perfil (nome, CNPJ, CNAE, UF) | Enquanto sua conta estiver ativa |
| Documentos enviados | Enquanto sua conta estiver ativa ou até você excluí-los |
| Participações e alertas | Enquanto sua conta estiver ativa |
| Buscas salvas | Enquanto sua conta estiver ativa ou até você removê-las |
| Logs de erro | Até 90 dias |
| Dados após encerramento da conta | Excluídos em até 30 dias após a solicitação |

---

## 7. Como protegemos seus dados

Adotamos medidas técnicas para proteger suas informações:

- **Criptografia em repouso:** todos os dados armazenados no Supabase e no MongoDB Atlas são criptografados com AES-256 pela infraestrutura das plataformas (AWS e MongoDB).
- **Criptografia em trânsito:** toda comunicação entre o app e os servidores usa TLS 1.2 ou superior.
- **Senha:** sua senha nunca é armazenada em texto legível — o Supabase Auth aplica hashing (bcrypt) antes de qualquer armazenamento.
- **Acesso isolado:** cada usuário acessa apenas seus próprios dados, por meio de políticas de Row Level Security (RLS) ativas em todos os bancos de dados.
- **Token de sessão (JWT):** sua autenticação é validada a cada requisição por token com expiração automática.
- **Documentos:** arquivos enviados ficam em bucket privado com acesso restrito via URL assinada.

---

## 8. Seus direitos como titular de dados

Você tem os seguintes direitos garantidos pela LGPD:

| Direito (LGPD — art. 18 e 20) | Como exercer no Licitei |
| --- | --- |
| **Confirmação:** saber se tratamos dados seus | Disponível em Configurações → Meu Perfil no app |
| **Acesso:** ver quais dados temos sobre você | Disponível em Configurações → Meu Perfil no app |
| **Correção:** corrigir dados incorretos ou desatualizados | Disponível em Configurações → Meu Perfil no app |
| **Exclusão / Anonimização / Bloqueio:** apagar ou bloquear dados desnecessários | Disponível em Configurações → Excluir conta no app. Dados excluídos em até 30 dias. |
| **Portabilidade:** receber seus dados em formato estruturado | Solicitar via [EMAIL DE CONTATO] |
| **Informação sobre compartilhamento:** saber com quem seus dados foram compartilhados | Seção 5 desta Política |
| **Revogação do consentimento:** cancelar o uso dos seus dados | Solicitar via [EMAIL DE CONTATO] — implica encerramento da conta |
| **Revisão de decisões automatizadas (art. 20):** contestar recomendações geradas pela IA do app | Solicitar via [EMAIL DE CONTATO] |

Para exercer qualquer direito não disponível diretamente no app, entre em contato pelo e-mail **[EMAIL DE CONTATO]**. Atenderemos sua solicitação em até **15 dias**, conforme o art. 19 da LGPD.

---

## 9. Cookies e rastreamento

O aplicativo Licitei **não utiliza cookies de rastreamento** nem tecnologias de monitoramento comportamental para fins publicitários.

Utilizamos armazenamento seguro local no dispositivo, via Expo SecureStore em ambiente mobile nativo, para manter sua sessão ativa entre usos do app. Esses dados ficam no seu próprio dispositivo e não são acessados por terceiros.

---

## 10. Dados de menores

O Licitei é destinado exclusivamente a **Microempreendedores Individuais (MEIs)**, que por definição legal devem ser maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.

---

## 11. Transferência internacional de dados

Alguns de nossos suboperadores (Supabase, Render, Groq, Expo) estão localizados fora do Brasil. Essas transferências são realizadas em conformidade com o **art. 33 da LGPD** e com a **Resolução CD/ANPD nº 19/2024**, que regulamenta as Cláusulas Padrão Contratuais (CPCs) para transferências internacionais. Os suboperadores são contratados com obrigações contratuais de proteção equivalentes às previstas na legislação brasileira, e nenhum dado é transferido para fins além dos descritos nesta Política.

---

## 12. Alterações nesta política

Quando alterarmos esta política, você será notificado por:

- Aviso no aplicativo no próximo acesso após a mudança
- Atualização da data de vigência no topo deste documento

O uso continuado do app após a notificação implica aceite das novas condições. Se não concordar, você pode encerrar sua conta.

---

## 13. Contato e canal de privacidade

Para dúvidas, solicitações ou reclamações relacionadas à privacidade dos seus dados:

**E-mail:** [EMAIL DE CONTATO]  
**Prazo de resposta:** até 15 dias (art. 19 da LGPD)

Você também pode registrar reclamações perante a **Autoridade Nacional de Proteção de Dados (ANPD)**: [gov.br/anpd](https://www.gov.br/anpd)

---

Licitei — Grupo 10 · CESAR School · Recife/PE · Brasil

Documento sujeito à Lei Geral de Proteção de Dados — Lei 13.709/2018
