-- Unifica la quota di "elementi aggiungibili in campagna" (PNG, mostri selezionati nel
-- Bestiario, album creati in Mappe) su un'unica progressione araldica: 1 per Adepto, poi
-- 3/5/7/9/11/13 (+2 per rango salito). Fato (admin) resta illimitato tramite il ramo
-- is_admin di ogni policy, non tramite questa function. Deve restare sincronizzata con
-- campaignAdditionLimitForTier in core/ranks.ts.
--
-- Sostituisce get_npc_creation_limit (1/3/6/9/12/15/18, vedi
-- sql/2026-09-05_npc_creation_limit.sql) con questa function condivisa, usata ora dalle tre
-- policy di inserimento qui sotto.
--
-- Le policy che dipendono dalla vecchia function vanno droppate PRIMA della function stessa
-- (altrimenti Postgres rifiuta il drop per dipendenza). "npc_characters_insert_owner_or_within_rank_limit"
-- non compare in nessun file di questo repo: è il nome con cui la policy risulta creata sul
-- progetto Supabase reale (probabile refuso di un run precedente rispetto al nome nei
-- sorgenti); droppata comunque per sicurezza, il "if exists" la rende innocua se non c'è.
drop policy if exists "npc_characters_insert_master_or_admin_within_rank_limit" on npc_characters;
drop policy if exists "npc_characters_insert_owner_or_within_rank_limit" on npc_characters;
drop function if exists public.get_npc_creation_limit(uuid);

create or replace function public.get_campaign_addition_limit(p_user_id uuid)
returns integer
language sql
stable
as $$
  select case
    when v.hours >= 500 then 13
    when v.hours >= 350 then 11
    when v.hours >= 200 then 9
    when v.hours >= 100 then 7
    when v.hours >= 50 then 5
    when v.hours >= 10 then 3
    else 1
  end
  from (select navigation_seconds / 3600.0 as hours from profiles where id = p_user_id) v
$$;

-- Conteggio "quanti mostri/album ha già QUESTA campagna", usato dalle policy di Bestiario e
-- Mappe qui sotto. NON è un semplice "select count(*) ... where campaign_id = $1" inline
-- nella policy: una subquery che nella WITH CHECK di una tabella legge quella STESSA tabella
-- correlata alla riga in inserimento (es. "c.campaign_id = campaign_id", dove "campaign_id"
-- è la riga nuova) fa scattare "infinite recursion detected in policy for relation", perché
-- Postgres deve ri-applicare la RLS della tabella a se stessa per risolvere la correlazione.
-- La policy PNG non soffre di questo perché il suo conteggio filtra solo su auth.uid(), non
-- correlato alla riga nuova. security definer bypassa la RLS SOLO dentro questa function,
-- rompendo il ciclo; l'unico dato che espone è un intero (il conteggio), non le righe stesse.
create or replace function public.get_campaign_bestiary_count(p_campaign_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from campaign_bestiary_monsters where campaign_id = p_campaign_id
$$;

create or replace function public.get_campaign_map_album_count(p_campaign_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from map_albums where campaign_id = p_campaign_id
$$;

-- Stessa funzione, per i PNG collegati a UNA campagna (campaign_npc_characters): il limite
-- get_campaign_addition_limit su npc_characters.created_by (sopra) è GLOBALE e da solo non
-- basta, un utente sotto quella soglia potrebbe comunque collegare PNG illimitati a UNA
-- campagna pescandoli dal catalogo condiviso (Npc.openPicker/NpcPicker.toggle). Questo è il
-- tetto per-campagna gemello di get_campaign_bestiary_count/get_campaign_map_album_count.
create or replace function public.get_campaign_npc_count(p_campaign_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from campaign_npc_characters where campaign_id = p_campaign_id
$$;

-- PNG: stessa policy di prima (npc_characters.created_by, conteggio GLOBALE perché il
-- catalogo PNG è globale), solo la function di quota cambia nome/valori. La policy è già
-- stata droppata più sopra (prima di droppare la function), qui la si ricrea.
create policy "npc_characters_insert_master_or_admin_within_rank_limit" on npc_characters for insert
  with check (
    created_by = auth.uid()
    and (
      exists (select 1 from profiles where id = auth.uid() and is_admin = true)
      or (
        exists (select 1 from campaigns where owner_id = auth.uid())
        and (select count(*) from npc_characters where created_by = auth.uid()) < get_campaign_addition_limit(auth.uid())
      )
    )
  );

-- Bestiario: quota PER CAMPAGNA (non globale come i PNG) sul numero di mostri selezionati
-- in campaign_bestiary_monsters per QUELLA campagna, valutata sul rango di chi la possiede
-- (solo owner/admin possono selezionare, vedi bestiary.ts canManage). Il conteggio passa
-- dalla function security definer qui sopra, non da una subquery inline (vedi il commento
-- lì per il perché: altrimenti "infinite recursion detected in policy for relation").
-- Se questa policy era già stata creata da un run precedente dello script, va droppata
-- prima di ricrearla con la nuova WITH CHECK.
drop policy if exists "campaign_bestiary_monsters_insert_owner_or_admin" on campaign_bestiary_monsters;
drop policy if exists "campaign_bestiary_monsters_insert_owner_or_admin_within_rank_limit" on campaign_bestiary_monsters;
create policy "campaign_bestiary_monsters_insert_owner_or_admin_within_rank_limit" on campaign_bestiary_monsters for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      campaign_id in (select id from campaigns where owner_id = auth.uid())
      and get_campaign_bestiary_count(campaign_id) < get_campaign_addition_limit(auth.uid())
    )
  );

-- Mappe: quota PER CAMPAGNA sul numero di album (map_albums) già presenti in quella
-- campagna, stessa logica di campaign_bestiary_monsters qui sopra (function security
-- definer invece di subquery inline, stesso motivo).
drop policy if exists "map_albums_insert_owner_or_admin" on map_albums;
drop policy if exists "map_albums_insert_owner_or_admin_within_rank_limit" on map_albums;
create policy "map_albums_insert_owner_or_admin_within_rank_limit" on map_albums for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      campaign_id in (select id from campaigns where owner_id = auth.uid())
      and get_campaign_map_album_count(campaign_id) < get_campaign_addition_limit(auth.uid())
    )
  );

-- PNG collegati a una campagna (campaign_npc_characters, tabella ponte popolata sia da
-- NpcForm.submit alla creazione sia da NpcPicker.toggle alla selezione dal catalogo): quota
-- PER CAMPAGNA gemella di quelle sopra, indipendente dal tetto globale su npc_characters.
drop policy if exists "campaign_npc_characters_insert_owner_or_admin" on campaign_npc_characters;
drop policy if exists "campaign_npc_characters_insert_owner_or_admin_within_rank_limit" on campaign_npc_characters;
create policy "campaign_npc_characters_insert_owner_or_admin_within_rank_limit" on campaign_npc_characters for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      campaign_id in (select id from campaigns where owner_id = auth.uid())
      and get_campaign_npc_count(campaign_id) < get_campaign_addition_limit(auth.uid())
    )
  );
