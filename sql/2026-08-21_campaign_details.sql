-- Dettagli aggiuntivi campagna (form creazione/modifica): stato, prossima sessione,
-- numero massimo giocatori, livello di partenza consigliato, visibilità. is_public per
-- ora è solo un'etichetta mostrata in UI (dashboard/hub), nessuna RLS collegata: non
-- filtra quali campagne un utente può vedere/interrogare.
alter table campaigns add column if not exists status text not null default 'active' check (status in ('active', 'paused', 'completed'));
alter table campaigns add column if not exists next_session_at timestamptz;
alter table campaigns add column if not exists max_players integer check (max_players is null or max_players > 0);
alter table campaigns add column if not exists starting_level integer not null default 1 check (starting_level between 1 and 20);
alter table campaigns add column if not exists is_public boolean not null default false;
