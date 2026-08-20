-- Capacità di carico di cavalcature e veicoli (es. "480 lb" per un cavallo da soma):
-- testo libero perché il dato SRD non è sempre un singolo numero omogeneo (alcuni
-- veicoli la esprimono come "Cargo 2,000 lb" o portata passeggeri, non un peso puro).
alter table equipment add column if not exists carrying_capacity text;
