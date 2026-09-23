-- O usuário pode apagar as próprias notificações depois de vê-las no sino.

grant delete on table public.notificacoes to authenticated;

drop policy if exists "apagar_proprias_notificacoes" on public.notificacoes;
create policy "apagar_proprias_notificacoes" on public.notificacoes
  for delete to authenticated
  using (usuario_id = auth.uid());
