-- Bugfix (continua 2026-08-26_campaigns_active_map.sql): la policy select di
-- map_album_images era stata estesa ai membri campagna, ma la sua condizione passa da una
-- subquery su map_albums — e in Postgres una subquery dentro una policy RESTA soggetta alla
-- RLS della tabella referenziata. map_albums_select_owner_or_admin ammetteva solo
-- owner/admin: per un giocatore quella subquery tornava sempre vuota (0 righe), quindi
-- "album_id in (...)" falliva comunque anche con la policy di map_album_images corretta.
-- Sintomo: funzionava al refresh del Master (owner), mai per un giocatore.
drop policy if exists "map_albums_select_owner_or_admin" on map_albums;
create policy "map_albums_select_owner_admin_or_member" on map_albums for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or campaign_id in (select campaign_id from characters where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
