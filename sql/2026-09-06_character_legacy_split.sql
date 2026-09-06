-- Retrofit dei personaggi creati prima della Fucina degli Eroi: chi ha campaign_id
-- valorizzato ma template_id nullo non è mai stato "clonato" (vedi
-- CharacterStore.cloneCharacterToCampaign), quindi in Fucina compariva come la STESSA riga
-- già in campagna invece che come un PG base indipendente — editare l'uno modificava anche
-- l'altro, e non c'era nessun clone da cui mostrare "Aggiorna dalla campagna".
--
-- Per ognuno di questi personaggi crea un nuovo PG base (stato attuale, congelato in questo
-- momento, senza campagna) e trasforma la riga originale in un clone di quel base, con lo
-- stesso identico funzionamento dei personaggi creati con il nuovo flusso. Nessuna riga
-- esistente viene toccata nel contenuto, solo template_id sulla riga originale.
--
-- Idempotente: dopo la prima esecuzione non restano più righe con campaign_id valorizzato e
-- template_id nullo, quindi rilanciarlo non fa nulla.
do $$
declare
  legacy record;
  new_base_id uuid;
begin
  for legacy in
    select * from characters where campaign_id is not null and template_id is null
  loop
    insert into characters (
      owner_id, campaign_id, template_id, name, level, alignment, experience_points,
      avatar_url, notes, current_hp, max_hp, armor_class, equipped_armor_id, shield_equipped,
      mount_equipment_id, copper, silver, electrum, gold, platinum, ability_scores, applied_bonus,
      race_id, subrace_id, background_id, sex,
      skill_proficiencies, skill_mastery, damage_resistances, damage_immunities, condition_immunities
    )
    values (
      legacy.owner_id, null, null, legacy.name, legacy.level, legacy.alignment, legacy.experience_points,
      legacy.avatar_url, legacy.notes, legacy.current_hp, legacy.max_hp, legacy.armor_class,
      legacy.equipped_armor_id, legacy.shield_equipped, legacy.mount_equipment_id,
      legacy.copper, legacy.silver, legacy.electrum, legacy.gold, legacy.platinum,
      legacy.ability_scores, legacy.applied_bonus, legacy.race_id, legacy.subrace_id,
      legacy.background_id, legacy.sex, legacy.skill_proficiencies, legacy.skill_mastery,
      legacy.damage_resistances, legacy.damage_immunities, legacy.condition_immunities
    )
    returning id into new_base_id;

    insert into character_classes (character_id, class_id, subclass_id, level)
    select new_base_id, class_id, subclass_id, level from character_classes where character_id = legacy.id;

    insert into character_spells (character_id, spell_id, prepared)
    select new_base_id, spell_id, prepared from character_spells where character_id = legacy.id;

    insert into character_inventory (character_id, equipment_id, quantity, equipped)
    select new_base_id, equipment_id, quantity, equipped from character_inventory where character_id = legacy.id;

    insert into character_weapons (character_id, weapon_id, quantity)
    select new_base_id, weapon_id, quantity from character_weapons where character_id = legacy.id;

    update characters set template_id = new_base_id where id = legacy.id;
  end loop;
end $$;
