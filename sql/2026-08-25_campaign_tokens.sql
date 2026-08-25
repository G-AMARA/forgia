-- Pedine sulla plancia di gioco (pagina /gioca/:campaignId, InteractiveBoardComponent).
-- x/y sono in coordinate "mondo" (pixel dell'immagine mappa originale, non pixel schermo:
-- la conversione screen<->world vive lato client in interactive-board.ts). avatar_url è
-- denormalizzato sul token invece di un join su characters/bestiary_monsters perché un
-- token può rappresentare un mostro (character_id null) e perché il Master deve poter
-- cambiare l'immagine della singola pedina senza toccare la scheda del personaggio.
create table if not exists campaign_tokens (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  character_id uuid references characters(id) on delete cascade,
  name text not null,
  avatar_url text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  size integer not null default 1,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_tokens_campaign_id on campaign_tokens(campaign_id);

alter table campaign_tokens enable row level security;

-- Select: owner/admin (visibilità totale, come tutte le altre tabelle campaign-scoped) o
-- un giocatore con un personaggio in questa campagna (deve vedere le pedine per giocare).
create policy "campaign_tokens_select_owner_admin_or_member" on campaign_tokens for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or campaign_id in (select campaign_id from characters where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Insert/delete: solo il Master piazza o rimuove pedine (PG e mostri).
create policy "campaign_tokens_insert_owner_or_admin" on campaign_tokens for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "campaign_tokens_delete_owner_or_admin" on campaign_tokens for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Update: il Master muove qualsiasi pedina (anche quelle bloccate); un giocatore muove
-- solo la pedina del proprio personaggio, e solo se non is_locked. La stessa condizione è
-- ripetuta in "with check" per impedire che l'update stesso sblocchi la pedina o la
-- riassegni a un altro personaggio.
create policy "campaign_tokens_update_owner_admin_or_character_owner" on campaign_tokens for update
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (not is_locked and character_id in (select id from characters where owner_id = auth.uid()))
  )
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (not is_locked and character_id in (select id from characters where owner_id = auth.uid()))
  );

-- Nota: la policy di update è a livello di riga, non di colonna (stesso modello di
-- sicurezza usato dalle altre tabelle di questo progetto) — un giocatore potrebbe quindi
-- inviare via client un update che tocca anche altri campi della propria pedina.
-- CampaignTokens.updatePosition() (Angular) invia sempre e solo { x, y }, ma questo è un
-- vincolo applicativo, non imposto dal DB.
