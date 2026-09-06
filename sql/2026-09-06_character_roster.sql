-- "Fabbrica Personaggi": characters.campaign_id diventa opzionale, così un PG può
-- esistere nel parco personale dell'utente prima di essere assegnato a una campagna
-- (vedi CharacterStore.createCharacter/addCharacterToCampaign). I PG già esistenti,
-- che hanno già campaign_id valorizzato, non vengono toccati da questo comando.
alter table characters alter column campaign_id drop not null;

-- Quota di PG creabili nel parco personale per rango araldico (vedi core/ranks.ts
-- characterLimitForTier): 1 per Adepto, poi +1 per ogni rango successivo. Fato (admin)
-- resta illimitato tramite il ramo is_admin della policy sotto, non tramite questa
-- function. Deve restare sincronizzata con RANK_TIERS in ranks.ts. Stessa idea di
-- get_npc_creation_limit (sql/2026-09-05_npc_creation_limit.sql), ma senza il
-- moltiplicatore ×3 dei PNG.
create or replace function public.get_character_creation_limit(p_user_id uuid)
returns integer
language sql
stable
as $$
  select case
    when v.hours >= 500 then 7
    when v.hours >= 350 then 6
    when v.hours >= 200 then 5
    when v.hours >= 100 then 4
    when v.hours >= 50 then 3
    when v.hours >= 10 then 2
    else 1
  end
  from (select navigation_seconds / 3600.0 as hours from profiles where id = p_user_id) v
$$;

-- Policy RESTRICTIVE (si somma in AND alla/e policy di insert già esistenti su
-- characters, gestite a mano su Supabase e non toccate qui): limita quante righe un
-- utente non admin può creare in totale nel proprio parco personaggi, indipendentemente
-- dalla campagna. Un vero admin (Fato) bypassa il limite tramite il primo ramo dell'OR.
create policy "characters_insert_quota" on characters as restrictive for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (select count(*) from characters where owner_id = auth.uid()) < get_character_creation_limit(auth.uid())
  );
