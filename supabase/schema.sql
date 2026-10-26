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

/* ---------- Proteção do teste grátis ---------- */

-- "Raiz" do e-mail, para que variações da mesma caixa contem como uma pessoa só:
-- paulo+1@gmail.com, p.a.u.l.o@gmail.com e paulo@googlemail.com viram paulo@gmail.com
create or replace function public.email_raiz(p_email text) returns text
language sql immutable set search_path = public as $$
  with p as (
    select split_part(split_part(lower(trim(p_email)), '@', 1), '+', 1) as usuario,
           split_part(lower(trim(p_email)), '@', 2) as dominio
  )
  select case when dominio in ('gmail.com', 'googlemail.com')
    then replace(usuario, '.', '') || '@gmail.com'
    else usuario || '@' || dominio end
  from p
$$;

-- Quem já usou o teste (pela raiz do e-mail). Ninguém lê nem grava pelo app.
create table if not exists public.testes_usados (
  email_raiz text primary key,
  email text not null,
  criado_em timestamptz not null default now()
);
alter table public.testes_usados enable row level security;
revoke all on public.testes_usados from anon, authenticated;

-- Domínios de e-mail temporário: a conta é criada, mas sem teste grátis (pode assinar normalmente).
-- Para bloquear outro domínio: insert into public.dominios_descartaveis values ('dominio.com');
create table if not exists public.dominios_descartaveis (dominio text primary key);
alter table public.dominios_descartaveis enable row level security;
revoke all on public.dominios_descartaveis from anon, authenticated;
insert into public.dominios_descartaveis (dominio) values
  ('10minutemail.com'),
  ('10minutemail.net'),
  ('10minutemail.co.uk'),
  ('20minutemail.com'),
  ('33mail.com'),
  ('anonaddy.me'),
  ('burnermail.io'),
  ('byom.de'),
  ('discard.email'),
  ('dispostable.com'),
  ('dropmail.me'),
  ('emailondeck.com'),
  ('emailfake.com'),
  ('emailtemp.org'),
  ('fakeinbox.com'),
  ('fakemail.net'),
  ('getairmail.com'),
  ('getnada.com'),
  ('guerrillamail.com'),
  ('guerrillamail.net'),
  ('guerrillamail.org'),
  ('guerrillamail.biz'),
  ('guerrillamail.de'),
  ('guerrillamailblock.com'),
  ('grr.la'),
  ('sharklasers.com'),
  ('spam4.me'),
  ('pokemail.net'),
  ('harakirimail.com'),
  ('inboxkitten.com'),
  ('jetable.org'),
  ('mail.tm'),
  ('mail7.io'),
  ('mailcatch.com'),
  ('maildrop.cc'),
  ('mailinator.com'),
  ('mailinator.net'),
  ('mailnesia.com'),
  ('mailpoof.com'),
  ('mintemail.com'),
  ('moakt.com'),
  ('mohmal.com'),
  ('mytemp.email'),
  ('mytrashmail.com'),
  ('nada.email'),
  ('nowmymail.com'),
  ('spambox.us'),
  ('spamgourmet.com'),
  ('temp-mail.org'),
  ('temp-mail.io'),
  ('tempmail.com'),
  ('tempmail.net'),
  ('tempmail.dev'),
  ('tempmailo.com'),
  ('tempr.email'),
  ('tempinbox.com'),
  ('throwawaymail.com'),
  ('trashmail.com'),
  ('trashmail.de'),
  ('trashmail.net'),
  ('yopmail.com'),
  ('yopmail.fr'),
  ('yopmail.net'),
  ('cool.fr.nf'),
  ('jetable.fr.nf'),
  ('nospam.ze.tc'),
  ('courriel.fr.nf'),
  ('moncourrier.fr.nf'),
  ('monemail.fr.nf'),
  ('monmail.fr.nf'),
  ('mailforspam.com'),
  ('tmail.ws'),
  ('tmpmail.org'),
  ('tmpmail.net'),
  ('emltmp.com'),
  ('1secmail.com'),
  ('1secmail.org'),
  ('1secmail.net'),
  ('esiix.com'),
  ('wwjmp.com'),
  ('xojxe.com'),
  ('yoggm.com'),
  ('linshiyouxiang.net'),
  ('minuteinbox.com'),
  ('email-temporario.com.br'),
  ('emailtemporario.com.br')
on conflict do nothing;

-- quem já tem registro de acesso (teste ou compra) conta como teste usado
insert into public.testes_usados (email_raiz, email)
  select public.email_raiz(email), email from public.acessos
on conflict do nothing;

/* ---------- Teste grátis de 7 dias ---------- */

-- Todo usuário, novo ou antigo, ganha 7 dias de acesso sem cartão, automaticamente:
--  - quem cria a conta ganha na hora (gatilho abaixo);
--  - quem já tinha conta ganha no primeiro acesso depois que este script rodar (função chamada pelo app).
-- Vale uma vez por e-mail: apagar a conta e criar de novo, usar variações do mesmo e-mail
-- (paulo+1@gmail.com) ou e-mail temporário não dá outro teste.
-- Cria o registro de acesso de um e-mail novo: 7 dias de teste, ou sem teste se o e-mail
-- for temporário ou se a mesma caixa (raiz) já tiver usado o teste. Só o banco chama esta função.
create or replace function public.criar_teste(p_email text, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_raiz text := public.email_raiz(p_email);
  v_dominio text := split_part(lower(trim(p_email)), '@', 2);
  v_usado text;
begin
  if coalesce(v_email, '') = '' or exists (select 1 from public.acessos where email = v_email) then
    return;
  end if;
  if exists (select 1 from public.dominios_descartaveis d where v_dominio = d.dominio or v_dominio like '%.' || d.dominio) then
    insert into public.acessos (email, user_id, plano, status, valido_ate, observacao)
    values (v_email, p_user, 'teste', 'cancelado', now(), 'sem teste grátis: e-mail temporário')
    on conflict (email) do nothing;
    return;
  end if;
  select email into v_usado from public.testes_usados where email_raiz = v_raiz;
  if v_usado is not null then
    insert into public.acessos (email, user_id, plano, status, valido_ate, observacao)
    values (v_email, p_user, 'teste', 'cancelado', now(), 'sem teste grátis: já usado por ' || v_usado)
    on conflict (email) do nothing;
    return;
  end if;
  insert into public.acessos (email, user_id, plano, status, valido_ate, observacao)
  values (v_email, p_user, 'teste', 'ativo', now() + interval '7 days', 'teste grátis de 7 dias')
  on conflict (email) do nothing;
  insert into public.testes_usados (email_raiz, email) values (v_raiz, v_email) on conflict do nothing;
end
$$;
revoke all on function public.criar_teste(text, uuid) from public, anon, authenticated;

create or replace function public.iniciar_teste_gratis() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    perform public.criar_teste(new.email, new.id);
  end if;
  return new;
end
$$;

drop trigger if exists ao_criar_conta_teste_gratis on auth.users;
create trigger ao_criar_conta_teste_gratis
  after insert on auth.users
  for each row execute function public.iniciar_teste_gratis();

-- Chamada pelo app quando a pessoa entra e ainda não tem registro de acesso (contas antigas).
-- Só cria o teste para o próprio e-mail de quem está logado, e só se ainda não existir nada para ele.
create or replace function public.garantir_teste_gratis() returns setof public.acessos
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null or auth.uid() is null then
    return;
  end if;
  perform public.criar_teste(v_email, auth.uid());
  return query select * from public.acessos where email = v_email;
end
$$;

revoke all on function public.garantir_teste_gratis() from public, anon;
grant execute on function public.garantir_teste_gratis() to authenticated;

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

-- Seu próprio acesso: você também ganha os 7 dias de teste. Para não ter prazo,
-- troque o e-mail abaixo, tire os dois traços do começo da linha e rode:
-- insert into public.acessos (email, plano, status, observacao) values ('seu@email.com', 'cortesia', 'ativo', 'dono') on conflict (email) do update set status = 'ativo', plano = 'cortesia', valido_ate = null;

-- (Opcional) dar acesso livre, em vez do teste, a todos que já tinham conta antes da cobrança começar:
-- insert into public.acessos (email, user_id, plano, status, observacao)
--   select lower(email), id, 'cortesia', 'ativo', 'conta anterior à cobrança' from auth.users where email is not null
--   on conflict (email) do nothing;

-- Bloquear alguém manualmente:
-- update public.acessos set status = 'cancelado', valido_ate = now(), atualizado_em = now() where email = 'pessoa@email.com';

-- atualiza a API do Supabase com as tabelas e funções novas
notify pgrst, 'reload schema';

/* ---------- Sugestões dos usuários ---------- */

-- Qualquer pessoa logada envia; só o dono lê e marca como lida.
create table if not exists public.sugestoes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null default lower(auth.jwt() ->> 'email'),
  nome text,
  tipo text not null default 'ideia' check (tipo in ('ideia', 'melhoria', 'problema', 'outro')),
  texto text not null check (char_length(trim(texto)) between 5 and 2000),
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists sugestoes_criado on public.sugestoes (criado_em desc);
alter table public.sugestoes enable row level security;

create or replace function public.eh_dono() returns boolean
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'paulou61@gmail.com' $$;

drop policy if exists "enviar sugestao" on public.sugestoes;
create policy "enviar sugestao" on public.sugestoes for insert to authenticated
  with check (user_id = (select auth.uid()) and email = lower((select auth.jwt() ->> 'email')) and lida = false);
drop policy if exists "dono le sugestoes" on public.sugestoes;
create policy "dono le sugestoes" on public.sugestoes for select to authenticated using ((select public.eh_dono()));
drop policy if exists "dono marca sugestoes" on public.sugestoes;
create policy "dono marca sugestoes" on public.sugestoes for update to authenticated using ((select public.eh_dono())) with check ((select public.eh_dono()));
drop policy if exists "dono apaga sugestoes" on public.sugestoes;
create policy "dono apaga sugestoes" on public.sugestoes for delete to authenticated using ((select public.eh_dono()));

-- Limite contra spam: no máximo 5 sugestões por pessoa a cada hora.
create or replace function public.limitar_sugestoes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.sugestoes where user_id = new.user_id and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'limite de sugestoes por hora atingido' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists sugestoes_limite on public.sugestoes;
create trigger sugestoes_limite before insert on public.sugestoes for each row execute function public.limitar_sugestoes();

grant select, insert, update, delete on public.sugestoes to authenticated;
notify pgrst, 'reload schema';

/* ---------- Usuários (painel do dono) ---------- */

-- Lista todas as contas com o plano e o último acesso. Só o dono consegue chamar:
-- para qualquer outra pessoa a função devolve erro e nada é lido.
create or replace function public.admin_usuarios()
returns table (
  user_id uuid,
  email text,
  nome text,
  criado_em timestamptz,
  ultimo_login timestamptz,
  ultima_atividade timestamptz,
  email_confirmado boolean,
  plano text,
  status text,
  valido_ate timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.eh_dono() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return query
    select u.id,
           lower(u.email)::text,
           nullif(coalesce(d.dados ->> 'nome', u.raw_user_meta_data ->> 'nome'), '')::text,
           u.created_at,
           u.last_sign_in_at,
           d.atualizado_em,
           u.email_confirmed_at is not null,
           a.plano,
           a.status,
           a.valido_ate
    from auth.users u
    left join public.acessos a on a.email = lower(u.email)
    left join public.dados_usuario d on d.user_id = u.id
    order by u.created_at desc;
end
$$;
revoke all on function public.admin_usuarios() from public, anon;
grant execute on function public.admin_usuarios() to authenticated;

notify pgrst, 'reload schema';
