-- Lista todos os membros de um galpão (dono e funcionários), sem ficar
-- preso no RLS que só deixa ver a própria linha.
-- Rode no SQL Editor do ChickSafe (uma vez).

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
