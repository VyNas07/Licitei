# Contribuindo com o Licitei

Bem-vindo ao repositório do Licitei. Leia este guia antes de começar a trabalhar — ele evita os erros mais comuns e mantém o projeto organizado para todos.

---

## Pré-requisitos

Antes de qualquer coisa, certifique-se de ter instalado:

- [Git](https://git-scm.com/)
- [Python 3.11+](https://www.python.org/) — para os tracks de dados e IA
- [Node.js 20+](https://nodejs.org/) — para backend (Elysia) e mobile (React Native)
- Conta no [MongoDB Atlas](https://www.mongodb.com/atlas) com acesso ao cluster do projeto
- Acesso ao [Supabase](https://supabase.com/) do projeto (solicite ao responsável)

---

## Configurando o ambiente

### 1. Clone o repositório

```bash
git clone https://github.com/VyNas07/Licitei.git
cd Licitei
```

### 2. Entre no subprojeto do seu track

```bash
cd etl          # Track 1 — Dados
cd backend      # Track 2 — Backend
cd mobile       # Track 2 — Mobile
cd mcp          # Track 3 — IA & MCP
cd data-science # Track 1 — Data Science
```

### 3. Configure o ambiente virtual e as dependências

Para tracks Python:

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

### 4. Configure as variáveis de ambiente

Cada track tem seu próprio `.env`. **Nunca commite o arquivo `.env`.**

```bash
cp .env.example .env
# Preencha com suas credenciais — peça ao responsável do track se não tiver acesso
```

Consulte o `README.md` do seu track para ver todas as variáveis necessárias.

---

## Fluxo de trabalho com Git

### Regra principal

**Nunca commite diretamente em `main` ou `develop`.** Sempre trabalhe em uma branch separada.

### Passo a passo

```bash
# 1. Garanta que sua develop local está atualizada
git checkout develop
git pull origin develop

# 2. Crie sua branch a partir de develop
git checkout -b feature/descricao-curta

# 3. Faça suas alterações e commite
git add <arquivos>
git commit -m "feat: descrição do que foi feito"

# 4. Envie para o remoto
git push origin feature/descricao-curta

# 5. Abra um Pull Request de feature/... → develop no GitHub
```

### Nomenclatura de branches

| Tipo | Padrão | Exemplo |
| --- | --- | --- |
| Nova funcionalidade | `feature/<descricao>` | `feature/filtro-por-uf` |
| Correção de bug | `fix/<descricao>` | `fix/paginacao-extractor` |
| Configuração/infra | `chore/<descricao>` | `chore/atualiza-dependencias` |
| Documentação | `docs/<descricao>` | `docs/readme-backend` |

---

## Convenções de commit

Use o padrão [Conventional Commits](https://www.conventionalcommits.org/) em português.

### Formato

```
<tipo>: <descrição curta no imperativo>
```

### Tipos

| Tipo | Quando usar |
| --- | --- |
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Apenas documentação |
| `refactor:` | Refatoração sem mudança de comportamento |
| `chore:` | Configuração, dependências, infraestrutura |
| `test:` | Adição ou correção de testes |

### Exemplos

```bash
feat: adiciona filtro por município no extractor
fix: corrige paginação quando API retorna HTTP 204
docs: atualiza variáveis de ambiente no README do ETL
chore: adiciona .env.example para o track de backend
refactor: extrai lógica de retry para método separado
```

### Regras

- Mensagem em português
- Descrição no imperativo ("adiciona", não "adicionando" ou "adicionei")
- Sem ponto final
- **Nunca adicione `Co-Authored-By` de IAs nas mensagens de commit**

---

## Regras inegociáveis

Estas regras se aplicam a todos os tracks e todos os membros:

### Git

- Nunca commite em `main` ou `develop` diretamente
- Nunca commite o arquivo `.env` — ele contém credenciais reais
- Todo PR deve ter `develop` como branch base, nunca `main`
- Antes de qualquer `reset --hard`, `rebase` ou operação destrutiva: **confirme com o time**

### Código Python

- Use `loguru` para logs — nunca `print()`
- Use upsert no MongoDB — nunca `insert_many` puro (causa duplicatas)
- Type hints em todas as funções
- Docstrings em português em todas as classes e métodos públicos
- Variáveis de ambiente via `.env` — nunca credenciais no código

### Geral

- Cada track roda de forma independente — não quebre a estrutura do monorepo
- Se uma mudança afeta mais de um track, avise o responsável antes

---

## Abrindo um Pull Request

1. Certifique-se de que sua branch está atualizada com `develop`
2. A branch base do PR deve ser **`develop`**, não `main`
3. Descreva o que foi feito e por quê
4. Se resolver um problema conhecido, mencione no PR

O merge de `develop` → `main` é feito pelo responsável do projeto após validação.

---

## Onde encontrar mais informações

| O que | Onde |
| --- | --- |
| Visão geral do projeto | [README.md](README.md) |
| ETL — como rodar | [etl/README.md](etl/README.md) |
| Arquitetura técnica | [etl/docs/architecture.md](etl/docs/architecture.md) |
| Documentação completa | [Notion do projeto](https://www.notion.so/Projeto-Integrador-MEI-Licita-es-CESAR-School-33c97155b5d980dca01fe04fc306670e) |
| Dúvidas | Fale com Vyktor (responsável pelo repositório) |
