-- Inviti campagna (Centro Messaggi -> tab "Inviti Campagna" + bottone "Invita Avventuriero"
-- in Gestisci Campagna): coda di inviti pendenti, senza colonna status. Un invito esiste
-- finché è in sospeso; accettarlo o rifiutarlo lo CANCELLA (vedi InboxStore.acceptInvite/
-- declineInvite), niente storicizzazione. unique(campaign_id, invited_user_id) impedisce
-- doppi inviti allo stesso utente per la stessa campagna finché il precedente è pendente.
create table if not exists campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  invited_user_id uuid not null references profiles(id) on delete cascade,
  invited_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, invited_user_id)
);

create index if not exists idx_campaign_invites_invited_user_id on campaign_invites(invited_user_id);
create index if not exists idx_campaign_invites_campaign_id on campaign_invites(campaign_id);

alter table campaign_invites enable row level security;

-- L'invitato vede i propri inviti (Centro Messaggi); il Master/admin della campagna vede
-- chi ha già invitato (per escluderlo dalla ricerca nella modale "Invita Avventuriero").
create policy "campaign_invites_select_invited_or_owner" on campaign_invites for select
  using (
    invited_user_id = auth.uid()
    or campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Solo il Master (owner) della campagna o un admin può invitare, e solo a nome proprio
-- (invited_by = auth.uid(), niente inviti spacciati per conto di qualcun altro).
create policy "campaign_invites_insert_owner_or_admin" on campaign_invites for insert
  with check (
    invited_by = auth.uid()
    and (
      campaign_id in (select id from campaigns where owner_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

-- Cancellazione: l'invitato la usa per accettare/rifiutare (consuma il proprio invito),
-- il Master/admin per revocare un invito inviato per errore.
create policy "campaign_invites_delete_invited_or_owner" on campaign_invites for delete
  using (
    invited_user_id = auth.uid()
    or campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
