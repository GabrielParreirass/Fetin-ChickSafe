-- Permite energia Fonte/Bateria e insert autenticado (simulador no app).
-- Rode no SQL Editor do ChickSafe.

alter table public.leituras drop constraint if exists leituras_energia_check;
alter table public.leituras
  add constraint leituras_energia_check
  check (energia in ('Fonte', 'Bateria', 'USB'));

drop policy if exists "leitura_insert_app" on public.leituras;
create policy "leitura_insert_app" on public.leituras
  for insert to authenticated
  with check (
    exists (
      select 1 from public.usuario_galpoes ug
      where ug.galpao_id = leituras.galpao_id
        and ug.usuario_id = auth.uid()
    )
  );
