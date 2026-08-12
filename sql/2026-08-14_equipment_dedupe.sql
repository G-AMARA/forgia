-- Pulizia dei doppioni creati dalla migration del 2026-08-11: la tabella equipment era già in
-- inglese con una sua convenzione di naming ("Tipo, descrittore"), quindi 6 dei nostri "oggetti
-- di supporto" inseriti come nuovi in realtà duplicavano righe già esistenti con un nome diverso:
--   Incense (Block)  -> Block of incense
--   Crossbow Bolts   -> Crossbow bolt
--   Hooded Lantern   -> Lantern, hooded
--   Iron Pot         -> Pot, iron
--   Costume          -> Clothes, costume
--   Scroll Case      -> Case, map or scroll
-- Bone Dice e Prayer Book NON sono doppioni (non esiste equivalente SRD), restano.

-- 1. Ripuntella equipment_contents dei pack sugli oggetti "veri"
update equipment_contents ec
set child_equipment_id = (select id from equipment where name = 'Lantern, hooded')
where ec.child_equipment_id = (select id from equipment where name = 'Hooded Lantern' and sourcebook_code = 'homebrew');

update equipment_contents ec
set child_equipment_id = (select id from equipment where name = 'Block of incense')
where ec.child_equipment_id = (select id from equipment where name = 'Incense (Block)' and sourcebook_code = 'homebrew');

update equipment_contents ec
set child_equipment_id = (select id from equipment where name = 'Clothes, costume')
where ec.child_equipment_id = (select id from equipment where name = 'Costume' and sourcebook_code = 'homebrew');

-- 2. Ripuntella i riferimenti per nome dentro starting_equipment di classi e background
-- (sostituzione testuale sicura: la stringa compare solo come valore del campo "name").
update classes set starting_equipment = replace(starting_equipment::text, '"Crossbow Bolts"', '"Crossbow bolt"')::jsonb
where starting_equipment::text like '%Crossbow Bolts%';

update backgrounds set starting_equipment = replace(starting_equipment::text, '"Iron Pot"', '"Pot, iron"')::jsonb
where starting_equipment::text like '%Iron Pot%';

update backgrounds set starting_equipment = replace(starting_equipment::text, '"Scroll Case"', '"Case, map or scroll"')::jsonb
where starting_equipment::text like '%Scroll Case%';

update backgrounds set starting_equipment = replace(starting_equipment::text, '"Costume"', '"Clothes, costume"')::jsonb
where starting_equipment::text like '%"Costume"%';

update backgrounds set starting_equipment = replace(starting_equipment::text, '"Incense (Block)"', '"Block of incense"')::jsonb
where starting_equipment::text like '%Incense (Block)%';

-- 3. Sposta le traduzioni italiane dai vecchi id (che stiamo per cancellare) a quelli corretti
delete from content_translations
where content_table = 'equipment' and locale = 'it'
  and content_id in (
    select id from equipment where sourcebook_code = 'homebrew'
      and name in ('Hooded Lantern', 'Incense (Block)', 'Crossbow Bolts', 'Iron Pot', 'Scroll Case', 'Costume')
  );

insert into content_translations (content_table, content_id, locale, name)
select 'equipment', e.id, 'it', v.name_it
from (values
  ('Lantern, hooded', 'Lanterna schermata'),
  ('Block of incense', 'Blocco d''incenso'),
  ('Crossbow bolt', 'Dardo da balestra'),
  ('Pot, iron', 'Vaso di ghisa'),
  ('Case, map or scroll', 'Custodia per mappe o pergamene'),
  ('Clothes, costume', 'Costume')
) as v(name_en, name_it)
join equipment e on e.name = v.name_en
on conflict (content_table, content_id, locale) do update set name = excluded.name;

-- 4. Ora che nulla punta più ai vecchi id, elimina i 6 doppioni homebrew
delete from equipment
where sourcebook_code = 'homebrew'
  and name in ('Hooded Lantern', 'Incense (Block)', 'Crossbow Bolts', 'Iron Pot', 'Scroll Case', 'Costume');

-- 5. Cosmetico: i 7 pack esistevano già come "Adventuring Gear", li riclassifichiamo come "Pack"
-- (nuovo tipo introdotto dalla migration) così compaiono nel gruppo "Dotazione" invece che
-- mescolati con lo zaino e le razioni.
update equipment set type = 'Pack'
where sourcebook_code = 'srd-2014' and name in (
  'Burglar''s Pack', 'Diplomat''s Pack', 'Dungeoneer''s Pack', 'Entertainer''s Pack',
  'Explorer''s Pack', 'Priest''s Pack', 'Scholar''s Pack'
);

-- verifica: deve tornare vuoto (nessun homebrew di quelli sospetti rimasto)
select name from equipment
where name in ('Hooded Lantern', 'Incense (Block)', 'Crossbow Bolts', 'Iron Pot', 'Scroll Case', 'Costume');
