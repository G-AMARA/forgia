-- Sottorazze: stessa forma di subclasses ma agganciate a races invece che a classes.
-- ability_bonuses usa lo stesso formato piatto {str,dex,cos,int,wis,cha} delle razze homebrew
-- (vedi normalizeAbilityBonuses in content-store.ts) e si SOMMA al bonus della razza madre:
-- per le sottorazze con varianti alternative nel manuale (retaggi Draconide, linee di sangue
-- Tiefling, marchi Eberron dei Mezzorco) i valori qui sono presi letteralmente dalla lista
-- fornita e possono sommarsi al bonus già presente sulla razza madre invece di sostituirlo
-- come da regolamento originale: se serve la fedeltà esatta, azzera a mano il bonus della
-- razza madre in Gestione > Razze quando si sceglie una di queste sottorazze.
create table if not exists subraces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  race_id uuid not null references races(id) on delete cascade,
  ability_bonuses jsonb not null default '{}'::jsonb,
  description text
);

create index if not exists idx_subraces_race_id on subraces(race_id);

alter table characters add column if not exists subrace_id uuid references subraces(id);

alter table subraces enable row level security;

create policy "subraces_select_all" on subraces for select
  using (true);

create policy "subraces_insert_admin" on subraces for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "subraces_update_admin" on subraces for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "subraces_delete_admin" on subraces for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Seed: sottorazze del manuale. Il match con la razza madre è per nome inglese canonico
-- (races.name), lo stesso usato dall'import SRD. Se una razza non è presente nel catalogo
-- dell'utente con quel nome esatto, la relativa select restituisce 0 righe e l'insert
-- non inserisce nulla per quella riga (nessun errore).

-- Elf
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Elfo Alto', '{"int":1}'::jsonb, 'Elfo alto: affinato nella magia arcana.'),
  ('Elfo dei Boschi', '{"wis":1}'::jsonb, 'Elfo dei boschi: cacciatore silenzioso legato alla natura.'),
  ('Elfo Scuro (Drow)', '{"cha":1}'::jsonb, 'Elfo scuro delle Terre Sotterranee.'),
  ('Elfo Marino', '{"cos":1}'::jsonb, 'Elfo adattato alla vita negli oceani.'),
  ('Eladrin', '{"cha":1}'::jsonb, 'Elfo del Feywild, legato alle stagioni.'),
  ('Shadar-kai', '{"cos":1}'::jsonb, 'Elfo del Piano Ombra, al servizio della Regina Ombra.'),
  ('Avariel (Elfo Alato)', '{"cha":1}'::jsonb, 'Elfo alato, dotato del volo.'),
  ('Grugach (Elfo Selvaggio)', '{"str":1}'::jsonb, 'Elfo selvaggio isolato dalla civiltà.'),
  ('Elfo del Marchio dell''Ombra (Eberron)', '{"cha":1}'::jsonb, 'Elfo portatore del Marchio dell''Ombra.'),
  ('Elfo del Marchio della Creazione (Eberron)', '{"int":1}'::jsonb, 'Elfo portatore del Marchio della Creazione.')
) as v(name, bonus, description)
where r.name = 'Elf';

-- Dwarf
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Nano delle Montagne', '{"str":2}'::jsonb, 'Nano robusto, abituato ad armature pesanti (bonus doppio +2 con quello base).'),
  ('Nano delle Colline', '{"wis":1}'::jsonb, 'Nano dai sensi acuti e grande resistenza.'),
  ('Nano Grigio (Duergar)', '{"str":1}'::jsonb, 'Nano grigio delle Terre Sotterranee, immune alla magia illusoria.'),
  ('Nano del Marchio della Custodia (Eberron)', '{"int":1}'::jsonb, 'Nano portatore del Marchio della Custodia.')
) as v(name, bonus, description)
where r.name = 'Dwarf';

-- Halfling
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Halfling Piedelesto', '{"cha":1}'::jsonb, 'Halfling socievole e furtivo.'),
  ('Halfling Storto / Robusto', '{"cos":1}'::jsonb, 'Halfling robusto, resistente al veleno.'),
  ('Halfling Cuorforte', '{"wis":1}'::jsonb, 'Halfling coraggioso di fronte al pericolo.'),
  ('Halfling del Boscoloto (Lotusden)', '{"wis":1}'::jsonb, 'Halfling legato agli spiriti della natura.'),
  ('Halfling del Marchio della Guarigione (Eberron)', '{"wis":1}'::jsonb, 'Halfling portatore del Marchio della Guarigione.'),
  ('Halfling del Marchio dell''Ospitalità (Eberron)', '{"cha":1}'::jsonb, 'Halfling portatore del Marchio dell''Ospitalità.')
) as v(name, bonus, description)
where r.name = 'Halfling';

-- Gnome
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Gnomo delle Foreste', '{"dex":1}'::jsonb, 'Gnomo che parla con i piccoli animali del bosco.'),
  ('Gnomo delle Rocce', '{"cos":1}'::jsonb, 'Gnomo inventore, abile con i marchingegni.'),
  ('Gnomo delle Profondità (Svirfneblin)', '{"dex":1}'::jsonb, 'Gnomo delle Terre Sotterranee, esperto nel nascondersi.'),
  ('Gnomo del Marchio della Scrittura (Eberron)', '{"cha":1}'::jsonb, 'Gnomo portatore del Marchio della Scrittura.')
) as v(name, bonus, description)
where r.name = 'Gnome';

-- Dragonborn
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Draconide Cromatico', '{}'::jsonb, 'Retaggio cromatico: +2 a una caratteristica e +1 a un''altra (oppure +1 a tre diverse), a scelta del giocatore.'),
  ('Draconide Metallico', '{}'::jsonb, 'Retaggio metallico: +2 a una caratteristica e +1 a un''altra (oppure +1 a tre diverse), a scelta del giocatore.'),
  ('Draconide Gemmario', '{}'::jsonb, 'Retaggio gemmario: +2 a una caratteristica e +1 a un''altra (oppure +1 a tre diverse), a scelta del giocatore.'),
  ('Draconide Ravenita', '{"str":2,"cos":1}'::jsonb, 'Draconide dei domini di Ravenloft.'),
  ('Draconide Sanguedrago (Draconblood)', '{"int":2,"cha":1}'::jsonb, 'Draconide legato agli antichi imperi draconici.')
) as v(name, bonus, description)
where r.name = 'Dragonborn';

-- Tiefling
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Linea Infernale di Asmodeus (Standard)', '{"cha":2,"int":1}'::jsonb, 'Linea di sangue di Asmodeus, sovrano dei Nove Inferi.'),
  ('Linea Infernale di Baalzebul', '{"cha":2,"int":1}'::jsonb, 'Linea di sangue di Baalzebul.'),
  ('Linea Infernale di Dispater', '{"cha":2,"dex":1}'::jsonb, 'Linea di sangue di Dispater.'),
  ('Linea Infernale di Fierna', '{"cha":2,"wis":1}'::jsonb, 'Linea di sangue di Fierna.'),
  ('Linea Infernale di Glasya', '{"cha":2,"dex":1}'::jsonb, 'Linea di sangue di Glasya.'),
  ('Linea Infernale di Levistus', '{"cha":2,"cos":1}'::jsonb, 'Linea di sangue di Levistus.'),
  ('Linea Infernale di Mammon', '{"cha":2,"int":1}'::jsonb, 'Linea di sangue di Mammon.'),
  ('Linea Infernale di Mefistofele', '{"cha":2,"int":1}'::jsonb, 'Linea di sangue di Mefistofele.'),
  ('Linea Infernale di Zariel', '{"cha":2,"str":1}'::jsonb, 'Linea di sangue di Zariel.'),
  ('Variante Felina / Feral', '{"dex":2,"int":1}'::jsonb, 'Variante felina: inverte la statistica base della razza.')
) as v(name, bonus, description)
where r.name = 'Tiefling';

-- Human
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Umano Standard', '{"str":1,"dex":1,"cos":1,"int":1,"wis":1,"cha":1}'::jsonb, 'Umano versatile: +1 a tutte le caratteristiche.'),
  ('Umano Variante', '{}'::jsonb, '+1 a due caratteristiche a scelta del giocatore, più un talento e una competenza.'),
  ('Umano del Marchio del Ritrovamento (Eberron)', '{"wis":2}'::jsonb, 'Portatore del Marchio del Ritrovamento (+2 Saggezza, +1 a scelta del giocatore).'),
  ('Umano del Marchio della Lavorazione (Eberron)', '{"int":2}'::jsonb, 'Portatore del Marchio della Lavorazione (+2 Intelligenza, +1 a scelta del giocatore).'),
  ('Umano del Marchio del Passaggio (Eberron)', '{"dex":2}'::jsonb, 'Portatore del Marchio del Passaggio (+2 Destrezza, +1 a scelta del giocatore).'),
  ('Umano del Marchio della Tempesta (Eberron)', '{"cha":2}'::jsonb, 'Portatore del Marchio della Tempesta (+2 Carisma, +1 a scelta del giocatore).')
) as v(name, bonus, description)
where r.name = 'Human';

-- Half-Elf
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Mezzelfo Standard', '{"cha":2}'::jsonb, '+1 aggiuntivo a due caratteristiche a scelta del giocatore.'),
  ('Mezzelfo Alto', '{"cha":2}'::jsonb, 'Retaggio dagli elfi alti. +1 aggiuntivo a due caratteristiche a scelta del giocatore.'),
  ('Mezzelfo dei Boschi', '{"cha":2}'::jsonb, 'Retaggio dagli elfi dei boschi. +1 aggiuntivo a due caratteristiche a scelta del giocatore.'),
  ('Mezzelfo Scuro', '{"cha":2}'::jsonb, 'Retaggio dagli elfi scuri. +1 aggiuntivo a due caratteristiche a scelta del giocatore.'),
  ('Mezzelfo Acquatico', '{"cha":2}'::jsonb, 'Retaggio dagli elfi marini. +1 aggiuntivo a due caratteristiche a scelta del giocatore.'),
  ('Mezzelfo del Marchio del Sospetto (Eberron)', '{"cha":2,"dex":1}'::jsonb, 'Portatore del Marchio del Sospetto.'),
  ('Mezzelfo del Marchio della Tempesta (Eberron)', '{"cha":2,"dex":1}'::jsonb, 'Portatore del Marchio della Tempesta.')
) as v(name, bonus, description)
where r.name = 'Half-Elf';

-- Half-Orc
insert into subraces (name, race_id, ability_bonuses, description)
select v.name, r.id, v.bonus, v.description
from races r, (values
  ('Mezzorco Standard', '{"str":2,"cos":1}'::jsonb, 'Mezzorco robusto e temprato dalla battaglia.'),
  ('Mezzorco del Marchio della Caccia (Eberron)', '{"wis":2,"cos":1}'::jsonb, 'Portatore del Marchio della Caccia.')
) as v(name, bonus, description)
where r.name = 'Half-Orc';
