-- Cavalcatura/veicolo posseduto dal personaggio (tab Equipaggiamento, sotto il peso
-- complessivo), stesso pattern di equipped_armor_id: riferimento a un elemento del
-- catalogo equipment con type = 'Mounts and Vehicles', nessuna tabella dedicata.
alter table characters add column if not exists mount_equipment_id uuid references equipment(id) on delete set null;
