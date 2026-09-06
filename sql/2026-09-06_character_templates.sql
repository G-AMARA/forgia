-- Riuso di un eroe della Fucina su più campagne: "Aggiungi il tuo Eroe" non sposta più la
-- riga base (characters.campaign_id, vedi 2026-09-06_character_roster.sql) ma ne clona lo
-- stato in una nuova riga dedicata a quella campagna (CharacterStore.cloneCharacterToCampaign).
-- template_id collega il clone al PG base di origine: serve alla Fucina per "Aggiorna dalla
-- campagna X" (CharacterStore.pullFromCampaignClone), una copia manuale una tantum, non un
-- collegamento continuo. on delete set null: se il base viene eliminato, il clone in campagna
-- resta (è ormai indipendente), perde solo il riferimento.
alter table characters add column if not exists template_id uuid references characters(id) on delete set null;

-- Sostituisce la policy quota introdotta in 2026-09-06_character_roster.sql: ora clonare un
-- PG base in una campagna (nuova riga con campaign_id valorizzato) non consuma la quota,
-- solo la creazione di un nuovo PG base (campaign_id nullo) la consuma. Il conteggio quota
-- guarda quindi solo le righe con campaign_id nullo, non il totale.
drop policy if exists "characters_insert_quota" on characters;
create policy "characters_insert_quota" on characters as restrictive for insert
  with check (
    campaign_id is not null
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (select count(*) from characters where owner_id = auth.uid() and campaign_id is null) < get_character_creation_limit(auth.uid())
  );
