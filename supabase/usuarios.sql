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
