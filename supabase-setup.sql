-- À coller UNE FOIS dans Supabase : menu « SQL Editor » > « New query » > Run.
-- Crée la table du site et le dossier privé des photos/fichiers.
-- Seul le compte partagé (connecté) peut lire ou écrire.

create table if not exists public.items (
  id text primary key,
  kind text not null,
  author text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_kind_idx on public.items (kind);

alter table public.items enable row level security;

drop policy if exists "items_all_authenticated" on public.items;
create policy "items_all_authenticated" on public.items
  for all to authenticated using (true) with check (true);

-- Dossier privé pour les photos, enregistrements et PDF (40 Mo max par fichier)
insert into storage.buckets (id, name, public, file_size_limit)
values ('souvenirs', 'souvenirs', false, 41943040)
on conflict (id) do update set public = false, file_size_limit = 41943040;

drop policy if exists "souvenirs_select" on storage.objects;
drop policy if exists "souvenirs_insert" on storage.objects;
drop policy if exists "souvenirs_delete" on storage.objects;

create policy "souvenirs_select" on storage.objects
  for select to authenticated using (bucket_id = 'souvenirs');
create policy "souvenirs_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'souvenirs');
create policy "souvenirs_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'souvenirs');
