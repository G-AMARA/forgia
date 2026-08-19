-- Movimento Senza Armatura (Monaco): bonus di velocità per livello (vedi
-- core/unarmored-movement.ts), attivo solo senza armatura e senza scudo. Booleano per
-- classe invece che dedotto dal nome, stesso motivo di unarmored_defense_ability
-- (sql/2026-08-18_class_unarmored_defense.sql): il nome della classe è testo libero
-- modificabile in Gestione, non un identificatore stabile.
alter table classes add column if not exists unarmored_movement boolean not null default false;
