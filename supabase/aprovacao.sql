-- Aprovação de acesso pelo dono, funcionário sai sozinho e RLS de leituras.
-- Rode no SQL Editor do ChickSafe (uma vez). Também está no extras.sql.

alter table public.usuario_galpoes
  add column if not exists status text not null default 'aprovado';

alter table public.usuario_galpoes
  drop constraint if exists usuario_galpoes_status_check;

alter table public.usuario_galpoes
  add constraint usuario_galpoes_status_check
  check (status in ('pendente', 'aprovado'));

update public.usuario_galpoes
set status = 'aprovado'
where status is null or status not in ('pendente', 'aprovado');

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

create or replace function public.usuario_acesso_aprovado(p_galpao_id uuid)
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
      and status = 'aprovado'
  );
$$;

create or replace function public.usuario_eh_dono_do_galpao(p_galpao_id uuid)
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
      and papel = 'dono'
      and status = 'aprovado'
  );
$$;

create or replace function public.entrar_galpao(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
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

  select status into v_status
  from public.usuario_galpoes
  where galpao_id = v_id
    and usuario_id = auth.uid();

  if v_status = 'aprovado' then
    raise exception 'Você já tem acesso a este galpão';
  end if;

  if v_status = 'pendente' then
    raise exception 'Aguarde a aprovação do dono';
  end if;

  insert into public.usuario_galpoes (usuario_id, galpao_id, papel, status)
  values (auth.uid(), v_id, 'operador', 'pendente');

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

  insert into public.usuario_galpoes (usuario_id, galpao_id, papel, status)
  values (auth.uid(), v_row.id, 'dono', 'aprovado');

  return v_row;
end;
$$;

drop function if exists public.listar_acessos_galpao(uuid);

create function public.listar_acessos_galpao(p_galpao_id uuid)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  papel text,
  status text
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
    ug.papel,
    ug.status
  from public.usuario_galpoes ug
  left join public.usuarios u on u.id = ug.usuario_id
  where ug.galpao_id = p_galpao_id
    and (
      public.usuario_eh_dono_do_galpao(p_galpao_id)
      or (
        public.usuario_acesso_aprovado(p_galpao_id)
        and ug.status = 'aprovado'
      )
      or ug.usuario_id = auth.uid()
    );
end;
$$;

create or replace function public.aprovar_acesso_galpao(
  p_galpao_id uuid,
  p_usuario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not public.usuario_eh_dono_do_galpao(p_galpao_id) then
    raise exception 'Apenas o dono pode aprovar acesso';
  end if;

  update public.usuario_galpoes
  set status = 'aprovado'
  where galpao_id = p_galpao_id
    and usuario_id = p_usuario_id
    and papel <> 'dono'
    and status = 'pendente';

  if not found then
    raise exception 'Não há solicitação pendente deste usuário';
  end if;
end;
$$;

create or replace function public.recusar_acesso_galpao(
  p_galpao_id uuid,
  p_usuario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not public.usuario_eh_dono_do_galpao(p_galpao_id) then
    raise exception 'Apenas o dono pode recusar acesso';
  end if;

  delete from public.usuario_galpoes
  where galpao_id = p_galpao_id
    and usuario_id = p_usuario_id
    and papel <> 'dono'
    and status = 'pendente';

  if not found then
    raise exception 'Não há solicitação pendente deste usuário';
  end if;
end;
$$;

create or replace function public.sair_do_galpao(p_galpao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select papel into v_papel
  from public.usuario_galpoes
  where galpao_id = p_galpao_id
    and usuario_id = auth.uid();

  if v_papel is null then
    raise exception 'Você não está neste galpão';
  end if;

  if v_papel = 'dono' then
    raise exception 'O dono não pode sair. Apague o galpão se quiser encerrar.';
  end if;

  delete from public.usuario_galpoes
  where galpao_id = p_galpao_id
    and usuario_id = auth.uid();
end;
$$;

grant execute on function public.usuario_pertence_ao_galpao(uuid) to authenticated;
grant execute on function public.usuario_acesso_aprovado(uuid) to authenticated;
grant execute on function public.usuario_eh_dono_do_galpao(uuid) to authenticated;
grant execute on function public.entrar_galpao(text) to authenticated;
grant execute on function public.criar_galpao(text) to authenticated;
grant execute on function public.listar_acessos_galpao(uuid) to authenticated;
grant execute on function public.aprovar_acesso_galpao(uuid, uuid) to authenticated;
grant execute on function public.recusar_acesso_galpao(uuid, uuid) to authenticated;
grant execute on function public.sair_do_galpao(uuid) to authenticated;

alter table public.galpoes enable row level security;
alter table public.usuario_galpoes enable row level security;
alter table public.leituras enable row level security;

drop policy if exists "ver_galpoes_com_acesso" on public.galpoes;
create policy "ver_galpoes_com_acesso" on public.galpoes
  for select to authenticated
  using (public.usuario_pertence_ao_galpao(id));

drop policy if exists "ver_membros_do_galpao" on public.usuario_galpoes;
create policy "ver_membros_do_galpao" on public.usuario_galpoes
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.usuario_acesso_aprovado(galpao_id)
  );

drop policy if exists "ver_perfis_do_mesmo_galpao" on public.usuarios;
create policy "ver_perfis_do_mesmo_galpao" on public.usuarios
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.usuario_galpoes colega
      where colega.usuario_id = usuarios.id
        and public.usuario_acesso_aprovado(colega.galpao_id)
        and colega.status = 'aprovado'
    )
  );

drop policy if exists "sair_do_proprio_galpao" on public.usuario_galpoes;
create policy "sair_do_proprio_galpao" on public.usuario_galpoes
  for delete to authenticated
  using (usuario_id = auth.uid() and papel <> 'dono');

drop policy if exists "ver_leituras_com_acesso" on public.leituras;
create policy "ver_leituras_com_acesso" on public.leituras
  for select to authenticated
  using (public.usuario_acesso_aprovado(galpao_id));

drop policy if exists "leitura_insert_app" on public.leituras;
create policy "leitura_insert_app" on public.leituras
  for insert to authenticated
  with check (public.usuario_acesso_aprovado(galpao_id));
