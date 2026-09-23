-- Cadastro do ESP: uma chave por dispositivo, ligada a um galpão.
-- Rode no SQL Editor do ChickSafe (uma vez).

create extension if not exists pgcrypto;

create table if not exists public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  galpao_id uuid not null references public.galpoes(id) on delete cascade,
  nome text not null default 'ESP32',
  chave_hash text not null unique,
  ativo boolean not null default true,
  ultimo_visto_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists dispositivos_galpao_idx
  on public.dispositivos (galpao_id);

alter table public.dispositivos enable row level security;

-- Sem policy para anon/authenticated: só a Edge Function (service_role) acessa.
