# API Contract — Licitei Backend

> **Versão:** 1.1 — Sprint 2
> **Base URL (dev):** `http://localhost:3000`
> **Base URL (staging):** a definir após deploy no Railway (Sprint 2)

Todos os endpoints exceto `/health` requerem o header:

```http
Authorization: Bearer <supabase-jwt>
```

O token é obtido via Supabase Auth no app mobile após login.

---

## GET /health

Verifica se o servidor e o MongoDB estão no ar. Não requer autenticação.

#### Resposta 200

```json
{
  "status": "ok",
  "mongo": "connected",
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

---

## GET /editais

Listagem paginada de licitações com filtros livres.

Retorna todos os editais sem filtro de data (editais vencidos incluídos). Resultados ordenados por prazo mais próximo primeiro; editais sem data ficam no fim.

#### Query params

| Parâmetro | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `page` | number | Não | Página. Padrão: `1` |
| `limit` | number | Não | Resultados por página. Máx: `50`. Padrão: `20` |
| `uf` | string | Não | Filtro por estado. Ex: `PE` |
| `valor_min` | number | Não | Valor mínimo estimado |
| `valor_max` | number | Não | Valor máximo estimado |
| `situacao` | string | Não | Filtro textual por situação da compra |
| `q` | string | Não | Busca livre no objeto da compra |

#### Resposta 200

```json
{
  "data": [
    {
      "numero_controle_pncp": "11303906000100-1-000053/2026",
      "objeto_compra": "Aquisição de material de limpeza",
      "orgao_razao_social": "Prefeitura Municipal de Recife",
      "valor_total_estimado": 45000,
      "uf": "PE",
      "municipio": "Recife",
      "data_encerramento_proposta": "2026-05-10T23:59:00.000Z",
      "situacao_compra_nome": "Publicada",
      "modalidade_nome": "Dispensa de Licitação"
    }
  ],
  "total": 142,
  "page": 1,
  "pages": 8
}
```

---

## GET /editais/:id

Detalhe completo de uma licitação pelo `numero_controle_pncp`.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | `numero_controle_pncp` do edital, **URL-encoded** (o campo contém `/` literais). O backend decodifica internamente. Ex: `08637373000180-1-000082%2F2026` |

#### Resposta 200

Objeto completo do MongoDB com todos os campos, exceto `_id`, `_extraido_em` e `_fonte`.

#### Resposta 404

```json
{ "error": "Edital não encontrado" }
```

---

## GET /oportunidades

Editais abertos filtrados automaticamente pelo CNAE ou ramo de atuação do perfil do MEI autenticado. Oculta editais acima do teto MEI (R$ 81.000).

#### Query params

| Parâmetro | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `page` | number | Não | Página. Padrão: `1` |
| `limit` | number | Não | Resultados por página. Máx: `50`. Padrão: `20` |
| `uf` | string | Não | Filtro por estado. Ex: `PE` |
| `valor_max` | number | Não | Teto personalizado. Padrão: `81000` |
| `cnae` | string | Não | Substitui o CNAE do perfil para filtrar keywords. Ex: `8121400` |

#### Resposta 200

```json
{
  "data": [],
  "total": 23,
  "page": 1,
  "pages": 2,
  "keywords_usados": ["limpeza", "varrição", "higienização"]
}
```

> Se o perfil não tiver `cnpj` nem `ramo_atuacao` preenchido, retorna todos os editais dentro do teto MEI sem filtro por keywords.

---

## GET /perfil

Retorna o perfil do MEI autenticado.

#### Resposta 200

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nome_fantasia": "Limpeza Express",
  "cnpj": "12345678000195",
  "cnae": "8121400",
  "ramo_atuacao": "Limpeza predial em condomínios residenciais",
  "uf": "PE",
  "created_at": "2026-04-25T10:00:00.000Z",
  "updated_at": "2026-04-25T10:00:00.000Z"
}
```

#### Resposta 404

```json
{ "error": "Perfil não encontrado" }
```

---

## PUT /perfil

Cria ou atualiza o perfil do MEI. Todos os campos são opcionais — apenas os campos enviados são atualizados.

Na primeira chamada (criação), `nome_fantasia`, `cnpj` e `uf` são obrigatórios pelo banco.

Quando `cnpj` é informado, o backend consulta a BrasilAPI para obter o CNAE e popula `cnae` e `ramo_atuacao` automaticamente (se `ramo_atuacao` não for enviado manualmente).

#### Body

```json
{
  "nome_fantasia": "Limpeza Express",
  "cnpj": "12.345.678/0001-95",
  "uf": "PE",
  "ramo_atuacao": "limpeza"
}
```

> `cnpj` aceita com ou sem máscara — o backend normaliza para 14 dígitos.

#### Resposta 200

Perfil atualizado (mesmo formato do GET /perfil).

#### Resposta 400

```json
{ "error": "CNPJ inválido: informe os 14 dígitos numéricos" }
```

```json
{ "error": "Campo obrigatório ausente: nome_fantasia" }
```

---

## GET /participacoes

Lista todas as licitações que o MEI está acompanhando, em ordem cronológica decrescente.

#### Resposta 200

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "licitacao_id": "11303906000100-1-000053/2026",
      "status": "acompanhando",
      "objeto_compra": "Aquisição de material de limpeza",
      "orgao_nome": "Prefeitura Municipal de Recife",
      "valor_estimado": 45000,
      "data_encerramento": "2026-05-10T23:59:00.000Z",
      "created_at": "2026-04-25T10:00:00.000Z",
      "updated_at": "2026-04-25T10:00:00.000Z"
    }
  ]
}
```

---

## POST /participacoes

Inicia o acompanhamento de um edital. O backend busca os dados no MongoDB e os desnormaliza em `participacoes`.

#### Body

```json
{ "licitacao_id": "11303906000100-1-000053/2026" }
```

#### Resposta 201

Participação criada (mesmo formato de um item do GET /participacoes).

#### Resposta 404

```json
{ "error": "Edital não encontrado no MongoDB" }
```

#### Resposta 409

```json
{ "error": "Edital já está nas participações" }
```

---

## PATCH /participacoes/:id

Atualiza o status de uma participação.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | UUID da participação |

#### Body

```json
{ "status": "proposta_enviada" }
```

Valores válidos para `status`: `acompanhando` · `proposta_enviada` · `venceu` · `perdeu` · `desistiu`

#### Resposta 200

Participação atualizada (mesmo formato de um item do GET /participacoes).

#### Resposta 400

```json
{ "error": "Status inválido. Use: acompanhando, proposta_enviada, venceu, perdeu, desistiu" }
```

#### Resposta 404

```json
{ "error": "Participação não encontrada" }
```

---

## DELETE /participacoes/:id

Remove uma participação do MEI.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | UUID da participação |

#### Resposta 200

```json
{ "message": "Participação removida com sucesso" }
```

#### Resposta 404

```json
{ "error": "Participação não encontrada" }
```

---

## GET /alertas

Retorna alertas automáticos gerados para o MEI autenticado.

Tipos de alerta:

- `teto_mei` — soma das participações se aproxima ou ultrapassa R$ 81.000
- `prazo_curto` — edital em acompanhamento encerra em até 5 dias
- `novo_edital` — edital compatível com o CNAE do MEI publicado nas últimas 48h

#### Resposta 200

```json
{
  "data": [
    {
      "tipo": "teto_mei",
      "urgente": false,
      "soma_participacoes": 61200,
      "teto": 81000,
      "mensagem": "Suas participações somam R$ 61.200. Você está se aproximando do teto anual MEI (R$ 81.000)."
    },
    {
      "tipo": "prazo_curto",
      "dias_restantes": 3,
      "licitacao_id": "11303906000100-1-000053/2026",
      "objeto_compra": "Aquisição de material de limpeza",
      "orgao_nome": "Prefeitura Municipal de Recife",
      "mensagem": "O edital \"Aquisição de material de limpeza...\" encerra em 3 dia(s)."
    },
    {
      "tipo": "novo_edital",
      "edital": {},
      "mensagem": "Novo edital compatível com seu CNAE encontrado."
    }
  ],
  "total": 3
}
```

---

## GET /saved-searches

Lista as buscas salvas do MEI autenticado, em ordem cronológica decrescente.

#### Resposta 200

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "termo_busca": "limpeza",
      "filtros": { "uf": "PE", "valor_max": 50000 },
      "created_at": "2026-04-25T10:00:00.000Z"
    }
  ]
}
```

---

## POST /saved-searches

Salva uma busca para o MEI autenticado.

#### Body

```json
{
  "termo_busca": "limpeza",
  "filtros": {
    "uf": "PE",
    "valor_min": 0,
    "valor_max": 80000,
    "municipio": "Recife",
    "cnae": "6201-5/00",
    "categorias": ["Tecnologia", "Consultoria"]
  }
}
```

`termo_busca` é obrigatório. `filtros` é opcional — todos os seus campos são opcionais entre si.

#### Resposta 201

Busca salva criada (mesmo formato de um item do GET /saved_searches).

#### Resposta 400

```json
{ "error": "termo_busca é obrigatório" }
```

---

## DELETE /saved-searches/:id

Remove uma busca salva do MEI.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | UUID da busca salva |

#### Resposta 200

```json
{ "message": "Busca removida com sucesso" }
```

#### Resposta 404

```json
{ "error": "Busca não encontrada" }
```

---

## GET /documentos

Lista todos os documentos do MEI autenticado, em ordem cronológica decrescente.

#### Resposta 200

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "nome": "Certidão Negativa Federal",
      "tipo": "certidao_negativa",
      "url": "userId/1716825600000.pdf",
      "status": "valido",
      "validade": "2026-12-31",
      "participacao_id": null,
      "created_at": "2026-05-01T10:00:00.000Z"
    }
  ]
}
```

> `url` armazena o `storagePath` relativo no bucket privado `documentos` do Supabase Storage (formato `{userId}/{timestamp}.ext`). O frontend faz upload direto para o Storage e envia o path resultante via `POST /documentos`.

---

## POST /documentos

Registra metadados de um documento após o upload já ter sido feito no Supabase Storage.

#### Body

```json
{
  "nome": "Certidão Negativa Federal",
  "tipo": "certidao_negativa",
  "url": "userId/1716825600000.pdf",
  "status": "pendente",
  "validade": "2026-12-31",
  "participacao_id": null
}
```

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `nome` | string | Sim | Nome legível do documento (1–200 chars) |
| `tipo` | string | Sim | Um dos valores: `certidao_negativa`, `contrato_social`, `comprovante_endereco`, `cnpj`, `outro` |
| `url` | string | Sim | `storagePath` retornado pelo Supabase Storage após upload |
| `status` | string | Não | `valido`, `pendente` (padrão) ou `vencido` |
| `validade` | string | Não | Data de vencimento no formato `YYYY-MM-DD` |
| `participacao_id` | string | Não | UUID da participação vinculada ao documento |

#### Resposta 201

Documento criado (mesmo formato de um item do `GET /documentos`).

#### Resposta 409

```json
{ "error": "Documento já cadastrado" }
```

---

## PATCH /documentos/:id

Atualiza o status ou a data de validade de um documento.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | UUID do documento |

#### Body

```json
{ "status": "vencido", "validade": "2026-06-30" }
```

Ambos os campos são opcionais, mas ao menos um deve ser enviado.

Valores válidos para `status`: `valido` · `pendente` · `vencido`

#### Resposta 200

Documento atualizado (mesmo formato de um item do `GET /documentos`).

#### Resposta 400

```json
{ "error": "Status inválido. Use: valido, pendente, vencido" }
```

```json
{ "error": "Nenhum campo para atualizar" }
```

#### Resposta 404

```json
{ "error": "Documento não encontrado" }
```

---

## DELETE /documentos/:id

Remove o documento do banco **e** o arquivo físico do bucket `documentos` no Supabase Storage. A operação é atômica: se a remoção do Storage falhar, o registro no banco **não** é deletado.

#### Path params

| Parâmetro | Descrição |
| --- | --- |
| `id` | UUID do documento |

#### Resposta 200

```json
{ "message": "Documento removido com sucesso" }
```

#### Resposta 404

```json
{ "error": "Documento não encontrado" }
```

#### Resposta 500

```json
{ "error": "Erro ao remover arquivo do storage" }
```

---

## POST /chat

Encaminha uma query em linguagem natural para o assistente de IA (servidor MCP — Track 3).

> **Sprint 2:** requer o servidor MCP rodando em `MCP_URL`. Retorna 503 se o MCP estiver offline.

#### Body

```json
{ "query": "quais licitações de limpeza estão abertas em PE?" }
```

`query` deve ter entre 1 e 1000 caracteres.

#### Resposta 200

```json
{
  "resposta": "Foram encontradas 3 licitações de limpeza abertas em Pernambuco...",
  "cache": false
}
```

#### Resposta 503

```json
{ "error": "Assistente temporariamente indisponível", "details": "..." }
```

---

## Tabela de status codes

| Status | Quando ocorre |
| --- | --- |
| `200` | Sucesso |
| `201` | Recurso criado |
| `400` | Body ou query params inválidos |
| `401` | Token ausente, inválido ou expirado |
| `404` | Recurso não encontrado |
| `409` | Conflito — recurso já existe |
| `500` | Erro interno do servidor |
| `502` | MCP retornou erro |
| `503` | MCP offline ou timeout |
