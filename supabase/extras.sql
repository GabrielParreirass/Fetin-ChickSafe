-- Rode no SQL Editor do Supabase (uma vez).
-- Libera as tabelas para o app e cria funções para entrar/criar galpão
-- sem bater no RLS na hora do INSERT ... RETURNING.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.usuarios to authenticated;
grant select, insert on table public.galpoes to authenticated;
grant select, insert on table public.usuario_galpoes to authenticated;
grant select on table public.leituras to authenticated;
grant insert on table public.leituras to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

create or replace function public.entrar_galpao(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select id into v_id
  from public.galpoes
  where codigo = upper(trim(p_codigo))
  limit 1;

  if v_id is null then
    raise exception 'Código de galpão inválido';
  end if;

  insert into public.usuario_galpoes (usuario_id, galpao_id, papel)
  values (auth.uid(), v_id, 'operador')
  on conflict (usuario_id, galpao_id) do nothing;

  return v_id;
end;
$$;

create or replace function public.criar_galpao(p_nome text)
returns public.galpoes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.galpoes;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome obrigatório';
  end if;

  insert into public.galpoes (nome, codigo)
  values (
    trim(p_nome),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  )
  returning * into v_row;

  insert into public.usuario_galpoes (usuario_id, galpao_id, papel)
  values (auth.uid(), v_row.id, 'dono');

  return v_row;
end;
$$;

grant execute on function public.entrar_galpao(text) to authenticated;
grant execute on function public.criar_galpao(text) to authenticated;

create or replace function public.usuario_pertence_ao_galpao(p_galpao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuario_galpoes
    where galpao_id = p_galpao_id
      and usuario_id = auth.uid()
  );
$$;

create or replace function public.listar_acessos_galpao(p_galpao_id uuid)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  papel text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not public.usuario_pertence_ao_galpao(p_galpao_id) then
    raise exception 'Sem acesso a este galpão';
  end if;

  return query
  select
    ug.usuario_id,
    coalesce(nullif(trim(u.nome), ''), 'Usuário'),
    u.email,
    ug.papel
  from public.usuario_galpoes ug
  left join public.usuarios u on u.id = ug.usuario_id
  where ug.galpao_id = p_galpao_id;
end;
$$;

grant execute on function public.usuario_pertence_ao_galpao(uuid) to authenticated;
grant execute on function public.listar_acessos_galpao(uuid) to authenticated;

alter table public.usuario_galpoes enable row level security;
alter table public.usuarios enable row level security;

drop policy if exists "ver_membros_do_galpao" on public.usuario_galpoes;
create policy "ver_membros_do_galpao" on public.usuario_galpoes
  for select to authenticated
  using (public.usuario_pertence_ao_galpao(galpao_id));

drop policy if exists "ver_perfis_do_mesmo_galpao" on public.usuarios;
create policy "ver_perfis_do_mesmo_galpao" on public.usuarios
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.usuario_galpoes colega
      where colega.usuario_id = usuarios.id
        and public.usuario_pertence_ao_galpao(colega.galpao_id)
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.leituras;
exception
  when duplicate_object then null;
end;
$$;
