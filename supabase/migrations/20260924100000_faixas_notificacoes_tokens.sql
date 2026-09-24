-- Faixas fixas do ventilador, transições de status (alerta, normal, offline)
-- e um token de push por aparelho.

create table if not exists public.push_tokens (
  token text primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  atualizado_em timestamptz not null default now()
);

create index if not exists push_tokens_usuario_idx
  on public.push_tokens (usuario_id);

alter table public.push_tokens enable row level security;

drop policy if exists "ver_proprios_tokens" on public.push_tokens;
create policy "ver_proprios_tokens" on public.push_tokens
  for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "gravar_proprios_tokens" on public.push_tokens;
create policy "gravar_proprios_tokens" on public.push_tokens
  for insert to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists "atualizar_proprios_tokens" on public.push_tokens;
create policy "atualizar_proprios_tokens" on public.push_tokens
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "apagar_proprios_tokens" on public.push_tokens;
create policy "apagar_proprios_tokens" on public.push_tokens
  for delete to authenticated
  using (usuario_id = auth.uid());

insert into public.push_tokens (token, usuario_id)
select push_token, id
from public.usuarios
where push_token is not null
  and length(trim(push_token)) > 0
on conflict (token) do nothing;

create or replace function public.status_leitura(
  p_energia text,
  p_tensao numeric,
  p_corrente numeric,
  p_limiar_tensao numeric
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_corrente, 0) < 100 then 'critico'
    when coalesce(p_corrente, 0) <= 200
      or p_energia not in ('Fonte', 'USB')
      or coalesce(p_tensao, 0) <= coalesce(p_limiar_tensao, 3)
      then 'alerta'
    else 'normal'
  end;
$$;

create or replace function public.notificar_transicao_galpao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limiar_tensao numeric;
  v_nome_galpao text;
  v_prev_em timestamptz;
  v_prev_energia text;
  v_prev_tensao numeric;
  v_prev_corrente numeric;
  v_status_atual text;
  v_status_anterior text;
  v_tipo text;
  v_titulo text;
  v_mensagem text;
begin
  select limiar_tensao, nome
    into v_limiar_tensao, v_nome_galpao
  from public.galpoes
  where id = NEW.galpao_id;

  if not found then
    return NEW;
  end if;

  v_status_atual := public.status_leitura(
    NEW.energia, NEW.tensao, NEW.corrente, v_limiar_tensao
  );

  select criado_em, energia, tensao, corrente
    into v_prev_em, v_prev_energia, v_prev_tensao, v_prev_corrente
  from public.leituras
  where galpao_id = NEW.galpao_id
    and (
      criado_em < NEW.criado_em
      or (criado_em = NEW.criado_em and id < NEW.id)
    )
  order by criado_em desc, id desc
  limit 1;

  if not found then
    if v_status_atual = 'normal' then
      return NEW;
    end if;
    v_status_anterior := 'normal';
  elsif v_prev_em <= NEW.criado_em - interval '60 minutes' then
    v_status_anterior := 'offline';
  else
    v_status_anterior := public.status_leitura(
      v_prev_energia, v_prev_tensao, v_prev_corrente, v_limiar_tensao
    );
  end if;

  if v_status_anterior = v_status_atual then
    return NEW;
  end if;

  if v_status_atual in ('alerta', 'critico')
     and v_status_anterior in ('normal', 'offline') then
    v_tipo := 'alerta_galpao';
    v_titulo := 'Alerta no galpão';
    v_mensagem := 'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || case
           when v_status_atual = 'critico' then ' entrou em estado crítico.'
           else ' entrou em alerta.'
         end;
  elsif v_status_atual = 'normal'
        and v_status_anterior in ('alerta', 'critico') then
    v_tipo := 'retorno_normal';
    v_titulo := 'Galpão normal';
    v_mensagem := 'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' voltou ao normal.';
  elsif v_status_atual = 'normal' and v_status_anterior = 'offline' then
    v_tipo := 'retorno_normal';
    v_titulo := 'Sensor online';
    v_mensagem := 'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' saiu do modo offline e voltou ao normal.';
  elsif v_status_anterior = 'alerta' and v_status_atual = 'critico' then
    v_tipo := 'alerta_galpao';
    v_titulo := 'Alerta no galpão';
    v_mensagem := 'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' entrou em estado crítico.';
  else
    return NEW;
  end if;

  insert into public.notificacoes (
    usuario_id, tipo, titulo, mensagem, galpao_id, dados
  )
  select
    ug.usuario_id,
    v_tipo,
    v_titulo,
    v_mensagem,
    NEW.galpao_id,
    jsonb_build_object('leitura_id', NEW.id, 'status', v_status_atual)
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
execute procedure public.notificar_transicao_galpao();

create or replace function public.chamar_enviar_push()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
begin
  if NEW.tipo not in ('alerta_galpao', 'retorno_normal', 'sensor_offline') then
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://gjzagwbzmulhwlrqhmpl.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notificacoes',
      'record', to_jsonb(NEW)
    )
  );

  return NEW;
end;
$$;

create or replace function public.verificar_sensores_offline()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_galpao record;
begin
  for v_galpao in
    select g.id
    from public.galpoes g
    where exists (
      select 1
      from public.leituras l
      where l.galpao_id = g.id
        and l.criado_em <= now() - interval '60 minutes'
        and l.criado_em = (
          select max(l2.criado_em)
          from public.leituras l2
          where l2.galpao_id = g.id
        )
    )
  loop
    perform public.notificar_sensor_offline_interno(v_galpao.id);
  end loop;
end;
$$;

create or replace function public.notificar_sensor_offline_interno(p_galpao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_galpao text;
  v_ultima_id bigint;
  v_ultima_em timestamptz;
begin
  select nome into v_nome_galpao
  from public.galpoes
  where id = p_galpao_id;

  if not found then
    return;
  end if;

  select id, criado_em
    into v_ultima_id, v_ultima_em
  from public.leituras
  where galpao_id = p_galpao_id
  order by criado_em desc, id desc
  limit 1;

  if not found or v_ultima_em > now() - interval '60 minutes' then
    return;
  end if;

  if exists (
    select 1
    from public.notificacoes
    where galpao_id = p_galpao_id
      and tipo = 'sensor_offline'
      and coalesce(dados->>'leitura_id', '') = v_ultima_id::text
  ) then
    return;
  end if;

  insert into public.notificacoes (
    usuario_id, tipo, titulo, mensagem, galpao_id, dados
  )
  select
    ug.usuario_id,
    'sensor_offline',
    'Sensor offline',
    'O galpão '
      || coalesce(v_nome_galpao, 'selecionado')
      || ' está sem sinal há mais de 1 hora.',
    p_galpao_id,
    jsonb_build_object('leitura_id', v_ultima_id)
  from public.usuario_galpoes ug
  where ug.galpao_id = p_galpao_id
    and ug.status = 'aprovado';
end;
$$;

create or replace function public.notificar_sensor_offline(p_galpao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1
    from public.usuario_galpoes
    where galpao_id = p_galpao_id
      and usuario_id = auth.uid()
      and status = 'aprovado'
  ) then
    raise exception 'Sem acesso a este galpão';
  end if;

  perform public.notificar_sensor_offline_interno(p_galpao_id);
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('chicksafe-sensores-offline');
exception
  when others then
    null;
end $$;

do $$
begin
  perform cron.schedule(
    'chicksafe-sensores-offline',
    '*/10 * * * *',
    'select public.verificar_sensores_offline()'
  );
exception
  when others then
    null;
end $$;
