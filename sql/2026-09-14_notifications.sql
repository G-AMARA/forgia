-- Notifiche personali (Centro Messaggi -> nuova tab "Notifiche"): al momento il solo evento
-- che le genera è "un avventuriero ha accettato il tuo invito" per il Master della campagna
-- (vedi InboxStore.acceptInvite), ma la tabella è generica per poter ospitare altri eventi
-- futuri senza cambiare schema.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists idx_notifications_user_id on notifications(user_id);

alter table notifications enable row level security;

-- Ognuno vede solo le proprie notifiche.
create policy "notifications_select_own" on notifications for select
  using (user_id = auth.uid());

-- Ognuno segna come lette solo le proprie.
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid());

-- Inserimento ristretto all'unico evento che oggi genera notifiche: l'invitato può
-- notificare solo il Master (owner_id) di una campagna per cui ha appena accettato
-- l'invito, niente notifiche spacciate per altri motivi o altri destinatari.
create policy "notifications_insert_invite_accepted" on notifications for insert
  with check (
    user_id in (
      select c.owner_id
      from campaigns c
      join campaign_invites ci on ci.campaign_id = c.id
      where ci.invited_user_id = auth.uid() and ci.status = 'accepted'
    )
  );
