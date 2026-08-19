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

alter table public.galpoes
  add column if not exists limiar_tensao numeric not null default 3;

alter table public.galpoes
  add column if not exists limiar_corrente numeric not null default 50;

grant update, delete on table public.galpoes to authenticated;
grant delete on table public.usuario_galpoes to authenticated;
grant delete on table public.leituras to authenticated;

create or replace function public.impedir_mudanca_cpf_email()
returns trigger
language plpgsql
as $$
begin
  if old.cpf is distinct from new.cpf or old.email is distinct from new.email then
    raise exception 'E-mail e CPF não podem ser alterados';
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_cpf_email_imutaveis on public.usuarios;
create trigger usuarios_cpf_email_imutaveis
before update on public.usuarios
for each row
execute procedure public.impedir_mudanca_cpf_email();

drop policy if exists "atualizar_proprio_perfil" on public.usuarios;
create policy "atualizar_proprio_perfil" on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

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
  );
$$;

create or replace function public.atualizar_galpao(
  p_galpao_id uuid,
  p_nome text,
  p_limiar_tensao numeric,
  p_limiar_corrente numeric
)
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

  if not public.usuario_eh_dono_do_galpao(p_galpao_id) then
    raise exception 'Apenas o dono pode alterar este galpão';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome obrigatório';
  end if;

  if p_limiar_tensao is null or p_limiar_tensao <= 0 then
    raise exception 'Informe um valor válido de tensão.';
  end if;

  if p_limiar_corrente is null or p_limiar_corrente <= 0 then
    raise exception 'Informe um valor válido de corrente.';
  end if;

  update public.galpoes
  set
    nome = trim(p_nome),
    limiar_tensao = p_limiar_tensao,
    limiar_corrente = p_limiar_corrente
  where id = p_galpao_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.remover_acesso_galpao(
  p_galpao_id uuid,
  p_usuario_id uuid
)
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

  if not public.usuario_eh_dono_do_galpao(p_galpao_id) then
    raise exception 'Apenas o dono pode remover acesso';
  end if;

  select papel into v_papel
  from public.usuario_galpoes
  where galpao_id = p_galpao_id
    and usuario_id = p_usuario_id;

  if v_papel is null then
    raise exception 'Este usuário não tem acesso ao galpão';
  end if;

  if v_papel = 'dono' then
    raise exception 'Não é possível remover o dono do galpão';
  end if;

  delete from public.usuario_galpoes
  where galpao_id = p_galpao_id
    and usuario_id = p_usuario_id;
end;
$$;

create or replace function public.apagar_galpao(p_galpao_id uuid)
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
    raise exception 'Apenas o dono pode apagar este galpão';
  end if;

  delete from public.leituras where galpao_id = p_galpao_id;
  delete from public.usuario_galpoes where galpao_id = p_galpao_id;
  delete from public.galpoes where id = p_galpao_id;
end;
$$;

grant execute on function public.usuario_eh_dono_do_galpao(uuid) to authenticated;
grant execute on function public.atualizar_galpao(uuid, text, numeric, numeric) to authenticated;
grant execute on function public.remover_acesso_galpao(uuid, uuid) to authenticated;
grant execute on function public.apagar_galpao(uuid) to authenticated;

alter table public.galpoes enable row level security;

drop policy if exists "ver_galpoes_com_acesso" on public.galpoes;
create policy "ver_galpoes_com_acesso" on public.galpoes
  for select to authenticated
  using (public.usuario_pertence_ao_galpao(id));

drop policy if exists "dono_atualiza_galpao" on public.galpoes;
create policy "dono_atualiza_galpao" on public.galpoes
  for update to authenticated
  using (public.usuario_eh_dono_do_galpao(id))
  with check (public.usuario_eh_dono_do_galpao(id));

drop policy if exists "dono_apaga_galpao" on public.galpoes;
create policy "dono_apaga_galpao" on public.galpoes
  for delete to authenticated
  using (public.usuario_eh_dono_do_galpao(id));

drop policy if exists "dono_remove_acesso" on public.usuario_galpoes;
create policy "dono_remove_acesso" on public.usuario_galpoes
  for delete to authenticated
  using (public.usuario_eh_dono_do_galpao(galpao_id) and papel <> 'dono');

do $$
begin
  alter publication supabase_realtime add table public.leituras;
exception
  when duplicate_object then null;
end;
$$;

-- Aprovação de acesso, funcionário sai sozinho e RLS de leituras.
-- Espelha supabase/aprovacao.sql para instalações novas.

alter table public.usuario_galpoes
  add column if not exists status text not null default 'aprovado';

alter table public.usuario_galpoes
  drop constraint if exists usuario_galpoes_status_check;

alter table public.usuario_galpoes
  add constraint usuario_galpoes_status_check
  check (status in ('pendente', 'aprovado'));

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

grant execute on function public.usuario_acesso_aprovado(uuid) to authenticated;
grant execute on function public.listar_acessos_galpao(uuid) to authenticated;
grant execute on function public.aprovar_acesso_galpao(uuid, uuid) to authenticated;
grant execute on function public.recusar_acesso_galpao(uuid, uuid) to authenticated;
grant execute on function public.sair_do_galpao(uuid) to authenticated;

alter table public.leituras enable row level security;

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

-- Notificações in-app. Espelha supabase/notificacoes.sql.

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  galpao_id uuid references public.galpoes(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_usuario_criado_idx
  on public.notificacoes (usuario_id, criado_em desc);

grant select, update on table public.notificacoes to authenticated;

alter table public.notificacoes enable row level security;

drop policy if exists "ver_proprias_notificacoes" on public.notificacoes;
create policy "ver_proprias_notificacoes" on public.notificacoes
  for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "atualizar_proprias_notificacoes" on public.notificacoes;
create policy "atualizar_proprias_notificacoes" on public.notificacoes
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create or replace function public.notificar_pedido_acesso(p_galpao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_galpao text;
  v_nome_solicitante text;
begin
  select nome into v_nome_galpao
  from public.galpoes
  where id = p_galpao_id;

  select coalesce(nullif(trim(nome), ''), 'Um funcionário')
  into v_nome_solicitante
  from public.usuarios
  where id = auth.uid();

  insert into public.notificacoes (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    galpao_id,
    dados
  )
  select
    ug.usuario_id,
    'pedido_acesso',
    'Pedido de acesso',
    coalesce(v_nome_solicitante, 'Um funcionário')
      || ' pediu acesso ao galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || '.',
    p_galpao_id,
    jsonb_build_object('solicitante_id', auth.uid())
  from public.usuario_galpoes ug
  where ug.galpao_id = p_galpao_id
    and ug.papel = 'dono'
    and ug.status = 'aprovado'
    and ug.usuario_id <> auth.uid();
end;
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

  perform public.notificar_pedido_acesso(v_id);

  return v_id;
end;
$$;

grant execute on function public.entrar_galpao(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notificacoes;
exception
  when duplicate_object then null;
end;
$$;




