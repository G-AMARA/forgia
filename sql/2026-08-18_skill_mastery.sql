-- Maestria (Expertise 5e): raddoppia il bonus competenza su al massimo 2 competenze tra
-- quelle in cui il personaggio è già competente. Non esclusiva di una classe (Ladro, Bardo
-- e alcune sottoclassi la hanno in regole 5e): lista libera di chiavi competenza, stesso
-- formato di characters.skill_proficiencies.
alter table characters add column if not exists skill_mastery jsonb not null default '[]'::jsonb;
