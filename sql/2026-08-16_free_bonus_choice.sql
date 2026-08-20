-- Bonus "a scelta libera": alcune razze/sottorazze non danno un bonus fisso ma un monte punti
-- da distribuire liberamente entro un tetto per singola caratteristica (es. Umano Variante: +1 a
-- due caratteristiche a scelta; Draconide Cromatico: +2 a una e +1 a un'altra, oppure +1 a tre
-- diverse). Il totale allocato si somma comunque dentro characters.applied_bonus come oggi: non
-- serve una colonna per registrare la distribuzione, si ricostruisce per differenza rispetto ai
-- bonus fissi di razza/sottorazza (vedi character-sheet.ts).
alter table races add column if not exists free_bonus_points integer not null default 0;
alter table races add column if not exists free_bonus_max_per_ability integer not null default 0;
alter table subraces add column if not exists free_bonus_points integer not null default 0;
alter table subraces add column if not exists free_bonus_max_per_ability integer not null default 0;

-- Sottorazze già seminate in 2026-08-15_subraces.sql che sono "a scelta libera".
update subraces set free_bonus_points = 3, free_bonus_max_per_ability = 2
where name in ('Draconide Cromatico', 'Draconide Metallico', 'Draconide Gemmario');

update subraces set free_bonus_points = 2, free_bonus_max_per_ability = 1
where name = 'Umano Variante';

update subraces set free_bonus_points = 2, free_bonus_max_per_ability = 1
where name in (
  'Mezzelfo Standard', 'Mezzelfo Alto', 'Mezzelfo dei Boschi', 'Mezzelfo Scuro', 'Mezzelfo Acquatico'
);

update subraces set free_bonus_points = 1, free_bonus_max_per_ability = 1
where name in (
  'Umano del Marchio del Ritrovamento (Eberron)',
  'Umano del Marchio della Lavorazione (Eberron)',
  'Umano del Marchio del Passaggio (Eberron)',
  'Umano del Marchio della Tempesta (Eberron)'
);

-- Best-effort: Fatina (Fey) e Leproide (Harengon) sono razze interamente a scelta libera, senza
-- sottorazze. Se non presenti nel catalogo dell'utente con questi nomi, 0 righe aggiornate, nessun errore.
update races set free_bonus_points = 3, free_bonus_max_per_ability = 2
where name in ('Fey', 'Harengon');
