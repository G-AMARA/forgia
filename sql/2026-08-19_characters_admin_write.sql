-- Permette agli ADMIN (profiles.is_admin) di modificare le schede personaggio di
-- qualunque giocatore, non solo le proprie (character-sheet.ts:readOnly ora vale false
-- anche per un admin che apre la scheda di un altro tramite /scheda-personaggio/:id).
-- Le tabelle characters/character_classes/character_weapons/character_inventory/
-- character_spells non sono create in questo repo (RLS esistente gestita a mano su
-- Supabase): queste policy sono aggiuntive e permissive, si sommano in OR a quelle
-- già presenti basate su owner_id, senza sostituirle né rimuoverle.
create policy "characters_update_admin" on characters for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "character_classes_update_admin" on character_classes for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "character_weapons_all_admin" on character_weapons for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "character_inventory_all_admin" on character_inventory for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "character_spells_all_admin" on character_spells for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
