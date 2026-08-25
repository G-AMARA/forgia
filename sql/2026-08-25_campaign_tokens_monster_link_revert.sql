-- Revert di 2026-08-25_campaign_tokens_monster_link.sql: la "Carta del Mostro" è stata
-- semplificata a puro nome+immagine, già presenti su campaign_tokens (name/avatar_url
-- denormalizzati). Il collegamento al catalogo bestiario non serve più a nulla — colonna
-- rimossa invece di lasciarla come dead weight mai letto da nessun client.
alter table campaign_tokens drop column if exists monster_id;
