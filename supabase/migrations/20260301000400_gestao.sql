-- Gestão de perfil, galpão (só dono) e limiares.
-- Rode no SQL Editor do ChickSafe (uma vez). Também está no extras.sql.

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
