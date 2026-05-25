# Backlog Técnico do Aplicativo

## Objetivo

Este documento apresenta o backlog técnico do aplicativo, organizado em épicos, histórias de usuário e critérios de aceitação. O objetivo é estruturar as funcionalidades necessárias para o desenvolvimento do sistema, auxiliando no acompanhamento das sprints, organização da equipe e validação das entregas do projeto.

---

## ÉPICO 1 — Autenticação

### História — Cadastro de usuário

*Como usuário* quero criar uma conta no aplicativo para acessar as funcionalidades da plataforma.

**Critérios de aceite**

- Deve existir uma tela de cadastro.
- Usuário deve conseguir informar nome, endereço, email e senha.
- Após o cadastro concluído, o usuário deve ser redirecionado para a área principal do aplicativo.

### História — Login de usuário

*Como usuário*, quero realizar login no aplicativo para acessar minha conta.

**Critérios de aceite**

- Deve existir tela de login.
- Deve existir campo para email/login.
- Deve existir campo para senha.
- Após login realizado, o usuário deve ser redirecionado para a área principal.

---

## ÉPICO 2 — Gestão de Editais

### História — Visualizar lista de editais

Como usuário, quero visualizar editais disponíveis para acompanhar oportunidades relevantes.

**Critérios de aceite**

- O sistema deve listar editais disponíveis.
- Cada edital deve exibir título, prazo e status.
- A tela deve buscar dados da API sempre que for aberta.
- Deve existir indicador de carregamento enquanto os dados estiverem sendo buscados.

### História — Pesquisar editais

*Como usuário*, quero pesquisar editais para encontrar oportunidades específicas.

**Critérios de aceite**

- Deve existir campo de pesquisa.
- O sistema deve filtrar editais de acordo com o termo pesquisado.
- O sistema deve atualizar a listagem automaticamente após aplicação do filtro.

### História — Visualizar detalhes do edital

*Como usuário*, quero visualizar informações detalhadas de um edital para acompanhar seu andamento.

**Critérios de aceite**

- O sistema deve exibir o prazo do edital.
- O sistema deve exibir valor do edital.
- O sistema deve exibir status do edital.
- Deve existir acesso aos documentos relacionados ao edital.
- O detalhe do edital deve exibir checklist de habilitação gerado pelo assistente IA.

---

## ÉPICO 3 — Gestão de Participações

### História — Visualizar disputas em andamento

*Como usuário*, quero acompanhar editais em andamento para monitorar minhas participações.

**Critérios de aceite**

- O sistema deve listar disputas ativas.
- Deve exibir status da disputa.
- Deve exibir órgão responsável pelo edital.
- Deve permitir acesso ao detalhe do edital.

### História — Visualizar histórico de participações

*Como usuário*, quero visualizar meu histórico de participações em editais.

**Critérios de aceite**

- O sistema deve listar editais encerrados.
- Deve existir separação entre disputas ativas e histórico.
- O histórico deve exibir status final da participação.

---

## ÉPICO 4 — Gestão de Documentos

### História — Visualizar documentos

*Como usuário*, quero visualizar documentos relacionados aos editais.

**Critérios de aceite**

- O sistema deve listar documentos vinculados ao edital.
- Deve existir separação entre documentos enviados e pendentes.
- Usuário deve conseguir visualizar os documentos.

### História — Enviar documentos

*Como usuário*, quero enviar documentos para participar dos editais.

**Critérios de aceite**

- Deve existir botão de upload de documento.
- O sistema deve validar o envio do arquivo.
- O status do documento deve ser atualizado após envio.

### História — Atualizar documentos

Como usuário, quero atualizar documentos enviados para corrigir ou substituir arquivos.

**Critérios de aceite**

- Usuário deve conseguir substituir documentos enviados.
- O sistema deve atualizar o status do documento.
- O novo arquivo deve ficar disponível para visualização.

---

## ÉPICO 5 — Perfil do Usuário

### História — Visualizar perfil

*Como usuário*, quero visualizar minhas informações pessoais no aplicativo.

**Critérios de aceite**

- O sistema deve exibir nome do usuário.
- O sistema deve exibir endereço do usuário.
- O sistema deve exibir métricas de participação.

### História — Editar perfil

*Como usuário*, quero editar meus dados pessoais para manter minhas informações atualizadas.

**Critérios de aceite**

- Deve existir funcionalidade de edição de perfil.
- O sistema deve salvar alterações realizadas.
- As informações atualizadas devem ser exibidas corretamente.

---

## ÉPICO 6 — Dashboard / Início

### História — Visualizar resumo geral

*Como usuário*, quero visualizar um resumo das minhas atividades dentro do aplicativo.

**Critérios de aceite**

- A tela inicial deve exibir editais em andamento.
- Deve exibir métricas de participação.
- Deve exibir acesso rápido às funcionalidades principais.

---

## ÉPICO 7 — Alertas e Notificações

### História — Visualizar alertas

*Como usuário*, quero receber alertas sobre editais e disputas para acompanhar atualizações importantes.

**Critérios de aceite**

- O sistema deve exibir notificações relevantes.
- Usuário deve conseguir acessar alertas recentes.
- Alertas devem direcionar para o edital correspondente.

### História — Visualizar calendário de prazos

Como usuário, quero visualizar meus editais em andamento em um calendário para não perder prazos importantes.

**Critérios de aceite**

- O sistema deve exibir calendário de editais.
- Deve exibir datas de vencimento e participação.
- O usuário deve conseguir acessar o edital pelo calendário.

---

## ÉPICO 8 — Assistente IA

### História — Conversar com assistente IA

*Como usuário*, quero conversar com um assistente em linguagem natural para entender editais e receber orientações sobre como participar.

**Critérios de aceite**

- Deve existir campo de texto para envio de perguntas.
- O sistema deve exibir respostas do assistente IA em tempo real.
- As respostas devem exibir a fonte das informações utilizadas.
- O assistente deve responder perguntas relacionadas aos editais.

---

## ÉPICO 9 — Buscas Salvas

### História — Salvar buscas frequentes

*Como usuário*, quero salvar buscas frequentes para não precisar configurar filtros toda vez.

**Critérios de aceite**

- Deve existir botão para salvar busca.
- Usuário deve conseguir visualizar buscas salvas.
- Usuário deve conseguir remover buscas salvas.
- As buscas salvas devem manter os filtros selecionados.

---

## ÉPICO 10 — Elegibilidade MEI

### História — Visualizar elegibilidade do edital

*Como usuário MEI*, quero saber se um edital é adequado para o meu porte para evitar oportunidades incompatíveis.

**Critérios de aceite**

- O sistema deve exibir badge de elegibilidade.
- O badge deve indicar editais exclusivos para MEI.
- O sistema deve exibir limite de participação quando aplicável.
- A informação deve aparecer na listagem e no detalhe do edital.

---

## Considerações Finais

Este backlog técnico representa a estrutura inicial de funcionalidades do aplicativo Licitei e poderá sofrer alterações durante o desenvolvimento do projeto, conforme revisões técnicas, testes de usabilidade e feedbacks coletados ao longo das sprints.

A organização em épicos, histórias de usuário e critérios de aceite busca facilitar o acompanhamento das entregas, validação das funcionalidades e alinhamento entre os membros da equipe de desenvolvimento.
