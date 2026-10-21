/* ---------- Sugestões dos usuários ---------- */

-- Qualquer pessoa logada envia; só o dono lê e marca como lida.
create table if not exists public.sugestoes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null default lower((select auth.jwt() ->> 'email')),
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
