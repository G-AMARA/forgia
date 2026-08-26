-- Fase 3A: Nebbia di Guerra. Un solo stato per (campagna, immagine mappa) — non una riga
-- per rettangolo rivelato: il client mantiene l'intero array in memoria (FogOfWarStore) e
-- lo persiste per intero a fine tracciamento, evitando di dover fare geometria (unione,
-- sottrazione di rettangoli) lato SQL. "Copri Area" quindi non ritaglia una porzione da un
-- rettangolo esistente: rimuove per intero ogni rettangolo che interseca l'area coperta
-- (vedi FogOfWarStore.cover) — semplificazione voluta per uno strumento a rettangoli grezzi.
create table if not exists map_fog_state (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  map_image_id uuid not null references map_album_images(id) on delete cascade,
  revealed_areas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, map_image_id)
);

alter table map_fog_state enable row level security;

-- Select: owner/admin o un giocatore con un personaggio in questa campagna (deve vedere la
-- nebbia per giocare) — stesso pattern di campaign_tokens.
create policy "map_fog_state_select_owner_admin_or_member" on map_fog_state for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or campaign_id in (select campaign_id from characters where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Scrittura: solo il Master (owner) o admin. I giocatori non gestiscono mai la nebbia.
create policy "map_fog_state_insert_owner_or_admin" on map_fog_state for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_fog_state_update_owner_or_admin" on map_fog_state for update
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "map_fog_state_delete_owner_or_admin" on map_fog_state for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
