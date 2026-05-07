-- ============================================================
-- Licitei — Migrações Supabase
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- --------------------------------------------------------
-- 1. mei_profile — perfil 1:1 com auth.users
-- --------------------------------------------------------
create table if not exists public.mei_profile (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome_fantasia text,
  cnpj        text,
  cnae        text,
  ramo_atuacao text,
  uf          char(2),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.mei_profile enable row level security;

create policy "Usuário lê próprio perfil"
  on public.mei_profile for select
  using (auth.uid() = user_id);

create policy "Usuário cria próprio perfil"
  on public.mei_profile for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza próprio perfil"
  on public.mei_profile for update
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 2. saved_searches — buscas salvas pelo MEI
-- --------------------------------------------------------
create table if not exists public.saved_searches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  termo_busca  text not null,
  filtros      jsonb,
  created_at   timestamptz default now()
);

alter table public.saved_searches enable row level security;

create policy "Usuário lê próprias buscas salvas"
  on public.saved_searches for select
  using (auth.uid() = user_id);

create policy "Usuário cria busca salva"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

create policy "Usuário deleta busca salva"
  on public.saved_searches for delete
  using (auth.uid() = user_id);

grant all on table public.saved_searches to service_role, authenticated;

-- --------------------------------------------------------
-- 3. participacoes — editais acompanhados pelo MEI
-- --------------------------------------------------------
create table if not exists public.participacoes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  licitacao_id      text not null,
  status            text not null default 'acompanhando'
                      check (status in ('acompanhando','proposta_enviada','venceu','perdeu','desistiu')),
  objeto_compra     text,
  orgao_nome        text,
  valor_estimado    numeric,
  data_encerramento timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (user_id, licitacao_id)
);

alter table public.participacoes enable row level security;

create policy "Usuário lê próprias participações"
  on public.participacoes for select
  using (auth.uid() = user_id);

create policy "Usuário cria participação"
  on public.participacoes for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza participação"
  on public.participacoes for update
  using (auth.uid() = user_id);

create policy "Usuário deleta participação"
  on public.participacoes for delete
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 3. Trigger para atualizar updated_at automaticamente
-- --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_mei_profile_updated_at
  before update on public.mei_profile
  for each row execute function public.set_updated_at();

create trigger trg_participacoes_updated_at
  before update on public.participacoes
  for each row execute function public.set_updated_at();
