-- Interruttore ON/OFF del Master per il tasto "Gioca" (campaign-hub.ts): finché è spento,
-- solo owner/admin possono entrare in sessione, i giocatori restano fuori in attesa che il
-- Master finisca i preparativi (mappe, token, ecc.) e lo accenda. Default true per non
-- bloccare le campagne già in corso al momento della migrazione.
alter table campaigns add column if not exists play_enabled boolean not null default true;
