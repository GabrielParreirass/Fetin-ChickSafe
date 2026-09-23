-- Limpar no app só esconde a notificação. A linha permanece no banco.

alter table public.notificacoes
  add column if not exists oculta boolean not null default false;

drop policy if exists "apagar_proprias_notificacoes" on public.notificacoes;

revoke delete on table public.notificacoes from authenticated;
