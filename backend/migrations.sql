-- ============================================================
-- Licitei — Referência de Schema Supabase
-- As tabelas abaixo foram criadas diretamente no Supabase Dashboard.
-- Este arquivo serve como documentação — NÃO executar novamente.
-- Schema completo em: docs/supabase-schema.md
-- ============================================================

-- mei_profile: perfil 1:1 com auth.users
-- user_id, nome_fantasia, cnpj, cnae (text), ramo_atuacao, uf, created_at, updated_at

-- saved_searches: buscas salvas pelo MEI
-- user_id, termo_busca, filtros (jsonb), created_at

-- participacoes: editais que o MEI está acompanhando (alimenta RF05)
-- user_id, licitacao_id (numeroControlePNCP), status, objeto_compra,
-- orgao_nome, valor_estimado, data_encerramento, created_at, updated_at
-- status enum: acompanhando | proposta_enviada | venceu | perdeu | desistiu

-- checklist_itens: itens do checklist de habilitação (Sprint 2)
-- participacao_id, user_id, descricao, concluido, created_at

-- documentos: metadados de documentos do MEI (Sprint 2)
-- user_id, participacao_id, nome, tipo, url, status, validade, created_at, updated_at

-- alertas: configurações de notificação por prazo (Sprint 2)
-- user_id, participacao_id, tipo, prazo, antecedencia_horas, notificado, created_at
