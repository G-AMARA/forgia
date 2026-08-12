-- Espande l'oro a tutte le monete di D&D 5e: rame, argento, elettro, oro (già presente), platino.
alter table characters add column if not exists copper numeric not null default 0;
alter table characters add column if not exists silver numeric not null default 0;
alter table characters add column if not exists electrum numeric not null default 0;
alter table characters add column if not exists platinum numeric not null default 0;
