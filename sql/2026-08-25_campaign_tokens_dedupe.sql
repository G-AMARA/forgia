-- Bugfix: pedina "phantom" duplicata quando un giocatore rimuove e ri-piazza il proprio
-- personaggio. Causa reale: la policy di delete ammetteva solo owner/admin, quindi la
-- DELETE di un giocatore sulla propria pedina veniva filtrata dalla RLS. Per PostgREST
-- "0 righe cancellate" NON è un errore, quindi CampaignTokens.remove() (che prima non
-- controllava quante righe erano state effettivamente cancellate) la toglieva comunque
-- dalla UI locale come se fosse riuscita. Al ri-piazzamento, la vecchia riga mai cancellata
-- restava sul DB accanto alla nuova -> 2 token per lo stesso personaggio.
drop policy if exists "campaign_tokens_delete_owner_or_admin" on campaign_tokens;
create policy "campaign_tokens_delete_owner_admin_or_own_character" on campaign_tokens for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or character_id in (
      select id from characters
      where owner_id = auth.uid() and campaign_id = campaign_tokens.campaign_id
    )
  );

-- Pulizia dei doppioni già esistenti (le pedine "phantom" prodotte dal bug prima di
-- questo fix): l'indice unique sotto non può essere creato finché il DB contiene righe
-- che lo violerebbero. Per ogni gruppo (campaign_id, character_id) tiene la riga più
-- recente (created_at, con l'id come spareggio in caso di timestamp identico) e cancella
-- le altre — è la pedina "vecchia" che la delete originale non era riuscita a rimuovere.
delete from campaign_tokens t
using campaign_tokens t2
where t.character_id is not null
  and t.campaign_id = t2.campaign_id
  and t.character_id = t2.character_id
  and (t.created_at, t.id) < (t2.created_at, t2.id);

-- Invariante di dominio imposta dal DB, non solo dall'app: un personaggio non può avere
-- più di un token nella stessa campagna. Con questo vincolo, CampaignTokens.insert() può
-- fare upsert (onConflict campaign_id+character_id) invece di un semplice insert: anche in
-- caso di doppio click o di race con una remove() ancora in volo, il risultato resta un
-- solo token per personaggio, mai una duplicazione.
-- NULL non è mai considerato uguale a un altro NULL in un vincolo unique, quindi i mostri
-- (character_id null) restano illimitati: questo vincolo si applica solo ai PG.
create unique index if not exists idx_campaign_tokens_one_per_character
  on campaign_tokens (campaign_id, character_id);
