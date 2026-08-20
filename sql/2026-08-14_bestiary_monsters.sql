-- Bestiario: catalogo globale di mostri gestito da Gestione > Bestiario, stessa forma
-- delle altre tabelle di reference (races, subraces, weapons...): visibile a tutti,
-- scrivibile solo dagli admin. Gruppi di campi fissi (info generali, difesa,
-- caratteristiche, resistenze/sensi) su colonne singole; i gruppi ripetibili
-- (tratti/azioni/azioni bonus/reazioni/azioni leggendarie/azioni di tana/effetti
-- regionali) sono tutti la stessa forma "lista di {name, description}", quindi jsonb
-- invece di 7 tabelle figlie identiche.
create table if not exists bestiary_monsters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),

  name text not null,
  size text,
  type text,
  alignment text,

  armor_class text,
  hit_points text,
  speed text,

  str smallint,
  dex smallint,
  con smallint,
  intelligence smallint,
  wis smallint,
  cha smallint,
  saving_throws text,
  skills text,

  damage_vulnerabilities text,
  damage_resistances text,
  damage_immunities text,
  condition_immunities text,
  senses text,
  languages text,
  challenge_rating text,
  experience_points integer,

  special_traits jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  bonus_actions jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '[]'::jsonb,
  legendary_actions jsonb not null default '[]'::jsonb,
  lair_actions jsonb not null default '[]'::jsonb,
  regional_effects jsonb not null default '[]'::jsonb,

  image_url text
);

-- Ripulisce lo stato lasciato dalla prima versione di questa migrazione (bestiario
-- ancora per-campagna, con campaign_id not null): la tabella qui sopra esisteva già con
-- quella colonna quando questo file girava la prima volta, quindi "create table if not
-- exists" non l'ha toccata. Le vecchie policy dipendono dalla colonna (referenziano
-- campaign_id nelle loro condizioni), quindi vanno droppate PRIMA della colonna stessa,
-- altrimenti Postgres rifiuta il drop column.
drop policy if exists "bestiary_monsters_select_owner_or_admin" on bestiary_monsters;
drop policy if exists "bestiary_monsters_insert_owner_or_admin" on bestiary_monsters;
drop policy if exists "bestiary_monsters_update_owner_or_admin" on bestiary_monsters;
drop policy if exists "bestiary_monsters_delete_owner_or_admin" on bestiary_monsters;

alter table bestiary_monsters drop column if exists campaign_id;
drop index if exists idx_bestiary_monsters_campaign_id;

alter table bestiary_monsters enable row level security;

drop policy if exists "bestiary_monsters_select_all" on bestiary_monsters;
create policy "bestiary_monsters_select_all" on bestiary_monsters for select
  using (true);

drop policy if exists "bestiary_monsters_insert_admin" on bestiary_monsters;
create policy "bestiary_monsters_insert_admin" on bestiary_monsters for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "bestiary_monsters_update_admin" on bestiary_monsters;
create policy "bestiary_monsters_update_admin" on bestiary_monsters for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "bestiary_monsters_delete_admin" on bestiary_monsters;
create policy "bestiary_monsters_delete_admin" on bestiary_monsters for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Il bucket storage "bestiary" va creato a mano da Dashboard Supabase (Storage > New
-- bucket > "bestiary", Public: ON) prima di lanciare queste policy — stesso procedimento
-- già usato per i bucket "avatars" e "content-images", non presenti in nessun file SQL
-- di questo repo. Le immagini vivono in ${uuid}.ext, senza cartella per campagna: il
-- catalogo è condiviso tra tutte le campagne, quindi la scrittura è ristretta agli admin
-- invece che al proprietario di una cartella.
drop policy if exists "bestiary_bucket_write_owner_or_admin" on storage.objects;
drop policy if exists "bestiary_bucket_update_owner_or_admin" on storage.objects;
drop policy if exists "bestiary_bucket_delete_owner_or_admin" on storage.objects;

drop policy if exists "bestiary_bucket_public_read" on storage.objects;
create policy "bestiary_bucket_public_read" on storage.objects for select
  using (bucket_id = 'bestiary');

drop policy if exists "bestiary_bucket_write_admin" on storage.objects;
create policy "bestiary_bucket_write_admin" on storage.objects for insert
  with check (
    bucket_id = 'bestiary'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "bestiary_bucket_update_admin" on storage.objects;
create policy "bestiary_bucket_update_admin" on storage.objects for update
  using (
    bucket_id = 'bestiary'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "bestiary_bucket_delete_admin" on storage.objects;
create policy "bestiary_bucket_delete_admin" on storage.objects for delete
  using (
    bucket_id = 'bestiary'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
