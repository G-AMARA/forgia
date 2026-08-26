-- Bugfix: "Copri Area" cancellava per intero ogni rettangolo rivelato che intersecava
-- l'area coperta, invece di ritagliarne solo la porzione toccata. Nuova colonna per una
-- seconda lista di rettangoli applicata SOPRA i rivelati (vedi FogOfWarComponent): coprire
-- ora aggiunge un rettangolo a covered_areas invece di rimuovere/filtrare revealed_areas.
alter table map_fog_state add column if not exists covered_areas jsonb not null default '[]'::jsonb;
