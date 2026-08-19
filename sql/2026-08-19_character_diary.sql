-- Taccuino del personaggio (nuovo tab in scheda personaggio, dopo Armeria): annotazioni
-- libere del giocatore, ognuna mostrata come una pagina di diario a sé, con la propria
-- data (entry_date, modificabile dall'utente: non necessariamente la data di scrittura
-- reale, es. per annotare un evento di sessioni fa). Tabella indipendente (non fa parte
-- di FULL_CHARACTER_SELECT) perché la lista può crescere parecchio e va ricaricata solo
-- quando si apre il tab, non ad ogni altro salvataggio.
create table if not exists character_diary_entries (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  content text not null,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- alter idempotente: se questo file era già stato eseguito nella versione precedente
-- (senza entry_date), aggiunge la colonna mancante invece di fallire silenziosamente
-- sul create table if not exists.
alter table character_diary_entries add column if not exists entry_date date not null default current_date;

create index if not exists idx_character_diary_entries_character_id on character_diary_entries(character_id);

alter table character_diary_entries enable row level security;

-- Lettura: chiunque sia autenticato può leggere il taccuino di qualunque personaggio,
-- stesso principio già in uso per la scheda stessa (un master apre /scheda-personaggio/:id
-- di un giocatore senza restrizioni di proprietà lato client).
-- drop+create invece di "create policy" da solo: postgres non supporta CREATE POLICY IF
-- NOT EXISTS, e questo file può essere rieseguito dopo una prima run parziale.
drop policy if exists "character_diary_entries_select_authenticated" on character_diary_entries;
create policy "character_diary_entries_select_authenticated" on character_diary_entries for select
  using (auth.uid() is not null);

-- Scrittura: solo il proprietario del personaggio o un admin (stesso pattern additivo
-- già usato in sql/2026-08-19_characters_admin_write.sql).
drop policy if exists "character_diary_entries_write_owner_or_admin" on character_diary_entries;
create policy "character_diary_entries_write_owner_or_admin" on character_diary_entries for all
  using (
    character_id in (select id from characters where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    character_id in (select id from characters where owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
