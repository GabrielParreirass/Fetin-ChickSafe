-- Notificações in-app (pedido de acesso, alerta e aprovação).
-- Rode no SQL Editor do ChickSafe (uma vez). Também está no extras.sql.

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

create or replace function public.notificar_acesso_aprovado(
  p_galpao_id uuid,
  p_usuario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_galpao text;
begin
  select nome into v_nome_galpao
  from public.galpoes
  where id = p_galpao_id;

  insert into public.notificacoes (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    galpao_id
  )
  values (
    p_usuario_id,
    'acesso_aprovado',
    'Acesso aprovado',
    'Seu acesso ao galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' foi aprovado.',
    p_galpao_id
  );
end;
$$;

create or replace function public.leitura_em_alerta(
  p_energia text,
  p_tensao numeric,
  p_corrente numeric,
  p_limiar_tensao numeric,
  p_limiar_corrente numeric
)
returns boolean
language sql
immutable
as $$
  select not (
    (p_energia in ('Fonte', 'USB'))
    and coalesce(p_tensao, 0) > coalesce(p_limiar_tensao, 3)
    and coalesce(p_corrente, 0) > coalesce(p_limiar_corrente, 50)
  );
$$;

create or replace function public.notificar_alerta_galpao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limiar_tensao numeric;
  v_limiar_corrente numeric;
  v_nome_galpao text;
  v_prev_energia text;
  v_prev_tensao numeric;
  v_prev_corrente numeric;
  v_alerta_atual boolean;
  v_alerta_anterior boolean;
begin
  select limiar_tensao, limiar_corrente, nome
    into v_limiar_tensao, v_limiar_corrente, v_nome_galpao
  from public.galpoes
  where id = NEW.galpao_id;

  if not found then
    return NEW;
  end if;

  v_alerta_atual := public.leitura_em_alerta(
    NEW.energia,
    NEW.tensao,
    NEW.corrente,
    v_limiar_tensao,
    v_limiar_corrente
  );

  if not v_alerta_atual then
    return NEW;
  end if;

  select energia, tensao, corrente
    into v_prev_energia, v_prev_tensao, v_prev_corrente
  from public.leituras
  where galpao_id = NEW.galpao_id
    and (
      criado_em < NEW.criado_em
      or (criado_em = NEW.criado_em and id < NEW.id)
    )
  order by criado_em desc, id desc
  limit 1;

  if found then
    v_alerta_anterior := public.leitura_em_alerta(
      v_prev_energia,
      v_prev_tensao,
      v_prev_corrente,
      v_limiar_tensao,
      v_limiar_corrente
    );
    if v_alerta_anterior then
      return NEW;
    end if;
  end if;

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
    'alerta_galpao',
    'Alerta no galpão',
    'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' entrou em alerta.',
    NEW.galpao_id,
    jsonb_build_object('leitura_id', NEW.id)
  from public.usuario_galpoes ug
  where ug.galpao_id = NEW.galpao_id
    and ug.status = 'aprovado';

  return NEW;
end;
$$;

drop trigger if exists trg_notificar_alerta_galpao on public.leituras;
create trigger trg_notificar_alerta_galpao
after insert on public.leituras
for each row
execute procedure public.notificar_alerta_galpao();
