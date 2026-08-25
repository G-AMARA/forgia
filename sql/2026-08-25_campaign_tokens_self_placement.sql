-- Bugfix Fase 2D: "Piazza il tuo Personaggio sulla Mappa" (PlayCharacterPanel, lato
-- giocatore) non faceva nulla. Non era un bug di binding client: la policy di insert su
-- campaign_tokens ammetteva solo owner/admin, quindi qualunque INSERT tentato da un
-- giocatore veniva respinto dalla RLS. Il sintomo "clic senza effetto" viene da
-- CampaignTokens.insert() (src/app/core/campaign-tokens.ts), che in caso di errore si
-- limita a un console.error e ritorna: nessuna eccezione, nessun segnale in UI.
-- L'evocazione mostri dal Bestiario funzionava solo perché quel pulsante è visibile solo
-- al Master, che è anche owner della campagna.
drop policy if exists "campaign_tokens_insert_owner_or_admin" on campaign_tokens;
create policy "campaign_tokens_insert_owner_admin_or_own_character" on campaign_tokens for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or character_id in (
      select id from characters
      where owner_id = auth.uid() and campaign_id = campaign_tokens.campaign_id
    )
  );

-- Stesso irrigidimento sulla policy di update esistente: character_id deve appartenere a
-- un personaggio DI QUELLA campagna (campaign_id = campaign_tokens.campaign_id), non di
-- una campagna qualsiasi posseduta dall'utente. La versione originale non lo verificava.
drop policy if exists "campaign_tokens_update_owner_admin_or_character_owner" on campaign_tokens;
create policy "campaign_tokens_update_owner_admin_or_character_owner" on campaign_tokens for update
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      not is_locked
      and character_id in (
        select id from characters
        where owner_id = auth.uid() and campaign_id = campaign_tokens.campaign_id
      )
    )
  )
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (
      not is_locked
      and character_id in (
        select id from characters
        where owner_id = auth.uid() and campaign_id = campaign_tokens.campaign_id
      )
    )
  );
