-- Notifications : à coller UNE FOIS dans Supabase (SQL Editor > New query > Run).
-- Ne touche à aucune donnée existante : il ajoute seulement de quoi envoyer les notifications.
--
-- AVANT de cliquer sur Run, remplace les DEUX valeurs entre apostrophes plus bas :
--   1. REMPLACE_PAR_TA_REF  : la référence de ton projet (Project Settings > General > Reference ID)
--   2. REMPLACE_PAR_TON_SECRET : le « secret du webhook » donné par la page generer-cles.html

-- 1) Les appareils qui reçoivent les notifications
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  person text not null,
  sub jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_all_authenticated" on public.push_subscriptions;
create policy "push_all_authenticated" on public.push_subscriptions
  for all to authenticated using (true) with check (true);

-- 2) Réglages privés (personne ne peut les lire depuis le site : aucune règle d'accès)
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

insert into public.app_secrets (key, value) values
  ('notify_url', 'https://cescmokmsqzmawdqcwyl.supabase.co/functions/v1/notify'),
  ('notify_secret', '5ccefb87c7ca5f854f64b8e69a9dd76cd52991a6198509bb')
on conflict (key) do update set value = excluded.value;

-- 3) À chaque nouveau contenu, on prévient la fonction « notify »
create extension if not exists pg_net;

create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u text;
  s text;
begin
  select value into u from public.app_secrets where key = 'notify_url';
  select value into s from public.app_secrets where key = 'notify_secret';
  if u is null or s is null or u like '%REMPLACE%' or s like '%REMPLACE%' then
    return new;
  end if;
  perform net.http_post(
    url := u,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', s),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception when others then
  return new; -- une notification ratée ne doit jamais empêcher d'enregistrer un contenu
end;
$$;

drop trigger if exists items_notify on public.items;
create trigger items_notify
  after insert on public.items
  for each row
  when (new.kind in ('idea', 'question', 'comment', 'photo', 'file', 'song', 'moment'))
  execute function public.notify_push();
