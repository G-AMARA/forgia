-- Selezione dei PNG del catalogo (npc_characters) da mostrare nel pannello di una
-- campagna: il catalogo è globale e gestito da Gestione > PNG, ma ogni DM sceglie qui
-- quali PNG usare nella propria campagna. Stessa forma di campaign_bestiary_monsters.
create table if not exists campaign_npc_characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  npc_id uuid not null references npc_characters(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (campaign_id, npc_id)
);

create index if not exists idx_campaign_npc_characters_campaign_id on campaign_npc_characters(campaign_id);

alter table campaign_npc_characters enable row level security;

create policy "campaign_npc_characters_select_owner_or_admin" on campaign_npc_characters for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "campaign_npc_characters_insert_owner_or_admin" on campaign_npc_characters for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "campaign_npc_characters_delete_owner_or_admin" on campaign_npc_characters for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
