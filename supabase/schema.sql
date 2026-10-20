-- Execute no Supabase: SQL Editor > New query > cole tudo > Run
-- Pode rodar de novo sem problema: o script só cria o que falta e atualiza as regras.

create table if not exists public.dados_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

/* ---------- Acessos (assinaturas do Stripe) ---------- */

-- Uma linha por e-mail. Só o servidor (webhook do Stripe, com a service role) grava aqui.
create table if not exists public.acessos (
  email text primary key check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  plano text not null default 'mensal',
  status text not null default 'pendente' check (status in ('ativo', 'pendente', 'atrasado', 'cancelado', 'reembolsado', 'contestado')),
  -- null = sem data de fim (vitalício ou cortesia)
  valido_ate timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent text,
  observacao text,
  atualizado_em timestamptz not null default now()
);
-- planos aceitos (recriado para incluir o teste grátis em bancos que já tinham a tabela)
alter table public.acessos drop constraint if exists acessos_plano_check;
alter table public.acessos add constraint acessos_plano_check
  check (plano in ('teste', 'mensal', 'semestral', 'anual', 'vitalicio', 'cortesia'));

create index if not exists acessos_stripe_customer on public.acessos (stripe_customer_id);
create index if not exists acessos_stripe_subscription on public.acessos (stripe_subscription_id);

alter table public.acessos enable row level security;

-- cada pessoa vê só o próprio acesso (pelo e-mail do login); ninguém altera pelo app
drop policy if exists "ver o proprio acesso" on public.acessos;
create policy "ver o proprio acesso" on public.acessos
  for select to authenticated using (email = lower((select auth.jwt() ->> 'email')));

-- Acesso liberado: ativo (ou com pagamento atrasado, dentro da tolerância) e ainda dentro da validade
create or replace function public.tem_acesso() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.acessos
    where email = lower(auth.jwt() ->> 'email')
      and status in ('ativo', 'atrasado')
      and (valido_ate is null or valido_ate > now())
  )
$$;

/* ---------- Teste grátis de 7 dias ---------- */

-- Toda conta nova ganha 7 dias de acesso, sem cartão. Vale uma vez por e-mail:
-- se a pessoa apagar a conta e criar de novo, o registro do e-mail continua e o teste não se renova.
create or replace function public.iniciar_teste_gratis() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    insert into public.acessos (email, user_id, plano, status, valido_ate, observacao)
    values (lower(new.email), new.id, 'teste', 'ativo', now() + interval '7 days', 'teste grátis de 7 dias')
    on conflict (email) do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists ao_criar_conta_teste_gratis on auth.users;
create trigger ao_criar_conta_teste_gratis
  after insert on auth.users
  for each row execute function public.iniciar_teste_gratis();

/* ---------- Dados: cada usuário só enxerga os próprios, e só com acesso ativo ---------- */

alter table public.dados_usuario enable row level security;

drop policy if exists "ler os proprios dados" on public.dados_usuario;
create policy "ler os proprios dados" on public.dados_usuario
  for select to authenticated using ((select auth.uid()) = user_id and (select public.tem_acesso()));

drop policy if exists "inserir os proprios dados" on public.dados_usuario;
create policy "inserir os proprios dados" on public.dados_usuario
  for insert to authenticated with check ((select auth.uid()) = user_id and (select public.tem_acesso()));

drop policy if exists "atualizar os proprios dados" on public.dados_usuario;
create policy "atualizar os proprios dados" on public.dados_usuario
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.tem_acesso()))
  with check ((select auth.uid()) = user_id and (select public.tem_acesso()));

/* ---------- Liberação manual ---------- */

-- IMPORTANTE: libere o SEU e-mail antes de mais nada, senão você também fica bloqueado.
-- Troque o e-mail abaixo, tire os dois traços do começo da linha e rode:
-- insert into public.acessos (email, plano, status, observacao) values ('seu@email.com', 'cortesia', 'ativo', 'dono') on conflict (email) do update set status = 'ativo', plano = 'cortesia', valido_ate = null;

-- (Opcional) dar cortesia a todos que já tinham conta antes da cobrança começar:
-- insert into public.acessos (email, user_id, plano, status, observacao)
--   select lower(email), id, 'cortesia', 'ativo', 'conta anterior à cobrança' from auth.users where email is not null
--   on conflict (email) do nothing;

-- Bloquear alguém manualmente:
-- update public.acessos set status = 'cancelado', valido_ate = now(), atualizado_em = now() where email = 'pessoa@email.com';
