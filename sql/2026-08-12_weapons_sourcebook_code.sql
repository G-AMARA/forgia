-- weapon-create.ts scrive sourcebook_code su ogni insert/update da sempre, ma la colonna
-- non è mai stata creata sulla tabella weapons (a differenza di equipment, che ce l'ha già
-- con la stessa FK verso sourcebooks). Senza questa colonna, modificare/salvare un'arma da
-- Gestione fallisce con "Could not find the 'sourcebook_code' column of 'weapons'".
alter table weapons add column if not exists sourcebook_code text references sourcebooks(code);

-- Le armi già presenti restano con sourcebook_code = null (non sono homebrew, ma non conosciamo
-- il codice esatto della sourcebook originale). Se vuoi, aggiorna tu i valori corretti, es.:
-- update weapons set sourcebook_code = 'srd' where sourcebook_code is null;
