-- O ESP publica a cada 10 minutos. Offline só depois de 1 hora sem leitura.

create or replace function public.notificar_sensor_offline(p_galpao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_galpao text;
  v_ultima_id bigint;
  v_ultima_em timestamptz;
  v_minutos integer := 60;
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

  if not found then
    return;
  end if;

  if v_ultima_em > now() - make_interval(mins => v_minutos) then
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
    usuario_id,
    tipo,
    titulo,
    mensagem,
    galpao_id,
    dados
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

grant execute on function public.notificar_sensor_offline(uuid) to authenticated;
