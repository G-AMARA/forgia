-- Correzione: i nomi base in weapons sono già in italiano, non inglese come assunto nella
-- migration del 2026-08-11. Le query a corrispondenza sul nome inglese non hanno mai trovato
-- nulla, quindi weapon_category è rimasto null per 36/37 armi. Ricostruito dai nomi italiani
-- reali (vedi la lista completa condivisa in chat).
update weapons set weapon_category = 'simple' where lower(name) = any(array[
  'accetta', 'arco corto', 'balestra leggera', 'bastone ferrato', 'falcetto', 'fionda',
  'freccetta', 'giavellotto', 'lancia', 'martello leggero', 'mazza', 'pugnale',
  'randello', 'randello grande'
]);

update weapons set weapon_category = 'martial' where lower(name) = any(array[
  'alabarda', 'arco lungo', 'ascia da battaglia', 'ascia grande', 'balestra a mano',
  'balestra pesante', 'cerbottana', 'falcione', 'frusta', 'lancia da cavalleria', 'maglio',
  'martello da guerra', 'mazzafrusto', 'picca', 'piccone da guerra', 'rete', 'scimitarra',
  'spada corta', 'spada lunga', 'spadone', 'stella del mattino', 'stocco', 'tridente'
]);

-- verifica: deve tornare vuoto
select name from weapons where weapon_category is null;
