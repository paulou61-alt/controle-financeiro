-- Execute no Supabase: SQL Editor > New query > cole tudo > Run

create table if not exists public.dados_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Cada usuário só enxerga e altera os próprios dados
alter table public.dados_usuario enable row level security;

drop policy if exists "ler os proprios dados" on public.dados_usuario;
create policy "ler os proprios dados" on public.dados_usuario
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "inserir os proprios dados" on public.dados_usuario;
create policy "inserir os proprios dados" on public.dados_usuario
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "atualizar os proprios dados" on public.dados_usuario;
create policy "atualizar os proprios dados" on public.dados_usuario
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
