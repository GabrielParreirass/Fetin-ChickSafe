-- O ESP envia o nome do dispositivo em X-Device-Key, como o ESP-1.
-- O banco guarda o SHA-256 desse nome.

update public.dispositivos
set chave_hash = encode(
  extensions.digest(convert_to(trim(nome), 'UTF8'), 'sha256'),
  'hex'
)
where trim(nome) = 'ESP-2';

create or replace function public.criar_galpao(p_nome text, p_dispositivo_nome text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.galpoes;
  v_nome_disp text;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome obrigatório';
  end if;

  v_nome_disp := trim(p_dispositivo_nome);
  if v_nome_disp is null or length(v_nome_disp) = 0 then
    raise exception 'Informe o nome do dispositivo';
  end if;

  if length(v_nome_disp) > 40 then
    raise exception 'Nome do dispositivo muito longo';
  end if;

  v_hash := encode(
    extensions.digest(convert_to(v_nome_disp, 'UTF8'), 'sha256'),
    'hex'
  );

  if exists (
    select 1
    from public.dispositivos
    where chave_hash = v_hash
  ) then
    raise exception 'Já existe um dispositivo com esse nome';
  end if;

  insert into public.galpoes (nome, codigo)
  values (
    trim(p_nome),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  )
  returning * into v_row;

  insert into public.usuario_galpoes (usuario_id, galpao_id, papel, status)
  values (auth.uid(), v_row.id, 'dono', 'aprovado');

  insert into public.dispositivos (galpao_id, nome, chave_hash, ativo)
  values (v_row.id, v_nome_disp, v_hash, true);

  return jsonb_build_object(
    'galpao', to_jsonb(v_row),
    'dispositivo_nome', v_nome_disp,
    'chave', v_nome_disp
  );
end;
$$;

notify pgrst, 'reload schema';
