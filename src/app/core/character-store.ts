import { Injectable, inject, signal, effect } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';
import { ActiveCampaign } from './active-campaign';
import { LocaleService } from './locale';

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  owner_id: string;
  owner_nickname: string | null;
  alignment: string | null;
  experience_points: number;
  race_name: string | null;
  class_name: string | null;
  background_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class CharacterStore {
  private supabase = inject(Supabase);
  private auth = inject(Auth);
  private activeCampaign = inject(ActiveCampaign);
  private localeService = inject(LocaleService);

  readonly characters = signal<CharacterSummary[]>([]);
  readonly loading = signal(false);
  readonly myCharacter = signal<CharacterFull | null>(null);
  readonly selectedCharacter = signal<CharacterFull | null>(null);

  constructor() {
    // Si ricarica da solo ogni volta che cambia la campagna attiva,
    // indipendentemente da quale componente sia montato in quel momento.
    effect(() => {
      const campaign = this.activeCampaign.current();
      if (campaign) {
        this.loadForActiveCampaign();
        this.loadMyCharacter();
      } else {
        this.characters.set([]);
        this.myCharacter.set(null);
      }
    });
  }

  async loadForActiveCampaign() {
    const campaign = this.activeCampaign.current();
    if (!campaign) {
      this.characters.set([]);
      return;
    }

    this.loading.set(true);

    const { data, error } = await this.supabase.client
      .from('characters')
      .select(
        `
        id,
        name,
        level,
        owner_id,
        alignment,
        experience_points,
        race_id,
        background_id,
        races ( name ),
        backgrounds ( name ),
        character_classes ( level, class_id, classes ( name ) )
      `
      )
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento personaggi', error.message);
      this.characters.set([]);
      this.loading.set(false);
      return;
    }

    const locale = this.localeService.locale();
    let raceTranslations: Record<string, string> = {};
    let classTranslations: Record<string, string> = {};
    let backgroundTranslations: Record<string, string> = {};

    if (locale !== 'en' && data && data.length > 0) {
      const raceIds = [...new Set(data.map((r: any) => r.race_id).filter(Boolean))];
      const classIds = [
        ...new Set(data.flatMap((r: any) => r.character_classes?.map((cc: any) => cc.class_id) ?? [])),
      ];
      const backgroundIds = [...new Set(data.map((r: any) => r.background_id).filter(Boolean))];

      const { data: translationRows } = await this.supabase.client
        .from('content_translations')
        .select('content_table, content_id, name')
        .eq('locale', locale)
        .in('content_table', ['races', 'classes', 'backgrounds'])
        .in('content_id', [...raceIds, ...classIds, ...backgroundIds]);

      for (const t of translationRows ?? []) {
        if (t.content_table === 'races') raceTranslations[t.content_id] = t.name;
        if (t.content_table === 'classes') classTranslations[t.content_id] = t.name;
        if (t.content_table === 'backgrounds') backgroundTranslations[t.content_id] = t.name;
      }
    }

    // Nickname dei proprietari (per il roster nel quadro campagna)
    const ownerIds = [...new Set((data ?? []).map((r: any) => r.owner_id))];
    let nicknameMap: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await this.supabase.client
        .from('profiles')
        .select('id, nickname')
        .in('id', ownerIds);
      nicknameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.nickname]));
    }

    const mapped: CharacterSummary[] = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      level: row.level,
      owner_id: row.owner_id,
      owner_nickname: nicknameMap[row.owner_id] ?? null,
      alignment: row.alignment,
      experience_points: row.experience_points,
      race_name: raceTranslations[row.race_id] ?? row.races?.name ?? null,
      background_name: backgroundTranslations[row.background_id] ?? row.backgrounds?.name ?? null,
      class_name:
        classTranslations[row.character_classes?.[0]?.class_id] ??
        row.character_classes?.[0]?.classes?.name ??
        null,
    }));

    this.characters.set(mapped);
    this.loading.set(false);
  }

  async createCharacter(params: {
    name: string;
    raceId: string;
    classId: string;
    subclassId: string | null;
    backgroundId: string;
    level: number;
    alignment: string;
    experiencePoints: number;
    abilityScores: Record<string, number>;
    backstory: string;
    spellIds: string[];
  }): Promise<{ error: { message: string } | null; characterId?: string }> {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;

    if (!campaign) return { error: { message: 'Nessuna campagna attiva' } };
    if (!userId) return { error: { message: 'Utente non autenticato' } };

    const { data: character, error: charError } = await this.supabase.client
      .from('characters')
      .insert({
        campaign_id: campaign.id,
        owner_id: userId,
        name: params.name,
        race_id: params.raceId,
        background_id: params.backgroundId,
        level: params.level,
        alignment: params.alignment,
        experience_points: params.experiencePoints,
        ability_scores: params.abilityScores,
        notes: params.backstory,
      })
      .select('id')
      .single();

    if (charError || !character) {
      return { error: charError ?? { message: 'Errore sconosciuto' } };
    }

    const { error: classError } = await this.supabase.client.from('character_classes').insert({
      character_id: character.id,
      class_id: params.classId,
      subclass_id: params.subclassId,
      level: params.level,
    });

    if (classError) {
      return { error: classError };
    }

    if (params.spellIds.length > 0) {
      const spellRows = params.spellIds.map((spellId) => ({
        character_id: character.id,
        spell_id: spellId,
        prepared: true,
      }));

      const { error: spellError } = await this.supabase.client
        .from('character_spells')
        .insert(spellRows);

      if (spellError) {
        return { error: spellError };
      }
    }

    await this.loadForActiveCampaign();

    return { error: null, characterId: character.id };
  }

  async deleteCharacter(characterId: string) {
    const { error } = await this.supabase.client.from('characters').delete().eq('id', characterId);

    if (!error) {
      await this.loadForActiveCampaign();
    }

    return { error };
  }

  private static readonly FULL_CHARACTER_SELECT = `
    id, name, level, alignment, experience_points, avatar_url, notes, owner_id,
    current_hp, max_hp, armor_class, ability_scores, race_id, background_id,
    skill_proficiencies, damage_resistances, damage_immunities, condition_immunities,
    races ( name ),
    backgrounds ( name ),
    character_classes ( class_id, subclass_id, classes ( name, hit_die, saving_throw_proficiencies ), subclasses ( name ) ),
    character_spells ( spell_id, prepared, spells ( name, level, school ) ),
    character_inventory ( id, equipment_id, quantity, equipped, equipment ( name ) ),
    character_weapons ( id, weapon_id, quantity, weapons ( name, damage_dice, damage_type, versatile_damage, range_category, normal_range, long_range, weight, suggested_attack_ability ) )
  `;

  private mapRowToCharacterFull(row: any): CharacterFull {
    const cls = row.character_classes?.[0];

    return {
      id: row.id,
      name: row.name,
      level: row.level,
      owner_id: row.owner_id,
      alignment: row.alignment,
      experience_points: row.experience_points,
      avatar_url: row.avatar_url,
      notes: row.notes,
      current_hp: row.current_hp,
      max_hp: row.max_hp,
      armor_class: row.armor_class,
      ability_scores: row.ability_scores ?? {},
      skill_proficiencies: row.skill_proficiencies ?? [],
      damage_resistances: row.damage_resistances ?? [],
      damage_immunities: row.damage_immunities ?? [],
      condition_immunities: row.condition_immunities ?? [],
      race_id: row.race_id ?? null,
      race_name: row.races?.name ?? null,
      background_id: row.background_id ?? null,
      background_name: row.backgrounds?.name ?? null,
      class_id: cls?.class_id ?? null,
      class_name: cls?.classes?.name ?? null,
      subclass_id: cls?.subclass_id ?? null,
      subclass_name: cls?.subclasses?.name ?? null,
      hit_die: cls?.classes?.hit_die ?? null,
      saving_throw_proficiencies: (cls?.classes?.saving_throw_proficiencies ?? []).map(
        (s: any) => s.name ?? s
      ),
      spells: (row.character_spells ?? []).map((s: any) => ({
        rowId: s.spell_id,
        spellId: s.spell_id,
        name: s.spells?.name ?? '?',
        level: s.spells?.level ?? 0,
        school: s.spells?.school ?? '',
        prepared: s.prepared,
      })),
      inventory: (row.character_inventory ?? []).map((i: any) => ({
        rowId: i.id,
        equipmentId: i.equipment_id,
        name: i.equipment?.name ?? '?',
        quantity: i.quantity,
        equipped: i.equipped,
      })),
      weapons: (row.character_weapons ?? []).map((w: any) => ({
        rowId: w.id,
        weaponId: w.weapon_id,
        name: w.weapons?.name ?? '?',
        quantity: w.quantity,
        attackAbilities: w.weapons?.suggested_attack_ability ?? [],
        damageDice: w.weapons?.damage_dice ?? '',
        damageType: w.weapons?.damage_type ?? '',
        versatileDamage: w.weapons?.versatile_damage ?? null,
        rangeCategory: w.weapons?.range_category ?? 'melee',
        normalRange: w.weapons?.normal_range ?? null,
        longRange: w.weapons?.long_range ?? null,
        weight: w.weapons?.weight ?? null,
      })),
    };
  }

  async loadMyCharacter() {
    const campaign = this.activeCampaign.current();
    const userId = this.auth.user()?.id;
    if (!campaign || !userId) {
      this.myCharacter.set(null);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('characters')
      .select(CharacterStore.FULL_CHARACTER_SELECT)
      .eq('campaign_id', campaign.id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !data) {
      this.myCharacter.set(null);
      return;
    }

    this.myCharacter.set(this.mapRowToCharacterFull(data));
  }

  // Carica una scheda personaggio specifica dato il suo ID, indipendentemente
  // dalla campagna attualmente attiva: usato dalla rotta /scheda-personaggio/:id.
  async loadCharacterById(characterId: string) {
    const { data, error } = await this.supabase.client
      .from('characters')
      .select(CharacterStore.FULL_CHARACTER_SELECT)
      .eq('id', characterId)
      .maybeSingle();

    if (error || !data) {
      this.selectedCharacter.set(null);
      return;
    }

    this.selectedCharacter.set(this.mapRowToCharacterFull(data));
  }

  // Ricarica il/i signal che stanno effettivamente mostrando questo personaggio
  // (può essere "il mio personaggio nella campagna attiva" e/o il personaggio
  // aperto tramite la rotta /scheda-personaggio/:id: possono coincidere).
  private async refreshCharacter(characterId: string) {
    const tasks: Promise<void>[] = [];
    if (this.myCharacter()?.id === characterId) tasks.push(this.loadMyCharacter());
    if (this.selectedCharacter()?.id === characterId) tasks.push(this.loadCharacterById(characterId));
    await Promise.all(tasks);
  }

  async updateCombatStats(
    characterId: string,
    updates: {
      currentHp: number | null;
      maxHp: number | null;
      armorClass: number | null;
      abilityScores: Record<string, number>;
      skillProficiencies: string[];
      damageResistances: string[];
      damageImmunities: string[];
      conditionImmunities: string[];
    }
  ) {
    const { error } = await this.supabase.client
      .from('characters')
      .update({
        current_hp: updates.currentHp,
        max_hp: updates.maxHp,
        armor_class: updates.armorClass,
        ability_scores: updates.abilityScores,
        skill_proficiencies: updates.skillProficiencies,
        damage_resistances: updates.damageResistances,
        damage_immunities: updates.damageImmunities,
        condition_immunities: updates.conditionImmunities,
      })
      .eq('id', characterId);

    if (!error) {
      await this.refreshCharacter(characterId);
    }

    return { error };
  }

  async updateIdentity(
    characterId: string,
    updates: {
      name: string;
      level: number;
      raceId: string;
      classId: string;
      subclassId: string | null;
      backgroundId: string;
      alignment: string;
      experiencePoints: number;
    }
  ) {
    const { error: charError } = await this.supabase.client
      .from('characters')
      .update({
        name: updates.name,
        level: updates.level,
        race_id: updates.raceId,
        background_id: updates.backgroundId,
        alignment: updates.alignment,
        experience_points: updates.experiencePoints,
      })
      .eq('id', characterId);

    if (charError) {
      return { error: charError };
    }

    const { error: classError } = await this.supabase.client
      .from('character_classes')
      .update({ class_id: updates.classId, subclass_id: updates.subclassId, level: updates.level })
      .eq('character_id', characterId);

    if (!classError) {
      await this.refreshCharacter(characterId);
    }

    return { error: classError };
  }

  async updateNotes(characterId: string, notes: string) {
    const { error } = await this.supabase.client
      .from('characters')
      .update({ notes })
      .eq('id', characterId);

    if (!error) {
      await this.refreshCharacter(characterId);
    }

    return { error };
  }

  async uploadAvatar(characterId: string, userId: string, file: File) {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${characterId}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError };
    }

    const { data: urlData } = this.supabase.client.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await this.supabase.client
      .from('characters')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', characterId);

    if (!updateError) {
      await this.refreshCharacter(characterId);
    }

    return { error: updateError };
  }

  async addInventoryItem(characterId: string, equipmentId: string, quantity: number) {
    const { error } = await this.supabase.client
      .from('character_inventory')
      .insert({ character_id: characterId, equipment_id: equipmentId, quantity, equipped: false });

    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async removeInventoryItem(characterId: string, rowId: string) {
    const { error } = await this.supabase.client.from('character_inventory').delete().eq('id', rowId);
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async toggleEquipped(characterId: string, rowId: string, equipped: boolean) {
    const { error } = await this.supabase.client
      .from('character_inventory')
      .update({ equipped })
      .eq('id', rowId);
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async addWeapon(characterId: string, weapon: { weaponId: string; quantity: number }) {
    const { error } = await this.supabase.client.from('character_weapons').insert({
      character_id: characterId,
      weapon_id: weapon.weaponId,
      quantity: weapon.quantity,
    });
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async removeWeapon(characterId: string, rowId: string) {
    const { error } = await this.supabase.client.from('character_weapons').delete().eq('id', rowId);
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async addSpellToCharacter(characterId: string, spellId: string) {
    const { error } = await this.supabase.client
      .from('character_spells')
      .insert({ character_id: characterId, spell_id: spellId, prepared: true });
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  // character_spells ha chiave primaria composita (character_id, spell_id):
  // non esiste una colonna id, quindi la riga si identifica con entrambi i valori.
  async removeSpellFromCharacter(characterId: string, spellId: string) {
    const { error } = await this.supabase.client
      .from('character_spells')
      .delete()
      .eq('character_id', characterId)
      .eq('spell_id', spellId);
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  async togglePrepared(characterId: string, spellId: string, prepared: boolean) {
    const { error } = await this.supabase.client
      .from('character_spells')
      .update({ prepared })
      .eq('character_id', characterId)
      .eq('spell_id', spellId);
    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }
}

export interface CharacterFull {
  id: string;
  name: string;
  level: number;
  owner_id: string;
  alignment: string | null;
  experience_points: number;
  avatar_url: string | null;
  notes: string | null;
  current_hp: number | null;
  max_hp: number | null;
  armor_class: number | null;
  ability_scores: Record<string, number>;
  skill_proficiencies: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  race_id: string | null;
  race_name: string | null;
  background_id: string | null;
  background_name: string | null;
  class_id: string | null;
  class_name: string | null;
  subclass_id: string | null;
  subclass_name: string | null;
  hit_die: number | null;
  saving_throw_proficiencies: string[];
  spells: { rowId: string; spellId: string; name: string; level: number; school: string; prepared: boolean }[];
  inventory: { rowId: string; equipmentId: string; name: string; quantity: number; equipped: boolean }[];
  weapons: {
    rowId: string;
    weaponId: string;
    name: string;
    quantity: number;
    attackAbilities: string[];
    damageDice: string;
    damageType: string;
    versatileDamage: string | null;
    rangeCategory: string;
    normalRange: number | null;
    longRange: number | null;
    weight: number | null;
  }[];
}
