-- Permette al Master di una campagna (owner_id, non solo admin) di creare PNG dal tab PNG
-- della propria campagna (npc.ts, npc-form.ts), entro una quota legata al proprio rango
-- araldico (vedi core/ranks.ts npcLimitForTier): 1 per Adepto, poi 3/6/9/12/15/18 di 3 in
-- 3. Fato (admin) resta illimitato tramite il ramo is_admin della policy, non tramite
-- questa function. Deve restare sincronizzata con RANK_TIERS in ranks.ts.
create or replace function public.get_npc_creation_limit(p_user_id uuid)
returns integer
language sql
stable
as $$
  select case
    when v.hours >= 500 then 18
    when v.hours >= 350 then 15
    when v.hours >= 200 then 12
    when v.hours >= 100 then 9
    when v.hours >= 50 then 6
    when v.hours >= 10 then 3
    else 1
  end
  from (select navigation_seconds / 3600.0 as hours from profiles where id = p_user_id) v
$$;

-- Prima: solo gli admin potevano inserire in npc_characters (npc_characters_insert_admin,
-- vedi sql/2026-08-28_npc_characters.sql). Ora anche chi possiede almeno una campagna (è
-- Master di quella campagna), ma solo per sé stesso (created_by = auth.uid()) e finché il
-- conteggio dei propri PNG resta sotto la quota del proprio rango. Un giocatore semplice
-- (che non possiede nessuna campagna) non rientra in nessuno dei due rami e resta escluso.
drop policy if exists "npc_characters_insert_admin" on npc_characters;
create policy "npc_characters_insert_master_or_admin_within_rank_limit" on npc_characters for insert
  with check (
    created_by = auth.uid()
    and (
      exists (select 1 from profiles where id = auth.uid() and is_admin = true)
      or (
        exists (select 1 from campaigns where owner_id = auth.uid())
        and (select count(*) from npc_characters where created_by = auth.uid()) < get_npc_creation_limit(auth.uid())
      )
    )
  );
