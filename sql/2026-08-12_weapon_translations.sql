-- Traduzioni italiane delle 37 armi SRD: al momento diverse (Light Crossbow, Dagger, Club, ...)
-- comparivano in inglese nel picker equipaggiamento iniziale perché non erano mai state tradotte.
-- Idempotente: upsert su (content_table, content_id, locale).
insert into content_translations (content_table, content_id, locale, name)
select 'weapons', w.id, 'it', v.name_it
from (values
  -- semplici da mischia
  ('Club','Clava'), ('Dagger','Pugnale'), ('Greatclub','Randello'), ('Handaxe','Ascetta'),
  ('Javelin','Giavellotto'), ('Light Hammer','Martello leggero'), ('Mace','Mazza'),
  ('Quarterstaff','Bastone ferrato'), ('Sickle','Falcetto'), ('Spear','Lancia'),
  -- semplici a distanza
  ('Light Crossbow','Balestra leggera'), ('Dart','Dardo'), ('Shortbow','Arco corto'), ('Sling','Fionda'),
  -- da guerra da mischia
  ('Battleaxe','Ascia da battaglia'), ('Flail','Mazzafrusto'), ('Glaive','Falcione'),
  ('Greataxe','Ascia bipenne'), ('Greatsword','Spadone'), ('Halberd','Alabarda'),
  ('Lance','Lancia da cavaliere'), ('Longsword','Spada lunga'), ('Maul','Maglio'),
  ('Morningstar','Stella del mattino'), ('Pike','Picca'), ('Rapier','Stocco'),
  ('Scimitar','Scimitarra'), ('Shortsword','Spada corta'), ('Trident','Tridente'),
  ('War Pick','Piccone da guerra'), ('Warhammer','Martello da guerra'), ('Whip','Frusta'),
  -- da guerra a distanza
  ('Blowgun','Cerbottana'), ('Hand Crossbow','Balestra a mano'), ('Heavy Crossbow','Balestra pesante'),
  ('Longbow','Arco lungo'), ('Net','Rete')
) as v(name_en, name_it)
join weapons w on lower(w.name) = lower(v.name_en)
on conflict (content_table, content_id, locale) do update set name = excluded.name;

-- Etichetta più corretta per lo Scholar's Pack: il termine ufficiale italiano è
-- "Dotazione da Studioso", non "Dotazione da Saggio" usato dalla migration precedente.
update content_translations set name = 'Dotazione da Studioso'
where content_table = 'equipment' and locale = 'it'
  and content_id = (select id from equipment where lower(name) = 'scholar''s pack');
