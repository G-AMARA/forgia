-- Costo in monete di ogni oggetto d'equipaggiamento, stesso schema già introdotto per
-- le armi (sql/2026-08-19_weapon_cost.sql): mostrato in Gestione > Equipaggiamento e
-- nella scheda personaggio.
alter table equipment add column if not exists cost_value numeric;
alter table equipment add column if not exists cost_unit text not null default 'gp' check (cost_unit in ('cp', 'sp', 'ep', 'gp', 'pp'));

-- equipment ha già una colonna "cost" jsonb (dato SRD originale, es. {"unit":"gp","quantity":1600})
-- valorizzata per quasi tutto il catalogo: si riusa per popolare le nuove colonne invece di
-- richiedere un re-inserimento manuale da Gestione per ogni oggetto già esistente. Il nuovo
-- form imposta invece direttamente cost_value/cost_unit, "cost" resta solo come dato storico.
update equipment
set cost_value = (cost ->> 'quantity')::numeric,
    cost_unit = cost ->> 'unit'
where cost is not null and cost_value is null;
