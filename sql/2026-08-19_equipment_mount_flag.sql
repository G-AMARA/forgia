-- Distingue le vere cavalcature/veicoli (selezionabili in scheda personaggio, gestiti da
-- Gestione > Cavalcature e Veicoli, vedi mount-create.ts) dagli accessori che condividono
-- lo stesso type = 'Mounts and Vehicles' nel dato SRD ma sono equipaggiamento normale
-- (bardature, selle, bisacce da sella, morso e briglia, stallaggio): questi restano
-- gestibili solo da Gestione > Equipaggiamento e non compaiono nel dropdown cavalcature.
alter table equipment add column if not exists is_mount_or_vehicle boolean not null default false;

-- Backfill sui 20 nomi SRD che sono cavalcature/veicoli veri e propri: tutto il resto di
-- type = 'Mounts and Vehicles' (bardature, selle, bisacce, morso e briglia, stallaggio)
-- resta false, cioè equipaggiamento generico.
update equipment
set is_mount_or_vehicle = true
where type = 'Mounts and Vehicles'
  and name in (
    'Camel', 'Carriage', 'Cart', 'Chariot', 'Donkey', 'Elephant', 'Galley',
    'Horse, draft', 'Horse, riding', 'Keelboat', 'Longship', 'Mastiff', 'Mule',
    'Pony', 'Rowboat', 'Sailing ship', 'Sled', 'Wagon', 'Warhorse', 'Warship'
  );
