-- Traduzioni italiane per gli oggetti creati dalla migration 2026-08-11_starting_equipment.sql
-- (dotazioni, strumenti generici, oggetti di supporto). Idempotente: upsert su (content_table,
-- content_id, locale), quindi rieseguibile senza problemi.
insert into content_translations (content_table, content_id, locale, name)
select 'equipment', e.id, 'it', v.name_it
from (values
  -- strumenti musicali
  ('Bagpipes','Zampogna'), ('Drum','Tamburo'), ('Dulcimer','Salterio'), ('Flute','Flauto'),
  ('Lute','Liuto'), ('Lyre','Lira'), ('Horn','Corno'), ('Pan Flute','Flauto di Pan'),
  ('Shawm','Cennamella'), ('Viol','Viola da gamba'),
  -- strumenti da artigiano
  ('Alchemist''s Supplies','Strumenti da alchimista'), ('Brewer''s Supplies','Attrezzi da birraio'),
  ('Calligrapher''s Supplies','Strumenti da calligrafo'), ('Carpenter''s Tools','Attrezzi da falegname'),
  ('Cartographer''s Tools','Attrezzi da cartografo'), ('Cobbler''s Tools','Attrezzi da calzolaio'),
  ('Cook''s Utensils','Utensili da cucina'), ('Glassblower''s Tools','Attrezzi da vetraio'),
  ('Jeweler''s Tools','Attrezzi da gioielliere'), ('Leatherworker''s Tools','Attrezzi da conciatore'),
  ('Mason''s Tools','Attrezzi da muratore'), ('Painter''s Supplies','Strumenti da pittore'),
  ('Potter''s Tools','Attrezzi da vasaio'), ('Smith''s Tools','Attrezzi da fabbro'),
  ('Tinker''s Tools','Attrezzi da meccanico'), ('Weaver''s Tools','Attrezzi da tessitore'),
  ('Woodcarver''s Tools','Attrezzi da intagliatore'),
  -- armature, foci, componenti
  ('Leather Armor','Armatura di cuoio'), ('Scale Mail','Corazza a scaglie'), ('Chain Mail','Armatura di maglia'),
  ('Shield','Scudo'), ('Holy Symbol','Simbolo sacro'), ('Druidic Focus','Focus druidico'),
  ('Arcane Focus','Focus arcano'), ('Component Pouch','Borsa dei componenti'), ('Spellbook','Libro degli incantesimi'),
  ('Thieves'' Tools','Attrezzi da scassinatore'), ('Disguise Kit','Kit per il camuffamento'),
  ('Forgery Kit','Kit per la contraffazione'), ('Herbalism Kit','Kit delle erbe'),
  ('Crossbow Bolts','Dardi da balestra'), ('Arrows','Frecce'),
  -- componenti delle dotazioni
  ('Backpack','Zaino'), ('Ball Bearings (Bag of 1,000)','Biglie di metallo (sacco da 1000)'),
  ('String (10 Feet)','Filo (3 metri)'), ('Bell','Campanella'), ('Candle','Candela'),
  ('Crowbar','Piede di porco'), ('Hammer','Martello'), ('Piton','Chiodo da roccia'),
  ('Hooded Lantern','Lanterna schermata'), ('Oil (Flask)','Ampolla d''olio'), ('Rations (1 Day)','Razione (1 giorno)'),
  ('Tinderbox','Acciarino e pietra focaia'), ('Waterskin','Otre d''acqua'),
  ('Rope, Hempen (50 Feet)','Corda di canapa (15 metri)'), ('Rope, Silk (50 Feet)','Corda di seta (15 metri)'),
  ('Chest','Cassa'), ('Case, Map or Scroll','Custodia per mappe o pergamene'),
  ('Clothes, Fine','Abiti eleganti'), ('Clothes, Common','Abiti comuni'), ('Clothes, Traveler''s','Abiti da viaggio'),
  ('Ink (1 Ounce Bottle)','Boccetta d''inchiostro'), ('Ink Pen','Penna d''oca'), ('Lamp','Lampada'),
  ('Paper (One Sheet)','Foglio di carta'), ('Perfume (Vial)','Boccetta di profumo'), ('Sealing Wax','Ceralacca'),
  ('Soap','Sapone'), ('Torch','Torcia'), ('Bedroll','Sacco a pelo'), ('Mess Kit','Gavetta'),
  ('Costume','Costume'), ('Blanket','Coperta'), ('Alms Box','Cassetta per le offerte'),
  ('Incense (Block)','Blocco d''incenso'), ('Censer','Turibolo'), ('Vestments','Paramenti sacri'),
  ('Book','Libro'), ('Parchment (One Sheet)','Foglio di pergamena'), ('Sand, Bag','Sacchetto di sabbia'),
  ('Small Knife','Coltellino'),
  -- oggetti "narrativi" dei background
  ('Prayer Book','Libro di preghiere'), ('Favor of an Admirer','Favore di un ammiratore'),
  ('Shovel','Pala'), ('Iron Pot','Vaso di ghisa'), ('Letter of Introduction','Lettera di presentazione'),
  ('Scroll Case','Custodia per pergamene'), ('Signet Ring','Anello con sigillo'),
  ('Scroll of Pedigree','Albero genealogico'), ('Staff','Bastone da passeggio'), ('Hunting Trap','Tagliola'),
  ('Trophy from an Animal','Trofeo di un animale ucciso'), ('Letter from a Dead Colleague','Lettera di un collega defunto'),
  ('Lucky Charm','Portafortuna'), ('Insignia of Rank','Insegna del grado'),
  ('Trophy from a Fallen Enemy','Trofeo prelevato da un nemico caduto'), ('Bone Dice','Dadi d''osso'),
  ('Map of the City','Mappa della città'), ('Pet Mouse','Topo addomesticato'), ('Token from Parents','Ricordo dei genitori'),
  -- dotazioni pre-configurate
  ('Burglar''s Pack','Dotazione da scassinatore'), ('Diplomat''s Pack','Dotazione da diplomatico'),
  ('Dungeoneer''s Pack','Dotazione da speleologo'), ('Entertainer''s Pack','Dotazione da intrattenitore'),
  ('Explorer''s Pack','Dotazione da esploratore'), ('Priest''s Pack','Dotazione da sacerdote'),
  ('Scholar''s Pack','Dotazione da saggio')
) as v(name_en, name_it)
join equipment e on lower(e.name) = lower(v.name_en)
on conflict (content_table, content_id, locale) do update set name = excluded.name;
