-- Card di sfondo scelta dal giocatore quando aggiunge un eroe a una campagna (picker
-- add-hero-modal), mostrata nel roster di campaign-hub. Il catalogo delle card e le
-- condizioni di sblocco per rango araldico vivono lato client in core/character-cards.ts;
-- qui memorizziamo solo la key scelta per quel clone specifico (non è un campo "portatile"
-- copiato da cloneScalarFields: ogni clone in campagna ha la propria card). Default 'basic'
-- perché è l'unica sempre sbloccata.
alter table characters add column if not exists card_key text not null default 'basic';
