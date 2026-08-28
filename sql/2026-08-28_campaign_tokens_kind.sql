-- Distingue la provenienza di una pedina (personaggio, mostro del Bestiario, PNG) per
-- poterle colorare diversamente sulla board (vedi token-permissions.ts borderClassFor):
-- prima d'ora character_id null copriva indistintamente mostri e PNG, non c'era modo di
-- separarli. Default 'monster' per compatibilità con le righe esistenti (il catalogo PNG
-- non esisteva ancora, quindi ogni riga con character_id null è per forza un mostro);
-- backfill esplicito per le righe che invece sono personaggi.
alter table campaign_tokens add column if not exists kind text not null default 'monster'
  check (kind in ('character', 'monster', 'npc'));

update campaign_tokens set kind = 'character' where character_id is not null;
