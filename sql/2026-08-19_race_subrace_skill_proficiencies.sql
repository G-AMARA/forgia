-- Competenze automatiche da razza/sottorazza (es. Percezione dell'Harengon): stessa forma
-- e stesso meccanismo già usato per backgrounds.skill_proficiencies — in scheda personaggio
-- risultano spuntate e bloccate finché si ha quella razza/sottorazza (vedi character-sheet.ts
-- isSkillLocked, ora esteso a razza+sottorazza oltre che a background).
alter table races add column if not exists skill_proficiencies jsonb not null default '[]'::jsonb;
alter table subraces add column if not exists skill_proficiencies jsonb not null default '[]'::jsonb;
