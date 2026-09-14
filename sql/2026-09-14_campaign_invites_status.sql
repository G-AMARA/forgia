-- Storicizza lo stato delle richieste di invito (nuova tabella "Inviti" in Gestisci
-- Campagna, sotto il pannello Impostazioni & Regole): prima campaign_invites era solo una
-- coda di pendenti, cancellata all'accettazione/rifiuto (vedi
-- sql/2026-09-14_campaign_invites.sql). Ora la riga resta e cambia stato, così il Master
-- vede anche chi ha accettato/rifiutato, non solo chi è ancora in sospeso.
--
-- L'unique(campaign_id, invited_user_id) esistente continua a valere: un nuovo invito allo
-- stesso utente dopo un rifiuto AGGIORNA la riga esistente riportandola a 'pending' (vedi
-- upsert in InviteAdventurerModal.sendInvites), invece di crearne una seconda.
alter table campaign_invites add column if not exists status text not null default 'pending' check (status in ('pending', 'accepted', 'declined'));

-- L'invitato aggiorna lo stato della propria riga (accetta/rifiuta): prima questa
-- transizione passava dalla policy di DELETE (che cancellava l'invito), qui la versione
-- UPDATE che la storicizza invece di farla sparire. La policy di delete resta com'era, per
-- un'eventuale revoca di un invito ancora pendente da parte del Master.
create policy "campaign_invites_update_invited_or_owner" on campaign_invites for update
  using (
    invited_user_id = auth.uid()
    or campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
