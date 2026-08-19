-- Titolo opzionale per ogni pagina del taccuino (character_diary_entries), accanto alla
-- data già editabile: es. "Il patto infranto" invece della sola data come intestazione.
alter table character_diary_entries add column if not exists title text;
