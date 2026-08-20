-- Privilegi e Tratti in scheda personaggio: lista di {name, description} per razza,
-- sottorazza (si somma a quella della razza, non la sostituisce: sono tratti distinti,
-- non un valore singolo come ability_bonuses) e background. Stessa forma jsonb già usata
-- per i blocchi del bestiario (special_traits), riusata qui via TraitListEditor.
alter table races add column if not exists traits jsonb not null default '[]'::jsonb;
alter table subraces add column if not exists traits jsonb not null default '[]'::jsonb;
alter table backgrounds add column if not exists traits jsonb not null default '[]'::jsonb;
