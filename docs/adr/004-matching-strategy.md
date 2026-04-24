---
status: aceito
date: 2026-04-23
investigado: 2026-04-23
revisado: 2026-04-23
---

# ADR 004 — Estratégia de Matching de Licitações

**Data:** 22/04/2026 — Revisado: 23/04/2026
**Status:** Decidido e confirmado por investigação empírica

## Contexto

Queríamos que o MEI encontrasse licitações relevantes para seu negócio
automaticamente, sem precisar conhecer os termos técnicos dos editais.

O requisito RF01 da disciplina de Mobile especifica filtro por CNAE. Este ADR
documenta a investigação técnica que justifica a abordagem adotada e sua evolução.

## Investigação empírica — 23/04/2026

Consultamos a API do PNCP diretamente nas modalidades 6 (Pregão Eletrônico),
8 (Dispensa) e 1 (Leilão), inspecionando o payload completo de cada resposta.

**Resultado:** O endpoint `/contratacoes/publicacao` retorna 34 campos. Nenhum
deles é CNAE, CATMAT ou CATSER. Os dados retornados são metadados da contratação
(órgão, datas, valor, modalidade, objeto), não classificação de produto/serviço.

O parâmetro `tipoBeneficio` é aceito pela API sem erro, mas não altera o total
de resultados (testado com valores 1, 2, 3 e 5 — todos retornaram 4.416 registros
no mesmo período). O filtro é ignorado pelo backend do PNCP.

Campos de filtro confirmados como funcionais:

- `unidadeOrgao.ufSigla` → filtro por região (UF)
- `valorTotalEstimado` → filtro por valor (range min/max no MongoDB)
- `objetoCompra` → busca textual por ramo de atuação

## Alternativas consideradas

- **Matching direto por CNAE na API:** MEI informa seu CNAE, sistema filtra
  licitações compatíveis. Inviável: CNAE não existe na API PNCP. A API usa
  CATMAT/CATSER apenas nos itens de cada contratação (endpoint separado, não
  consumido pelo ETL), e não existe mapeamento público CNAE → CATMAT/CATSER.
- **Filtro por `tipoBeneficio`:** filtraria licitações com preferência legal para
  MEI/ME/EPP. Inviável: parâmetro ignorado pela API (confirmado empiricamente).
- **Matching por palavra-chave manual no `objetoCompra`:** MEI informa ramo em
  linguagem natural (ex: "limpeza", "TI"), backend filtra via `$regex`/`$text`
  no MongoDB. Simples, mas a qualidade depende do MEI saber o termo certo.
- **Base CNAE IBGE + extração de keywords pelo MCP:** MEI cadastra seu CNAE uma
  vez no perfil. O sistema carrega a base pública do IBGE (~1.300 subclasses,
  disponível como CSV/XLSX em concla.ibge.gov.br). O MCP interpreta a descrição
  oficial do CNAE e gera automaticamente os termos de busca para o `objetoCompra`.
  Combina a precisão do CNAE com a flexibilidade do texto livre. Sugerido pelo
  professor orientador de Mobile em 23/04/2026.

## Decisão

Abordagem em duas camadas:

1. **Camada de busca (backend):** matching por palavra-chave no campo `objetoCompra`
   via `$regex`/`$text` no MongoDB. Rápido, sem dependência de LLM, reutilizável
   pelo mobile.

2. **Camada de inteligência (MCP):** o MEI cadastra seu CNAE no perfil
   (`mei_profile.cnae`). O MCP carrega a descrição oficial do CNAE a partir da base
   IBGE e usa o LLM para extrair os melhores termos de busca automaticamente,
   eliminando a necessidade de o MEI digitar palavras-chave manualmente.

O RF01 ("filtro por CNAE") é atendido de forma completa: o CNAE do MEI é coletado
no cadastro e traduzido em buscas relevantes pelo MCP.

Filtros adicionais disponíveis: UF (região) e faixa de valor.

## Consequências

- ETL não precisa ser modificado
- Busca direta do backend é performática e independente do LLM
- MEI não precisa saber formular termos de busca — o CNAE resolve automaticamente
- Requer campo `cnae` em `mei_profile` (Supabase) e base CNAE IBGE acessível ao MCP
- Base CNAE pode ser carregada como JSON estático no repositório ou tabela no Supabase
- Qualidade do matching depende da capacidade do LLM de interpretar descrições CNAE
- Mapeamento estrutural CNAE → CATMAT/CATSER permanece fora do escopo
