-- La scurovisione non è più una scelta libera in creazione personaggio: è un tratto
-- insito nella razza (o sottorazza, che lo sostituisce come per ability_bonuses) e si
-- imposta in Gestione > Razze/Sottorazze. characters.darkvision resta in tabella ma non
-- è più scritta dall'app: il valore mostrato in scheda si calcola da races/subraces.darkvision.
alter table races add column if not exists darkvision boolean not null default false;
alter table subraces add column if not exists darkvision boolean not null default false;
