-- Corregge il modello di quota delle Mappe introdotto in
-- sql/2026-09-12_campaign_addition_limits.sql: lì il limite era sul numero di ALBUM
-- creati per campagna, ma un album può contenere immagini illimitate, quindi il vincolo
-- reale (quante immagini di mappe può avere una campagna) restava aggirabile mettendole
-- tutte in un unico album. La quota va sul numero TOTALE di immagini (map_album_images)
-- della campagna, sommate su tutti i suoi album: un Adepto può fare 1 album con 3 immagini
-- o 3 album con 1 immagine ciascuno, l'importante è non superare le 3 immagini totali.
-- La creazione di ALBUM torna quindi libera (solo owner/admin, nessun tetto numerico): sono
-- un contenitore organizzativo, non la risorsa limitata.

drop policy if exists "map_albums_insert_owner_or_admin_within_rank_limit" on map_albums;
create policy "map_albums_insert_owner_or_admin" on map_albums for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Conteggio "quante immagini ha già la campagna a cui appartiene p_album_id", su TUTTI i
-- suoi album. security definer per lo stesso motivo di get_campaign_bestiary_count/
-- get_campaign_map_album_count (vedi sql/2026-09-12_campaign_addition_limits.sql): la
-- policy di inserimento su map_album_images non può leggere direttamente map_album_images
-- al suo interno senza rischiare "infinite recursion detected in policy for relation".
create or replace function public.get_campaign_map_image_count(p_album_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from map_album_images i
  join map_albums a on a.id = i.album_id
  where a.campaign_id = (select campaign_id from map_albums where id = p_album_id)
$$;

drop policy if exists "map_album_images_insert_owner_or_admin" on map_album_images;
drop policy if exists "map_album_images_insert_owner_or_admin_within_rank_limit" on map_album_images;
create policy "map_album_images_insert_owner_or_admin_within_rank_limit" on map_album_images for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
      and get_campaign_map_image_count(album_id) < get_campaign_addition_limit(auth.uid())
    )
  );
