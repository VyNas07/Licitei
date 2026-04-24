# Supabase Schema

> **Status: definido — 23/04/2026**
> Aprovado por Vyktor. Referência para Pedro e Yuri iniciarem o backend.

A tabela `auth.users` é gerenciada automaticamente pelo Supabase Auth.
Todas as tabelas abaixo referenciam `auth.users(id)` via `user_id`.

---

## Tabelas

### `mei_profile`

Perfil do MEI. Relação 1:1 com `auth.users`.

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | sim | FK → `auth.users(id)`, único |
| `nome_fantasia` | `text` | sim | nome do negócio |
| `cnpj` | `text` | sim | único, 14 chars sem máscara |
| `cnae` | `text` | não | código CNAE do MEI (ex: `4711-3/02`) — usado pelo MCP para busca automática |
| `ramo_atuacao` | `text` | não | termo de busca manual — fallback quando CNAE não resolve (ver ADR 004) |
| `uf` | `char(2)` | sim | estado de operação — filtro default de região no RF01 |
| `created_at` | `timestamptz` | sim | `now()` |
| `updated_at` | `timestamptz` | sim | atualizado via trigger |

---

### `saved_searches`

Buscas salvas pelo MEI. Relação N:1 com `auth.users`.

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK |
| `user_id` | `uuid` | sim | FK → `auth.users(id)` |
| `termo_busca` | `text` | sim | ex: "limpeza", "TI" |
| `filtros` | `jsonb` | não | `{ "uf": "PE", "valor_min": 0, "valor_max": 50000 }` |
| `created_at` | `timestamptz` | sim | `now()` |

`filtros` como JSONB permite que o usuário salve qualquer combinação de filtros sem colunas mortas.

---

### `participacoes`

Licitações que o MEI está acompanhando. Alimenta RF05 (dashboard de histórico).

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK |
| `user_id` | `uuid` | sim | FK → `auth.users(id)` |
| `licitacao_id` | `text` | sim | `numeroControlePNCP` do MongoDB |
| `status` | `text` | sim | ver enum abaixo |
| `objeto_compra` | `text` | sim | desnormalizado do MongoDB |
| `orgao_nome` | `text` | sim | desnormalizado do MongoDB |
| `valor_estimado` | `numeric` | não | desnormalizado do MongoDB |
| `data_encerramento` | `timestamptz` | não | alimenta o calendário de prazos |
| `created_at` | `timestamptz` | sim | `now()` |
| `updated_at` | `timestamptz` | sim | atualizado via trigger |

**Enum `status`:** `acompanhando` · `proposta_enviada` · `venceu` · `perdeu` · `desistiu`

Os campos `objeto_compra`, `orgao_nome` e `valor_estimado` são desnormalizados
para que o dashboard de RF05 funcione sem round-trip ao MongoDB a cada render.
O `licitacao_id` permite buscar o detalhe completo no MongoDB quando necessário.

---

### `checklist_itens`

Itens do checklist de habilitação por participação. Alimenta RF02. Sprint 2.

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK |
| `participacao_id` | `uuid` | sim | FK → `participacoes(id)` |
| `user_id` | `uuid` | sim | FK → `auth.users(id)` (necessário para RLS) |
| `descricao` | `text` | sim | gerado pelo MCP (Tool: checklist) |
| `concluido` | `boolean` | sim | default `false` |
| `created_at` | `timestamptz` | sim | `now()` |

---

### `documentos`

Metadados dos documentos do MEI. Alimenta RF03. O arquivo em si fica no Supabase Storage.

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK |
| `user_id` | `uuid` | sim | FK → `auth.users(id)` |
| `participacao_id` | `uuid` | não | FK → `participacoes(id)` — null = documento do perfil geral |
| `nome` | `text` | sim | ex: "Certidão Negativa Federal" |
| `tipo` | `text` | sim | ver enum abaixo |
| `url` | `text` | sim | path no Supabase Storage |
| `status` | `text` | sim | ver enum abaixo |
| `validade` | `date` | não | data de vencimento do documento |
| `created_at` | `timestamptz` | sim | `now()` |
| `updated_at` | `timestamptz` | sim | atualizado via trigger |

**Enum `tipo`:** `certidao_negativa` · `contrato_social` · `comprovante_endereco` · `cnpj` · `outro`

**Enum `status`:** `pendente` · `valido` · `vencido`

---

### `alertas`

Configurações de notificação por prazo. Alimenta RF04.

| Campo | Tipo | Obrigatório | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | sim | PK |
| `user_id` | `uuid` | sim | FK → `auth.users(id)` |
| `participacao_id` | `uuid` | sim | FK → `participacoes(id)` |
| `tipo` | `text` | sim | ver enum abaixo |
| `prazo` | `timestamptz` | sim | quando disparar a notificação |
| `antecedencia_horas` | `int` | sim | default `24` |
| `notificado` | `boolean` | sim | default `false` |
| `notificado_at` | `timestamptz` | não | preenchido ao disparar |
| `created_at` | `timestamptz` | sim | `now()` |

**Enum `tipo`:** `prazo_encerramento` · `prazo_proposta` · `custom`

---

## Relações

```
auth.users
  ├── mei_profile          (1:1)
  ├── saved_searches        (1:N)
  └── participacoes         (1:N)
        ├── checklist_itens (1:N)
        ├── alertas         (1:N)
        └── documentos      (1:N, participacao_id preenchido)

auth.users
  └── documentos            (1:N, participacao_id = null → documento do perfil geral)
```

---

## Prioridade por Sprint

| Tabela | Sprint | RF |
| --- | --- | --- |
| `mei_profile` | 1 | Auth + onboarding |
| `saved_searches` | 1 | RF01 |
| `participacoes` | 1 | RF01 + RF05 |
| `checklist_itens` | 2 | RF02 |
| `documentos` | 2 | RF03 |
| `alertas` | 2 | RF04 |

---

## Observações de implementação

- Ativar **Row Level Security (RLS)** em todas as tabelas. Política padrão: usuário acessa apenas seus próprios registros (`user_id = auth.uid()`).
- Criar trigger `set_updated_at` para atualizar `updated_at` automaticamente em `mei_profile`, `participacoes` e `documentos`.
- O Supabase Auth gerencia senha, email e sessão — não armazenar tokens na aplicação.
