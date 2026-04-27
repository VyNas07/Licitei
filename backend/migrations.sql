-- ============================================================
-- Licitei — Migrations Supabase
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard
-- ============================================================

-- Perfis dos MEIs
CREATE TABLE IF NOT EXISTS perfis_mei (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_responsavel TEXT NOT NULL,
  cnpj             TEXT NOT NULL,
  cnaes            TEXT[] DEFAULT '{}',
  plano            TEXT DEFAULT 'iniciante' CHECK (plano IN ('iniciante', 'pro')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_usuario),
  UNIQUE(cnpj)
);

-- RLS: usuário só vê seu próprio perfil
ALTER TABLE perfis_mei ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil_proprio" ON perfis_mei
  FOR ALL USING (auth.uid() = id_usuario);

-- Favoritos
CREATE TABLE IF NOT EXISTS favoritos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_controle_pncp  TEXT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, numero_controle_pncp)
);

-- RLS: usuário só vê seus próprios favoritos
ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favoritos_proprios" ON favoritos
  FOR ALL USING (auth.uid() = user_id);
