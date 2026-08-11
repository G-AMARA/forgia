-- Il background porta con sé un "oro iniziale" (starting_gold, già in Gestione > Background)
-- ma finora non esisteva nessun campo sul personaggio per riceverlo: la colonna semplicemente
-- non c'era.
alter table characters add column if not exists gold numeric not null default 0;
