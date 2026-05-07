# Guia de Integração Backend ↔ Mobile

---

## Supabase — Tabelas necessárias

### `mei_profile`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid (PK) | `gen_random_uuid()` |
| `user_id` | uuid | FK para `auth.users`, único |
| `nome_fantasia` | text | |
| `cnpj` | text | 14 dígitos, sem máscara, único |
| `uf` | char(2) | 2 letras maiúsculas |
| `cnae` | text | preenchido automaticamente via BrasilAPI no `PUT /perfil` |
| `ramo_atuacao` | text | preenchido automaticamente via BrasilAPI no `PUT /perfil` |

### `participacoes`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `user_id` | uuid | FK para `auth.users` |
| `licitacao_id` | text | `numero_controle_pncp` do MongoDB |
| `status` | text | ver valores válidos abaixo |
| `objeto_compra` | text | desnormalizado do MongoDB |
| `orgao_nome` | text | desnormalizado do MongoDB |
| `valor_estimado` | numeric | desnormalizado do MongoDB |
| `data_encerramento` | timestamptz | desnormalizado do MongoDB |
| `created_at` | timestamptz | default `now()` |

**Status válidos:** `acompanhando`, `proposta_enviada`, `venceu`, `perdeu`, `desistiu`

### `saved_searches`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `user_id` | uuid | FK para `auth.users` |
| `termo_busca` | text | ex: "limpeza", "TI" |
| `filtros` | jsonb | opcional — `{ "uf": "PE", "valor_min": 0, "valor_max": 50000 }` |
| `created_at` | timestamptz | default `now()` |

---

## Endpoints e shapes esperados pelo mobile

### `GET /oportunidades`

**Query params suportados:** `page`, `limit`, `uf`, `valor_max`

**Resposta esperada:**

```json
{
  "data": [
    {
      "numero_controle_pncp": "string",
      "objeto_compra": "string",
      "orgao_razao_social": "string",
      "valor_total_estimado": 15000,
      "modalidade_nome": "string",
      "uf": "PE",
      "municipio": "Recife",
      "data_encerramento_proposta": "2026-06-15T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5,
  "keywords_usados": ["software", "tecnologia"]
}
```

### `GET /alertas`

**Resposta esperada:**

```json
{
  "data": [
    { "tipo": "prazo_curto", "dias_restantes": 3, "licitacao_id": "string", "objeto_compra": "string", "orgao_nome": "string", "mensagem": "string" },
    { "tipo": "teto_mei", "urgente": false, "soma_participacoes": 55000, "teto": 81000, "mensagem": "string" },
    { "tipo": "novo_edital", "mensagem": "string", "edital": { "numero_controle_pncp": "string", "objeto_compra": "string" } }
  ],
  "total": 3
}
```

### `GET /participacoes`

**Resposta esperada:**

```json
{
  "data": [
    {
      "id": "uuid",
      "licitacao_id": "string",
      "status": "acompanhando",
      "objeto_compra": "string",
      "orgao_nome": "string",
      "valor_estimado": 15000,
      "data_encerramento": "2026-06-15T00:00:00Z",
      "created_at": "2026-05-01T10:00:00Z"
    }
  ]
}
```

### `POST /participacoes`

**Body:**

```json
{ "licitacao_id": "numero_controle_pncp_do_edital" }
```

### `PATCH /participacoes/:id`

**Body:**

```json
{ "status": "proposta_enviada" }
```

### `GET /perfil`

**Resposta esperada:**

```json
{
  "user_id": "uuid",
  "nome_fantasia": "Empresa Exemplo",
  "cnpj": "12345678000195",
  "uf": "PE",
  "cnae": "6201-5/00",
  "ramo_atuacao": "Desenvolvimento de softwares"
}
```

### `PUT /perfil`

**Body:**

```json
{
  "nome_fantasia": "string",
  "cnpj": "00.000.000/0000-00",
  "uf": "PE",
  "ramo_atuacao": "string (opcional)"
}
```

### `GET /saved-searches`

**Resposta esperada:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "termo_busca": "limpeza",
      "filtros": { "uf": "PE", "valor_max": 50000 },
      "created_at": "2026-05-01T10:00:00Z"
    }
  ]
}
```

### `POST /saved-searches`

**Body:**

```json
{ "termo_busca": "limpeza", "filtros": { "uf": "PE", "valor_min": 0, "valor_max": 50000 } }
```

Retorna `201` com o registro criado. Retorna `409` se `termo_busca` já foi salvo anteriormente.

### `DELETE /saved-searches/:id`

Retorna `{ "message": "Pesquisa salva removida com sucesso" }` em sucesso. Retorna `404` se não encontrado.

---

## Pendências no backend

- [x] Confirmar que as tabelas do Supabase existem com os schemas acima — verificado em 07/05/2026
- [x] Garantir RLS (Row Level Security) nas tabelas — confirmado em 07/05/2026
- [ ] Endpoint `POST /chat` — mobile ainda não consome, mas deve estar funcionando

---

## Variáveis de ambiente necessárias

```env
EXPO_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
EXPO_PUBLIC_API_URL=http://localhost:3000
```
