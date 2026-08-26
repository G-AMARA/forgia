-- Bugfix: la mappa attiva non era mai persistita (solo broadcast in tempo reale): un
-- giocatore che si univa alla sessione DOPO che il Master aveva già scelto una mappa (o che
-- ricaricava la pagina) non riceveva mai quel broadcast passato — i broadcast non vengono
-- "riproposti" a chi si iscrive al canale dopo l'invio — e restava sulla schermata di attesa
-- finché il Master non ri-selezionava la stessa mappa.
alter table campaigns add column if not exists active_map_id uuid references map_album_images(id) on delete set null;

-- I giocatori devono ora poter leggere l'immagine della mappa attiva direttamente dal DB
-- all'ingresso in sessione (non più solo riceverla via broadcast): la policy esistente
-- ammetteva in lettura solo owner/admin, mai un giocatore con un personaggio in campagna.
drop policy if exists "map_album_images_select_owner_or_admin" on map_album_images;
create policy "map_album_images_select_owner_admin_or_member" on map_album_images for select
  using (
    album_id in (select id from map_albums where campaign_id in (select id from campaigns where owner_id = auth.uid()))
    or album_id in (
      select id from map_albums
      where campaign_id in (select campaign_id from characters where owner_id = auth.uid())
    )
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
