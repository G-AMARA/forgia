-- Costo in monete di ogni arma (es. "5 ma" per il giavellotto), mostrato in Gestione Armi
-- e nella scheda personaggio. Valore + unità separati invece di un unico numero in mo,
-- per restare fedeli alla tabella prezzi SRD che esprime alcune armi in mr/ma.
alter table weapons add column if not exists cost_value numeric;
alter table weapons add column if not exists cost_unit text not null default 'gp' check (cost_unit in ('cp', 'sp', 'ep', 'gp', 'pp'));
