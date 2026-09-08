-- Le armi vivono già nella tabella dedicata `weapons` (gestita da weapon-create.ts,
-- assegnate ai personaggi via character_weapons): le righe equipment con type = 'Weapon'
-- sono un doppione residuo dell'import SRD iniziale e non sono mai raggiungibili dalla UI
-- (equipment-create.ts non permette di scegliere 'Weapon' come type, equipment-list.ts le
-- filtra già esplicitamente in lettura). Le eliminiamo definitivamente dal DB.

-- 1. Rimuove le traduzioni orfane collegate alle righe che stiamo per cancellare
-- (content_translations non ha FK su equipment, va pulita a mano come fa deleteEquipment()).
delete from content_translations
where content_table = 'equipment'
  and content_id in (select id from equipment where type = 'Weapon');

-- 2. Elimina le righe equipment di tipo Weapon.
-- equipment_contents si ripulisce da sé (ON DELETE CASCADE sulla FK, vedi 2026-08-14_equipment_dedupe.sql).
-- Se una di queste righe fosse ancora referenziata da character_inventory.equipment_id o da
-- characters.mount_equipment_id, la delete fallisce per violazione di FK invece di perdere dati:
-- in tal caso investigare quella riga prima di riprovare.
delete from equipment where type = 'Weapon';

-- verifica: deve tornare vuoto
select id, name from equipment where type = 'Weapon';
