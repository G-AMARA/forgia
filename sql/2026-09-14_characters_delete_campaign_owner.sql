-- Permette al Master (owner della campagna) di allontanare un giocatore dalla propria
-- campagna (Gestisci Campagna -> pannello "Avventurieri", pulsante "Allontana"), che in
-- pratica cancella il PERSONAGGIO CLONE della campagna (vedi CharacterStore.deleteCharacter,
-- già usato dal giocatore stesso per il proprio PG in EditHeroModal.removeFromCampaign).
-- Il modello base nella Fucina non viene toccato: il clone in campagna è una riga a sé
-- (template_id -> characters.id on delete set null, vedi sql/2026-09-06_character_templates.sql).
--
-- NB: la tabella characters non è creata in questo repo (RLS di base owner-only gestita a
-- mano su Supabase, vedi sql/2026-08-19_characters_admin_write.sql). Questa policy si
-- AGGIUNGE a quella esistente (OR-combinata da Postgres), non la sostituisce.
create policy "characters_delete_campaign_owner_or_admin" on characters for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
