-- Equipaggiamento iniziale (livello 1) per classi e background: PHB + XGtE + TCoE.
-- Esegui questo file per intero, in ordine, nell'SQL editor di Supabase.
-- Non e' pensato per essere rilanciato piu' volte sulla sezione 4 (packs): se lo rilanci,
-- prima esegui `delete from equipment_contents where parent_equipment_id in (select id from equipment where type = 'Pack');`

-- ============================================================
-- 1. SCHEMA: nuove colonne
-- ============================================================
alter table weapons add column if not exists weapon_category text check (weapon_category in ('simple','martial'));
alter table equipment add column if not exists tool_category text check (tool_category in ('artisan_tools','musical_instrument'));
alter table classes add column if not exists starting_equipment jsonb not null default '[]'::jsonb;
alter table backgrounds add column if not exists starting_equipment jsonb not null default '[]'::jsonb;
alter table backgrounds add column if not exists starting_gold numeric;

-- ============================================================
-- 2. CLASSIFICAZIONE ARMI SRD (weapon_category) -- livello 2 "picker"
-- ============================================================
update weapons set weapon_category = 'simple'
where lower(name) = any(array[
  'club','dagger','greatclub','handaxe','javelin','light hammer','mace','quarterstaff','sickle','spear',
  'light crossbow','dart','shortbow','sling'
]);

update weapons set weapon_category = 'martial'
where lower(name) = any(array[
  'battleaxe','flail','glaive','greataxe','greatsword','halberd','lance','longsword','maul','morningstar',
  'pike','rapier','scimitar','shortsword','trident','war pick','warhammer','whip',
  'blowgun','hand crossbow','heavy crossbow','longbow','net'
]);

-- verifica: armi attese ma non classificate -> nomi diversi da quelli SRD standard usati sopra,
-- da controllare a mano in Gestione > Armi (include eventuali homebrew, che restano NULL: è normale).
select name from weapons where weapon_category is null;

-- ============================================================
-- 3. CLASSIFICAZIONE STRUMENTI (tool_category) -- livello 2 "picker"
-- ============================================================
-- Ci assicuriamo che ogni strumento generico esista in catalogo (idempotente), poi lo classifichiamo.
insert into equipment (name, type, tool_category, sourcebook_code)
select v.name, 'Tools', v.category, 'homebrew'
from (values
  ('Bagpipes','musical_instrument'),('Drum','musical_instrument'),('Dulcimer','musical_instrument'),
  ('Flute','musical_instrument'),('Lute','musical_instrument'),('Lyre','musical_instrument'),
  ('Horn','musical_instrument'),('Pan Flute','musical_instrument'),('Shawm','musical_instrument'),
  ('Viol','musical_instrument'),
  ('Alchemist''s Supplies','artisan_tools'),('Brewer''s Supplies','artisan_tools'),
  ('Calligrapher''s Supplies','artisan_tools'),('Carpenter''s Tools','artisan_tools'),
  ('Cartographer''s Tools','artisan_tools'),('Cobbler''s Tools','artisan_tools'),
  ('Cook''s Utensils','artisan_tools'),('Glassblower''s Tools','artisan_tools'),
  ('Jeweler''s Tools','artisan_tools'),('Leatherworker''s Tools','artisan_tools'),
  ('Mason''s Tools','artisan_tools'),('Painter''s Supplies','artisan_tools'),
  ('Potter''s Tools','artisan_tools'),('Smith''s Tools','artisan_tools'),
  ('Tinker''s Tools','artisan_tools'),('Weaver''s Tools','artisan_tools'),
  ('Woodcarver''s Tools','artisan_tools')
) as v(name, category)
where not exists (select 1 from equipment e where lower(e.name) = lower(v.name));

update equipment set tool_category = 'musical_instrument'
where lower(name) = any(array['bagpipes','drum','dulcimer','flute','lute','lyre','horn','pan flute','shawm','viol']);

update equipment set tool_category = 'artisan_tools'
where lower(name) = any(array[
  'alchemist''s supplies','brewer''s supplies','calligrapher''s supplies','carpenter''s tools',
  'cartographer''s tools','cobbler''s tools','cook''s utensils','glassblower''s tools','jeweler''s tools',
  'leatherworker''s tools','mason''s tools','painter''s supplies','potter''s tools','smith''s tools',
  'tinker''s tools','weaver''s tools','woodcarver''s tools'
]);

-- ============================================================
-- 4. OGGETTI DI SUPPORTO -- livello 1 "specifici" (armature/foci/attrezzi/componenti di pack
--    mancanti nel catalogo). Idempotente: crea solo quello che non esiste ancora per nome.
-- ============================================================
insert into equipment (name, type, sourcebook_code)
select v.name, v.type, 'homebrew'
from (values
  ('Leather Armor','Armor'), ('Scale Mail','Armor'), ('Chain Mail','Armor'), ('Shield','Armor'),
  ('Holy Symbol','Adventuring Gear'), ('Druidic Focus','Adventuring Gear'), ('Arcane Focus','Adventuring Gear'),
  ('Component Pouch','Adventuring Gear'), ('Spellbook','Adventuring Gear'),
  ('Thieves'' Tools','Tools'), ('Disguise Kit','Tools'), ('Forgery Kit','Tools'), ('Herbalism Kit','Tools'),
  ('Crossbow Bolts','Adventuring Gear'), ('Arrows','Adventuring Gear'),
  ('Backpack','Adventuring Gear'), ('Ball Bearings (Bag of 1,000)','Adventuring Gear'),
  ('String (10 Feet)','Adventuring Gear'), ('Bell','Adventuring Gear'), ('Candle','Adventuring Gear'),
  ('Crowbar','Adventuring Gear'), ('Hammer','Adventuring Gear'), ('Piton','Adventuring Gear'),
  ('Hooded Lantern','Adventuring Gear'), ('Oil (Flask)','Adventuring Gear'), ('Rations (1 Day)','Adventuring Gear'),
  ('Tinderbox','Adventuring Gear'), ('Waterskin','Adventuring Gear'),
  ('Rope, Hempen (50 Feet)','Adventuring Gear'), ('Rope, Silk (50 Feet)','Adventuring Gear'),
  ('Chest','Adventuring Gear'), ('Case, Map or Scroll','Adventuring Gear'),
  ('Clothes, Fine','Adventuring Gear'), ('Clothes, Common','Adventuring Gear'), ('Clothes, Traveler''s','Adventuring Gear'),
  ('Ink (1 Ounce Bottle)','Adventuring Gear'), ('Ink Pen','Adventuring Gear'), ('Lamp','Adventuring Gear'),
  ('Paper (One Sheet)','Adventuring Gear'), ('Perfume (Vial)','Adventuring Gear'), ('Sealing Wax','Adventuring Gear'),
  ('Soap','Adventuring Gear'), ('Torch','Adventuring Gear'), ('Bedroll','Adventuring Gear'),
  ('Mess Kit','Adventuring Gear'), ('Costume','Adventuring Gear'), ('Blanket','Adventuring Gear'),
  ('Alms Box','Adventuring Gear'), ('Incense (Block)','Adventuring Gear'), ('Censer','Adventuring Gear'),
  ('Vestments','Adventuring Gear'), ('Book','Adventuring Gear'), ('Parchment (One Sheet)','Adventuring Gear'),
  ('Sand, Bag','Adventuring Gear'), ('Small Knife','Adventuring Gear'),
  ('Prayer Book','Adventuring Gear'), ('Favor of an Admirer','Adventuring Gear'), ('Shovel','Adventuring Gear'),
  ('Iron Pot','Adventuring Gear'), ('Letter of Introduction','Adventuring Gear'), ('Scroll Case','Adventuring Gear'),
  ('Signet Ring','Adventuring Gear'), ('Scroll of Pedigree','Adventuring Gear'), ('Staff','Adventuring Gear'),
  ('Hunting Trap','Adventuring Gear'), ('Trophy from an Animal','Adventuring Gear'),
  ('Letter from a Dead Colleague','Adventuring Gear'), ('Lucky Charm','Adventuring Gear'),
  ('Insignia of Rank','Adventuring Gear'), ('Trophy from a Fallen Enemy','Adventuring Gear'),
  ('Bone Dice','Adventuring Gear'), ('Map of the City','Adventuring Gear'), ('Pet Mouse','Adventuring Gear'),
  ('Token from Parents','Adventuring Gear')
) as v(name, type)
where not exists (select 1 from equipment e where lower(e.name) = lower(v.name));

-- ============================================================
-- 5. DOTAZIONI PRE-CONFIGURATE (Packs) -- livello 3, via equipment_contents esistente
-- ============================================================
insert into equipment (name, type, sourcebook_code)
select v.name, 'Pack', 'homebrew'
from (values
  ('Burglar''s Pack'),('Diplomat''s Pack'),('Dungeoneer''s Pack'),('Entertainer''s Pack'),
  ('Explorer''s Pack'),('Priest''s Pack'),('Scholar''s Pack')
) as v(name)
where not exists (select 1 from equipment e where lower(e.name) = lower(v.name));

insert into equipment_contents (parent_equipment_id, child_equipment_id, quantity)
select p.id, c.id, v.qty
from (values
  ('Burglar''s Pack','Backpack',1), ('Burglar''s Pack','Ball Bearings (Bag of 1,000)',1),
  ('Burglar''s Pack','String (10 Feet)',1), ('Burglar''s Pack','Bell',1), ('Burglar''s Pack','Candle',5),
  ('Burglar''s Pack','Crowbar',1), ('Burglar''s Pack','Hammer',1), ('Burglar''s Pack','Piton',10),
  ('Burglar''s Pack','Hooded Lantern',1), ('Burglar''s Pack','Oil (Flask)',2),
  ('Burglar''s Pack','Rations (1 Day)',5), ('Burglar''s Pack','Tinderbox',1),
  ('Burglar''s Pack','Waterskin',1), ('Burglar''s Pack','Rope, Hempen (50 Feet)',1),

  ('Diplomat''s Pack','Chest',1), ('Diplomat''s Pack','Case, Map or Scroll',2),
  ('Diplomat''s Pack','Clothes, Fine',1), ('Diplomat''s Pack','Ink (1 Ounce Bottle)',1),
  ('Diplomat''s Pack','Ink Pen',1), ('Diplomat''s Pack','Lamp',1), ('Diplomat''s Pack','Oil (Flask)',2),
  ('Diplomat''s Pack','Paper (One Sheet)',5), ('Diplomat''s Pack','Perfume (Vial)',1),
  ('Diplomat''s Pack','Sealing Wax',1), ('Diplomat''s Pack','Soap',1),

  ('Dungeoneer''s Pack','Backpack',1), ('Dungeoneer''s Pack','Crowbar',1), ('Dungeoneer''s Pack','Hammer',1),
  ('Dungeoneer''s Pack','Piton',10), ('Dungeoneer''s Pack','Torch',10), ('Dungeoneer''s Pack','Tinderbox',1),
  ('Dungeoneer''s Pack','Rations (1 Day)',10), ('Dungeoneer''s Pack','Waterskin',1),
  ('Dungeoneer''s Pack','Rope, Hempen (50 Feet)',1),

  ('Entertainer''s Pack','Backpack',1), ('Entertainer''s Pack','Bedroll',1), ('Entertainer''s Pack','Costume',2),
  ('Entertainer''s Pack','Candle',5), ('Entertainer''s Pack','Rations (1 Day)',5),
  ('Entertainer''s Pack','Waterskin',1), ('Entertainer''s Pack','Disguise Kit',1),

  ('Explorer''s Pack','Backpack',1), ('Explorer''s Pack','Bedroll',1), ('Explorer''s Pack','Mess Kit',1),
  ('Explorer''s Pack','Tinderbox',1), ('Explorer''s Pack','Torch',10), ('Explorer''s Pack','Rations (1 Day)',10),
  ('Explorer''s Pack','Waterskin',1), ('Explorer''s Pack','Rope, Hempen (50 Feet)',1),

  ('Priest''s Pack','Backpack',1), ('Priest''s Pack','Blanket',1), ('Priest''s Pack','Candle',10),
  ('Priest''s Pack','Tinderbox',1), ('Priest''s Pack','Alms Box',1), ('Priest''s Pack','Incense (Block)',2),
  ('Priest''s Pack','Censer',1), ('Priest''s Pack','Vestments',1), ('Priest''s Pack','Rations (1 Day)',2),
  ('Priest''s Pack','Waterskin',1),

  ('Scholar''s Pack','Backpack',1), ('Scholar''s Pack','Book',1), ('Scholar''s Pack','Ink (1 Ounce Bottle)',1),
  ('Scholar''s Pack','Ink Pen',1), ('Scholar''s Pack','Parchment (One Sheet)',10),
  ('Scholar''s Pack','Sand, Bag',1), ('Scholar''s Pack','Small Knife',1)
) as v(pack, item, qty)
join equipment p on lower(p.name) = lower(v.pack)
join equipment c on lower(c.name) = lower(v.item)
where not exists (
  select 1 from equipment_contents ec where ec.parent_equipment_id = p.id and ec.child_equipment_id = c.id
);

-- ============================================================
-- 6. EQUIPAGGIAMENTO INIZIALE DELLE CLASSI (PHB + TCoE)
-- Contratto: array di gruppi { key, options: [ { refs: [...] } ] }.
-- options.length === 1 => nessuna scelta (fisso). "category" rimanda a weapon_category/
-- range_category (weapons) o tool_category (equipment), risolto lato client.
-- ============================================================
update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"category","table":"weapons","category":"martial_melee"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Greataxe"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"martial_melee"}]}
  ]},
  {"key":"fixed-pack","options":[{"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}]},
  {"key":"fixed-javelins","options":[{"refs":[{"kind":"item","table":"weapons","name":"Javelin","quantity":4}]}]}
]$j$::jsonb where lower(name) = 'barbarian';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Rapier"}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Longsword"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Diplomat's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Entertainer's Pack"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Lute"}]},
    {"refs":[{"kind":"category","table":"equipment","category":"musical_instrument"}]}
  ]},
  {"key":"fixed-armor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]}]},
  {"key":"fixed-dagger","options":[{"refs":[{"kind":"item","table":"weapons","name":"Dagger"}]}]}
]$j$::jsonb where lower(name) = 'bard';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Mace"}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Warhammer"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Scale Mail"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Chain Mail"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Light Crossbow"},{"kind":"item","table":"equipment","name":"Crossbow Bolts","quantity":20}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"D","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Priest's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-shield","options":[{"refs":[{"kind":"item","table":"equipment","name":"Shield"}]}]},
  {"key":"fixed-symbol","options":[{"refs":[{"kind":"item","table":"equipment","name":"Holy Symbol"}]}]}
]$j$::jsonb where lower(name) = 'cleric';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Shield"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Scimitar"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple_melee"}]}
  ]},
  {"key":"fixed-pack","options":[{"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}]},
  {"key":"fixed-armor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]}]},
  {"key":"fixed-focus","options":[{"refs":[{"kind":"item","table":"equipment","name":"Druidic Focus"}]}]}
]$j$::jsonb where lower(name) = 'druid';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Chain Mail"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"},{"kind":"item","table":"weapons","name":"Longbow"},{"kind":"item","table":"equipment","name":"Arrows","quantity":20}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"category","table":"weapons","category":"martial"},{"kind":"item","table":"equipment","name":"Shield"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"martial","quantity":2}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Light Crossbow"},{"kind":"item","table":"equipment","name":"Crossbow Bolts","quantity":20}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Handaxe","quantity":2}]}
  ]},
  {"key":"D","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]}
]$j$::jsonb where lower(name) = 'fighter';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Shortsword"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]}
  ]},
  {"key":"fixed-darts","options":[{"refs":[{"kind":"item","table":"weapons","name":"Dart","quantity":10}]}]}
]$j$::jsonb where lower(name) = 'monk';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"category","table":"weapons","category":"martial"},{"kind":"item","table":"equipment","name":"Shield"}]},
    {"refs":[{"kind":"category","table":"weapons","category":"martial","quantity":2}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Javelin","quantity":5}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple_melee"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Priest's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-armor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Chain Mail"}]}]},
  {"key":"fixed-symbol","options":[{"refs":[{"kind":"item","table":"equipment","name":"Holy Symbol"}]}]}
]$j$::jsonb where lower(name) = 'paladin';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Scale Mail"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Shortsword","quantity":2}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple_melee","quantity":2}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-bow","options":[{"refs":[{"kind":"item","table":"weapons","name":"Longbow"}]}]},
  {"key":"fixed-arrows","options":[{"refs":[{"kind":"item","table":"equipment","name":"Arrows","quantity":20}]}]}
]$j$::jsonb where lower(name) = 'ranger';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Rapier"}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Shortsword"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Shortbow"},{"kind":"item","table":"equipment","name":"Arrows","quantity":20}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Shortsword"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Burglar's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-armor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]}]},
  {"key":"fixed-daggers","options":[{"refs":[{"kind":"item","table":"weapons","name":"Dagger","quantity":2}]}]},
  {"key":"fixed-tools","options":[{"refs":[{"kind":"item","table":"equipment","name":"Thieves' Tools"}]}]}
]$j$::jsonb where lower(name) = 'rogue';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Light Crossbow"},{"kind":"item","table":"equipment","name":"Crossbow Bolts","quantity":20}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Component Pouch"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Arcane Focus"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-daggers","options":[{"refs":[{"kind":"item","table":"weapons","name":"Dagger","quantity":2}]}]}
]$j$::jsonb where lower(name) = 'sorcerer';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Light Crossbow"},{"kind":"item","table":"equipment","name":"Crossbow Bolts","quantity":20}]},
    {"refs":[{"kind":"category","table":"weapons","category":"simple"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Component Pouch"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Arcane Focus"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Scholar's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]}
  ]},
  {"key":"fixed-armor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]}]},
  {"key":"fixed-weapon","options":[{"refs":[{"kind":"category","table":"weapons","category":"simple"}]}]},
  {"key":"fixed-daggers","options":[{"refs":[{"kind":"item","table":"weapons","name":"Dagger","quantity":2}]}]}
]$j$::jsonb where lower(name) = 'warlock';

update classes set starting_equipment = $j$[
  {"key":"A","options":[
    {"refs":[{"kind":"item","table":"weapons","name":"Quarterstaff"}]},
    {"refs":[{"kind":"item","table":"weapons","name":"Dagger"}]}
  ]},
  {"key":"B","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Component Pouch"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Arcane Focus"}]}
  ]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Scholar's Pack"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Explorer's Pack"}]}
  ]},
  {"key":"fixed-book","options":[{"refs":[{"kind":"item","table":"equipment","name":"Spellbook"}]}]}
]$j$::jsonb where lower(name) = 'wizard';

update classes set starting_equipment = $j$[
  {"key":"A","options":[{"refs":[{"kind":"category","table":"weapons","category":"simple","quantity":2}]}]},
  {"key":"B","options":[{"refs":[{"kind":"item","table":"weapons","name":"Light Crossbow"},{"kind":"item","table":"equipment","name":"Crossbow Bolts","quantity":20}]}]},
  {"key":"C","options":[
    {"refs":[{"kind":"item","table":"equipment","name":"Leather Armor"}]},
    {"refs":[{"kind":"item","table":"equipment","name":"Scale Mail"}]}
  ]},
  {"key":"fixed-tools1","options":[{"refs":[{"kind":"item","table":"equipment","name":"Thieves' Tools"}]}]},
  {"key":"fixed-tools2","options":[{"refs":[{"kind":"item","table":"equipment","name":"Tinker's Tools"}]}]},
  {"key":"fixed-pack","options":[{"refs":[{"kind":"item","table":"equipment","name":"Dungeoneer's Pack"}]}]}
]$j$::jsonb where lower(name) = 'artificer';

-- ============================================================
-- 7. EQUIPAGGIAMENTO INIZIALE DEI BACKGROUND (PHB) -- quasi tutto fisso, oro a parte
-- ============================================================
update backgrounds set starting_gold = 15, starting_equipment = $j$[
  {"key":"fixed-symbol","options":[{"refs":[{"kind":"item","table":"equipment","name":"Holy Symbol"}]}]},
  {"key":"fixed-book","options":[{"refs":[{"kind":"item","table":"equipment","name":"Prayer Book"}]}]},
  {"key":"fixed-incense","options":[{"refs":[{"kind":"item","table":"equipment","name":"Incense (Block)","quantity":5}]}]},
  {"key":"fixed-vestments","options":[{"refs":[{"kind":"item","table":"equipment","name":"Vestments"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'acolyte';

update backgrounds set starting_gold = 15, starting_equipment = $j$[
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Fine"}]}]},
  {"key":"fixed-disguise","options":[{"refs":[{"kind":"item","table":"equipment","name":"Disguise Kit"}]}]},
  {"key":"fixed-forgery","options":[{"refs":[{"kind":"item","table":"equipment","name":"Forgery Kit"}]}]}
]$j$::jsonb where lower(name) = 'charlatan';

update backgrounds set starting_gold = 15, starting_equipment = $j$[
  {"key":"fixed-crowbar","options":[{"refs":[{"kind":"item","table":"equipment","name":"Crowbar"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'criminal';

update backgrounds set starting_gold = 15, starting_equipment = $j$[
  {"key":"fixed-instrument","options":[{"refs":[{"kind":"category","table":"equipment","category":"musical_instrument"}]}]},
  {"key":"fixed-favor","options":[{"refs":[{"kind":"item","table":"equipment","name":"Favor of an Admirer"}]}]},
  {"key":"fixed-costume","options":[{"refs":[{"kind":"item","table":"equipment","name":"Costume"}]}]}
]$j$::jsonb where lower(name) = 'entertainer';

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-tools","options":[{"refs":[{"kind":"category","table":"equipment","category":"artisan_tools"}]}]},
  {"key":"fixed-shovel","options":[{"refs":[{"kind":"item","table":"equipment","name":"Shovel"}]}]},
  {"key":"fixed-pot","options":[{"refs":[{"kind":"item","table":"equipment","name":"Iron Pot"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'folk hero';

update backgrounds set starting_gold = 15, starting_equipment = $j$[
  {"key":"fixed-tools","options":[{"refs":[{"kind":"category","table":"equipment","category":"artisan_tools"}]}]},
  {"key":"fixed-letter","options":[{"refs":[{"kind":"item","table":"equipment","name":"Letter of Introduction"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Traveler's"}]}]}
]$j$::jsonb where lower(name) = 'guild artisan';

update backgrounds set starting_gold = 5, starting_equipment = $j$[
  {"key":"fixed-case","options":[{"refs":[{"kind":"item","table":"equipment","name":"Scroll Case"}]}]},
  {"key":"fixed-blanket","options":[{"refs":[{"kind":"item","table":"equipment","name":"Blanket"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]},
  {"key":"fixed-herbalism","options":[{"refs":[{"kind":"item","table":"equipment","name":"Herbalism Kit"}]}]}
]$j$::jsonb where lower(name) = 'hermit';

update backgrounds set starting_gold = 25, starting_equipment = $j$[
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Fine"}]}]},
  {"key":"fixed-ring","options":[{"refs":[{"kind":"item","table":"equipment","name":"Signet Ring"}]}]},
  {"key":"fixed-scroll","options":[{"refs":[{"kind":"item","table":"equipment","name":"Scroll of Pedigree"}]}]}
]$j$::jsonb where lower(name) = any(array['noble','nobile']);

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-staff","options":[{"refs":[{"kind":"item","table":"equipment","name":"Staff"}]}]},
  {"key":"fixed-trap","options":[{"refs":[{"kind":"item","table":"equipment","name":"Hunting Trap"}]}]},
  {"key":"fixed-trophy","options":[{"refs":[{"kind":"item","table":"equipment","name":"Trophy from an Animal"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Traveler's"}]}]}
]$j$::jsonb where lower(name) = 'outlander';

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-ink","options":[{"refs":[{"kind":"item","table":"equipment","name":"Ink (1 Ounce Bottle)"}]}]},
  {"key":"fixed-pen","options":[{"refs":[{"kind":"item","table":"equipment","name":"Ink Pen"}]}]},
  {"key":"fixed-knife","options":[{"refs":[{"kind":"item","table":"equipment","name":"Small Knife"}]}]},
  {"key":"fixed-letter","options":[{"refs":[{"kind":"item","table":"equipment","name":"Letter from a Dead Colleague"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'sage';

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-club","options":[{"refs":[{"kind":"item","table":"weapons","name":"Club"}]}]},
  {"key":"fixed-rope","options":[{"refs":[{"kind":"item","table":"equipment","name":"Rope, Silk (50 Feet)"}]}]},
  {"key":"fixed-charm","options":[{"refs":[{"kind":"item","table":"equipment","name":"Lucky Charm"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'sailor';

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-insignia","options":[{"refs":[{"kind":"item","table":"equipment","name":"Insignia of Rank"}]}]},
  {"key":"fixed-trophy","options":[{"refs":[{"kind":"item","table":"equipment","name":"Trophy from a Fallen Enemy"}]}]},
  {"key":"fixed-dice","options":[{"refs":[{"kind":"item","table":"equipment","name":"Bone Dice"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'soldier';

update backgrounds set starting_gold = 10, starting_equipment = $j$[
  {"key":"fixed-knife","options":[{"refs":[{"kind":"item","table":"equipment","name":"Small Knife"}]}]},
  {"key":"fixed-map","options":[{"refs":[{"kind":"item","table":"equipment","name":"Map of the City"}]}]},
  {"key":"fixed-pet","options":[{"refs":[{"kind":"item","table":"equipment","name":"Pet Mouse"}]}]},
  {"key":"fixed-token","options":[{"refs":[{"kind":"item","table":"equipment","name":"Token from Parents"}]}]},
  {"key":"fixed-clothes","options":[{"refs":[{"kind":"item","table":"equipment","name":"Clothes, Common"}]}]}
]$j$::jsonb where lower(name) = 'urchin';

-- ============================================================
-- 8. VERIFICA FINALE
-- ============================================================
-- Classi/background con starting_equipment ancora vuoto: il nome in tabella non combacia
-- con quello atteso qui sopra (es. "Guild Merchant" invece di "Guild Artisan") -> rinominare
-- o aggiungere una seconda update con lower(name) = '...'.
select name from classes where jsonb_array_length(starting_equipment) = 0;
select name from backgrounds where jsonb_array_length(starting_equipment) = 0;
