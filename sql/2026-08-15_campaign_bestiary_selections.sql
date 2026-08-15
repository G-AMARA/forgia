-- Selezione dei mostri del catalogo (bestiary_monsters) da mostrare nel carosello di
-- una campagna: il catalogo è globale e gestito da Gestione > Bestiario, ma ogni DM
-- sceglie qui quali mostri usare nella propria campagna. Stessa logica di proprietà
-- che aveva bestiary_monsters prima di diventare un catalogo condiviso.
create table if not exists campaign_bestiary_monsters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  monster_id uuid not null references bestiary_monsters(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (campaign_id, monster_id)
);

create index if not exists idx_campaign_bestiary_monsters_campaign_id on campaign_bestiary_monsters(campaign_id);

alter table campaign_bestiary_monsters enable row level security;

create policy "campaign_bestiary_monsters_select_owner_or_admin" on campaign_bestiary_monsters for select
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "campaign_bestiary_monsters_insert_owner_or_admin" on campaign_bestiary_monsters for insert
  with check (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "campaign_bestiary_monsters_delete_owner_or_admin" on campaign_bestiary_monsters for delete
  using (
    campaign_id in (select id from campaigns where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
