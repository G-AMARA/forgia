-- "Carta del Mostro" a schermo intero dal menu contestuale del token: per il Master serve
-- risalire dal token (name/avatar_url denormalizzati, vedi 2026-08-25_campaign_tokens.sql)
-- allo statblock completo in bestiary_monsters. Un match per nome sarebbe fragile (nomi
-- duplicati, rinomina futura del token): meglio un riferimento esplicito, nullable perché
-- riguarda solo le pedine mostro (character_id null) e perché una pedina deve restare
-- valida anche se il mostro viene poi rimosso dal catalogo globale.
alter table campaign_tokens add column if not exists monster_id uuid references bestiary_monsters(id) on delete set null;
