-- Privilegi e Tratti in scheda personaggio: stessa colonna già aggiunta a razze/sottorazze/
-- background (sql/2026-08-18_race_subrace_background_traits.sql), ora anche sulle sottoclassi.
alter table subclasses add column if not exists traits jsonb not null default '[]'::jsonb;
