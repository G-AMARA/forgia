-- PNG: catalogo globale di personaggi non giocanti gestito da Gestione > PNG, stessa
-- forma del Bestiario (bestiary_monsters): visibile a tutti, scrivibile solo dagli admin.
-- Niente statistiche di combattimento: qui interessano solo carta e descrizione (ruolo,
-- luogo/fazione, atteggiamento verso il gruppo, testo libero).
create table if not exists npc_characters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),

  name text not null,
  title text,
  location text,
  attitude text check (attitude in ('friendly', 'neutral', 'hostile')),
  description text,
  image_url text
);

alter table npc_characters enable row level security;

drop policy if exists "npc_characters_select_all" on npc_characters;
create policy "npc_characters_select_all" on npc_characters for select
  using (true);

drop policy if exists "npc_characters_insert_admin" on npc_characters;
create policy "npc_characters_insert_admin" on npc_characters for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "npc_characters_update_admin" on npc_characters;
create policy "npc_characters_update_admin" on npc_characters for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "npc_characters_delete_admin" on npc_characters;
create policy "npc_characters_delete_admin" on npc_characters for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Il bucket storage "npcs" va creato a mano da Dashboard Supabase (Storage > New bucket >
-- "npcs", Public: ON) prima di lanciare queste policy — stesso procedimento del bucket
-- "bestiary" (vedi sql/2026-08-14_bestiary_monsters.sql). Immagini in ${uuid}.ext, catalogo
-- condiviso tra tutte le campagne quindi scrittura ristretta agli admin.
drop policy if exists "npcs_bucket_public_read" on storage.objects;
create policy "npcs_bucket_public_read" on storage.objects for select
  using (bucket_id = 'npcs');

drop policy if exists "npcs_bucket_write_admin" on storage.objects;
create policy "npcs_bucket_write_admin" on storage.objects for insert
  with check (
    bucket_id = 'npcs'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "npcs_bucket_update_admin" on storage.objects;
create policy "npcs_bucket_update_admin" on storage.objects for update
  using (
    bucket_id = 'npcs'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "npcs_bucket_delete_admin" on storage.objects;
create policy "npcs_bucket_delete_admin" on storage.objects for delete
  using (
    bucket_id = 'npcs'
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
