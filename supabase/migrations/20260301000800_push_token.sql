-- Token Expo para push com o app fechado + chamada da Edge Function enviar-push.
-- Rode no SQL Editor do ChickSafe (uma vez), depois faça o deploy de enviar-push.

alter table public.usuarios
  add column if not exists push_token text;

comment on column public.usuarios.push_token is
  'ExponentPushToken do aparelho. Gravado pelo app após o login.';

create extension if not exists pg_net with schema extensions;

create or replace function public.chamar_enviar_push()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
begin
  if NEW.tipo is distinct from 'alerta_galpao' then
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

drop trigger if exists trg_enviar_push_notificacao on public.notificacoes;
create trigger trg_enviar_push_notificacao
after insert on public.notificacoes
for each row
execute procedure public.chamar_enviar_push();
