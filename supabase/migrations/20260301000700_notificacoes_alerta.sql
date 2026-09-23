-- Alertas de galpão e retorno de aprovação para o funcionário.
-- Rode no SQL Editor do ChickSafe (uma vez) se o projeto já tinha notificacoes.sql.
-- Também está no extras.sql e no notificacoes.sql.

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

  perform public.notificar_acesso_aprovado(p_galpao_id, p_usuario_id);
end;
$$;

grant execute on function public.aprovar_acesso_galpao(uuid, uuid) to authenticated;

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
