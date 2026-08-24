-- Libreria di mappe/luoghi per campagna (campaign-hub, sezione "Mappe e luoghi"): album
-- (es. "Taverna", "Foresta") contenenti più immagini, ognuna con una propria didascalia.
-- Stesso pattern di campaign_bestiary_monsters per le policy (solo owner/admin, come la
-- sezione Bestiario nel campaign-hub).
create table if not exists map_albums (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists map_album_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references map_albums(id) on delete cascade,
  image_url text not null,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_map_albums_campaign_id on map_albums(campaign_id);
create index if not exists idx_map_album_images_album_id on map_album_images(album_id);

alter table map_albums enable row level security;
alter table map_album_images enable row level security;

create policy "map_albums_select_owner_or_admin" on map_albums for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_albums_insert_owner_or_admin" on map_albums for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_albums_delete_owner_or_admin" on map_albums for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_album_images_select_owner_or_admin" on map_album_images for select
  using (
    album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_album_images_insert_owner_or_admin" on map_album_images for insert
  with check (
    album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_album_images_update_owner_or_admin" on map_album_images for update
  using (
    album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_album_images_delete_owner_or_admin" on map_album_images for delete
  using (
    album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Il bucket storage "maps" va creato a mano da Dashboard Supabase (Storage > New bucket >
-- "maps", Public: ON) prima di lanciare queste policy — stesso procedimento di "bestiary"
-- (vedi sql/2026-08-14_bestiary_monsters.sql). A differenza di "bestiary" (catalogo
-- globale, scrittura solo admin), qui le immagini vivono in ${campaign_id}/${uuid}.ext:
-- la scrittura è ristretta al proprietario della campagna nella cui cartella si scrive,
-- non solo agli admin, perché ogni Master gestisce le mappe della propria campagna.
drop policy if exists "maps_bucket_public_read" on storage.objects;
create policy "maps_bucket_public_read" on storage.objects for select
  using (bucket_id = 'maps');

drop policy if exists "maps_bucket_write_owner_or_admin" on storage.objects;
create policy "maps_bucket_write_owner_or_admin" on storage.objects for insert
  with check (
    bucket_id = 'maps'
    and (
      (storage.foldername(name))[1]::uuid in (select id from campaigns where owner_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

drop policy if exists "maps_bucket_update_owner_or_admin" on storage.objects;
create policy "maps_bucket_update_owner_or_admin" on storage.objects for update
  using (
    bucket_id = 'maps'
    and (
      (storage.foldername(name))[1]::uuid in (select id from campaigns where owner_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

drop policy if exists "maps_bucket_delete_owner_or_admin" on storage.objects;
create policy "maps_bucket_delete_owner_or_admin" on storage.objects for delete
  using (
    bucket_id = 'maps'
    and (
      (storage.foldername(name))[1]::uuid in (select id from campaigns where owner_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );
