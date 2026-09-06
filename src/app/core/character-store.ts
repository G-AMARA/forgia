import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Supabase } from './supabase';
import { Auth } from './auth';
import { ActiveCampaign } from './active-campaign';
import { LocaleService } from './locale';
import { getCharacterLimitForSeconds } from './ranks';

export interface DiaryEntry {
  id: string;
  content: string;
  title: string | null;
  entry_date: string;
  created_at: string;
}

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
  campaign_id?: string | null;
  campaign_name?: string | null;
  // PG base della Fucina da cui questo personaggio è stato clonato (vedi
  // CharacterStore.cloneCharacterToCampaign): null per i PG base stessi.
  template_id?: string | null;
  // Card di sfondo scelta al momento dell'aggiunta a una campagna (vedi
  // core/character-cards.ts), mostrata nel roster di campaign-hub. 'basic' di default.
  card_key: string;
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

  // Parco personaggi dell'utente corrente (CharacterCreate "fabbrica" + picker
  // "Aggiungi il tuo Eroe" in campaign-hub): tutti i PG posseduti, a prescindere dalla
  // campagna (campaign_id anche null per quelli non ancora assegnati). Separato da
  // `characters`, che resta invece lo scoping per campagna attiva.
  readonly roster = signal<CharacterSummary[]>([]);
  readonly rosterLoading = signal(false);

  // Quota di PG creabili in base al rango araldico dell'utente corrente (vedi
  // core/ranks.ts): rispecchia il limite lato RLS (get_character_creation_limit), qui
  // solo per la UI (bloccare il submit in anticipo con un messaggio chiaro).
  readonly myCharacterLimit = computed(() =>
    getCharacterLimitForSeconds(this.auth.navigationSeconds(), this.auth.isAdmin())
  );

  // PG "base" della Fucina: quelli senza campaign_id, l'unico tipo che consuma la quota, che
  // compare come sorgente selezionabile nel picker "Aggiungi il tuo Eroe" e come elenco della
  // colonna sinistra della Fucina. I cloni in campagna (campaign_id valorizzato, vedi
  // cloneCharacterToCampaign) non contano e non compaiono qui: sono copie derivate, nested
  // sotto il loro base (vedi clonesOfTemplate/forge-clones-panel). I personaggi creati prima
  // della Fucina (campaign_id valorizzato fin dalla nascita) vanno prima "scissi" in base+clone
  // con la migrazione sql/2026-09-06_character_legacy_split.sql, altrimenti restano visibili
  // solo nel roster della loro campagna, non qui.
  readonly forgeBases = computed(() => this.roster().filter((c) => !c.campaign_id));
  readonly myCharacterCount = computed(() => this.forgeBases().length);
  readonly canCreateCharacter = computed(() => this.myCharacterCount() < this.myCharacterLimit());

  // Cloni in campagna generati da un dato PG base (vedi cloneCharacterToCampaign), per il
  // pannello "Aggiorna dalla campagna X" nella Fucina.
  clonesOfTemplate(templateId: string): CharacterSummary[] {
    return this.roster().filter((c) => c.template_id === templateId);
  }

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
        card_key,
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

    const { raceTranslations, classTranslations, backgroundTranslations } =
      await this.resolveSummaryTranslations(data);

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
      card_key: row.card_key ?? 'basic',
    }));

    this.characters.set(mapped);
    this.loading.set(false);
  }

  // Traduzioni di razza/classe/background per una lista di righe `characters`, condivisa
  // tra loadForActiveCampaign (scoping per campagna) e loadMyRoster (scoping per
  // proprietario): stessa logica, evita di duplicarla due volte.
  private async resolveSummaryTranslations(
    data: any[] | null
  ): Promise<{
    raceTranslations: Record<string, string>;
    classTranslations: Record<string, string>;
    backgroundTranslations: Record<string, string>;
  }> {
    const raceTranslations: Record<string, string> = {};
    const classTranslations: Record<string, string> = {};
    const backgroundTranslations: Record<string, string> = {};

    const locale = this.localeService.locale();
    if (locale === 'en' || !data || data.length === 0) {
      return { raceTranslations, classTranslations, backgroundTranslations };
    }

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

    return { raceTranslations, classTranslations, backgroundTranslations };
  }

  // Carica il parco personaggi dell'utente corrente (CharacterCreate "fabbrica" +
  // picker "Aggiungi il tuo Eroe"): tutti i PG posseduti, assegnati o no a una campagna.
  async loadMyRoster() {
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.roster.set([]);
      return;
    }

    this.rosterLoading.set(true);

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
        campaign_id,
        template_id,
        card_key,
        races ( name ),
        backgrounds ( name ),
        campaigns ( name ),
        character_classes ( level, class_id, classes ( name ) )
      `
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento parco personaggi', error.message);
      this.roster.set([]);
      this.rosterLoading.set(false);
      return;
    }

    const { raceTranslations, classTranslations, backgroundTranslations } =
      await this.resolveSummaryTranslations(data);

    const mapped: CharacterSummary[] = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      level: row.level,
      owner_id: row.owner_id,
      owner_nickname: null,
      alignment: row.alignment,
      experience_points: row.experience_points,
      race_name: raceTranslations[row.race_id] ?? row.races?.name ?? null,
      background_name: backgroundTranslations[row.background_id] ?? row.backgrounds?.name ?? null,
      class_name:
        classTranslations[row.character_classes?.[0]?.class_id] ??
        row.character_classes?.[0]?.classes?.name ??
        null,
      campaign_id: row.campaign_id,
      campaign_name: row.campaigns?.name ?? null,
      template_id: row.template_id,
      card_key: row.card_key ?? 'basic',
    }));

    this.roster.set(mapped);
    this.rosterLoading.set(false);
  }

  async createCharacter(params: {
    name: string;
    raceId: string;
    subraceId: string | null;
    classId: string;
    subclassId: string | null;
    backgroundId: string | null;
    level: number;
    alignment: string;
    experiencePoints: number;
    abilityScores: Record<string, number>;
    appliedBonus: Record<string, number>;
    backstory: string;
    sex: 'M' | 'F';
    spellIds: string[];
    startingItems: { table: 'weapons' | 'equipment'; id: string; quantity: number }[];
    equippedArmorId: string | null;
    shieldEquipped: boolean;
    startingGold: number;
  }): Promise<{ error: { message: string } | null; characterId?: string }> {
    const userId = this.auth.user()?.id;

    if (!userId) return { error: { message: 'Utente non autenticato' } };

    // Il PG nasce nel parco personale, senza campagna: viene clonato in una campagna in un
    // secondo momento con cloneCharacterToCampaign (picker "Aggiungi il tuo Eroe").
    const { data: character, error: charError } = await this.supabase.client
      .from('characters')
      .insert({
        campaign_id: null,
        owner_id: userId,
        name: params.name,
        race_id: params.raceId,
        subrace_id: params.subraceId,
        background_id: params.backgroundId,
        level: params.level,
        alignment: params.alignment,
        experience_points: params.experiencePoints,
        ability_scores: params.abilityScores,
        applied_bonus: params.appliedBonus,
        notes: params.backstory,
        sex: params.sex,
        equipped_armor_id: params.equippedArmorId,
        shield_equipped: params.shieldEquipped,
        gold: params.startingGold,
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

    const startingWeapons = params.startingItems.filter((i) => i.table === 'weapons');
    if (startingWeapons.length > 0) {
      const { error: weaponError } = await this.supabase.client.from('character_weapons').insert(
        startingWeapons.map((i) => ({ character_id: character.id, weapon_id: i.id, quantity: i.quantity }))
      );
      if (weaponError) {
        return { error: weaponError };
      }
    }

    const startingEquipment = params.startingItems.filter((i) => i.table === 'equipment');
    if (startingEquipment.length > 0) {
      const { error: inventoryError } = await this.supabase.client.from('character_inventory').insert(
        startingEquipment.map((i) => ({
          character_id: character.id,
          equipment_id: i.id,
          quantity: i.quantity,
          equipped: false,
        }))
      );
      if (inventoryError) {
        return { error: inventoryError };
      }
    }

    await this.loadMyRoster();

    return { error: null, characterId: character.id };
  }

  // Cambia solo la card di sfondo di un clone già in campagna (menu "Modifica" in
  // campaign-hub), tra quelle sbloccate per il rango di chi la sceglie.
  async updateCardKey(characterId: string, cardKey: string) {
    const { error } = await this.supabase.client
      .from('characters')
      .update({ card_key: cardKey })
      .eq('id', characterId);

    if (!error) {
      await this.loadForActiveCampaign();
    }

    return { error };
  }

  async deleteCharacter(characterId: string) {
    const { error } = await this.supabase.client.from('characters').delete().eq('id', characterId);

    if (!error) {
      await this.loadForActiveCampaign();
    }

    return { error };
  }

  // Colonne "portatili" di un personaggio, usate sia per clonare un PG base in una nuova
  // campagna sia per sovrascrivere il base con lo stato di un suo clone (pullFromCampaignClone):
  // tutto tranne le chiavi identificative (id, owner_id, campaign_id, template_id).
  private static readonly CLONE_SOURCE_SELECT = `
    id, name, level, alignment, experience_points, avatar_url, notes,
    current_hp, max_hp, armor_class, equipped_armor_id, shield_equipped, mount_equipment_id,
    copper, silver, electrum, gold, platinum, ability_scores, applied_bonus,
    race_id, subrace_id, background_id, sex,
    skill_proficiencies, skill_mastery, damage_resistances, damage_immunities, condition_immunities,
    character_classes ( class_id, subclass_id, level ),
    character_spells ( spell_id, prepared ),
    character_inventory ( equipment_id, quantity, equipped ),
    character_weapons ( weapon_id, quantity )
  `;

  private async fetchCloneSource(characterId: string) {
    return this.supabase.client
      .from('characters')
      .select(CharacterStore.CLONE_SOURCE_SELECT)
      .eq('id', characterId)
      .maybeSingle();
  }

  private cloneScalarFields(source: any) {
    return {
      name: source.name,
      level: source.level,
      alignment: source.alignment,
      experience_points: source.experience_points,
      avatar_url: source.avatar_url,
      notes: source.notes,
      current_hp: source.current_hp,
      max_hp: source.max_hp,
      armor_class: source.armor_class,
      equipped_armor_id: source.equipped_armor_id,
      shield_equipped: source.shield_equipped,
      mount_equipment_id: source.mount_equipment_id,
      copper: source.copper,
      silver: source.silver,
      electrum: source.electrum,
      gold: source.gold,
      platinum: source.platinum,
      ability_scores: source.ability_scores,
      applied_bonus: source.applied_bonus,
      race_id: source.race_id,
      subrace_id: source.subrace_id,
      background_id: source.background_id,
      sex: source.sex,
      skill_proficiencies: source.skill_proficiencies,
      skill_mastery: source.skill_mastery,
      damage_resistances: source.damage_resistances,
      damage_immunities: source.damage_immunities,
      condition_immunities: source.condition_immunities,
    };
  }

  // Copia classe/incantesimi/inventario/armi di `source` (letto con CLONE_SOURCE_SELECT) sul
  // personaggio `targetId`. Presuppone che targetId non abbia già righe figlie: per il pull
  // (sovrascrittura del base) il chiamante le cancella prima di richiamare questo metodo.
  private async insertClonedChildren(source: any, targetId: string) {
    const cls = source.character_classes?.[0];
    if (cls) {
      await this.supabase.client.from('character_classes').insert({
        character_id: targetId,
        class_id: cls.class_id,
        subclass_id: cls.subclass_id,
        level: cls.level,
      });
    }

    const spells = source.character_spells ?? [];
    if (spells.length > 0) {
      await this.supabase.client.from('character_spells').insert(
        spells.map((s: any) => ({ character_id: targetId, spell_id: s.spell_id, prepared: s.prepared }))
      );
    }

    const inventory = source.character_inventory ?? [];
    if (inventory.length > 0) {
      await this.supabase.client.from('character_inventory').insert(
        inventory.map((i: any) => ({
          character_id: targetId,
          equipment_id: i.equipment_id,
          quantity: i.quantity,
          equipped: i.equipped,
        }))
      );
    }

    const weapons = source.character_weapons ?? [];
    if (weapons.length > 0) {
      await this.supabase.client.from('character_weapons').insert(
        weapons.map((w: any) => ({ character_id: targetId, weapon_id: w.weapon_id, quantity: w.quantity }))
      );
    }
  }

  // Aggiunge un PG base della Fucina a una campagna: non sposta più la riga (a differenza del
  // vecchio comportamento), la clona in una nuova riga dedicata a quella campagna. Il base
  // resta invariato e riusabile per altre campagne (solo i base, campaign_id nullo, contano
  // per la quota, vedi myCharacterCount/forgeBases e get_character_creation_limit lato RLS).
  async cloneCharacterToCampaign(campaignId: string, templateCharacterId: string, cardKey: string) {
    const userId = this.auth.user()?.id;
    if (!userId) return { error: { message: 'Utente non autenticato' } };

    const { data: source, error: fetchError } = await this.fetchCloneSource(templateCharacterId);
    if (fetchError || !source) {
      return { error: fetchError ?? { message: 'Personaggio base non trovato' } };
    }

    const { data: clone, error: insertError } = await this.supabase.client
      .from('characters')
      .insert({
        campaign_id: campaignId,
        owner_id: userId,
        template_id: templateCharacterId,
        card_key: cardKey,
        ...this.cloneScalarFields(source),
      })
      .select('id')
      .single();

    if (insertError || !clone) {
      return { error: insertError ?? { message: 'Errore sconosciuto' } };
    }

    await this.insertClonedChildren(source, clone.id);
    await Promise.all([this.loadMyRoster(), this.loadForActiveCampaign()]);

    return { error: null };
  }

  // "Aggiorna dalla campagna X" nella Fucina: copia manuale una tantum, non un collegamento
  // continuo (per riaggiornare va ripremuto). Sovrascrive il base con lo stato attuale di uno
  // dei suoi cloni; le righe figlie del base vengono sostituite, non unite a quelle esistenti.
  async pullFromCampaignClone(baseCharacterId: string, cloneCharacterId: string) {
    const { data: source, error: fetchError } = await this.fetchCloneSource(cloneCharacterId);
    if (fetchError || !source) {
      return { error: fetchError ?? { message: 'Copia in campagna non trovata' } };
    }

    const { error: updateError } = await this.supabase.client
      .from('characters')
      .update(this.cloneScalarFields(source))
      .eq('id', baseCharacterId);

    if (updateError) return { error: updateError };

    await Promise.all([
      this.supabase.client.from('character_classes').delete().eq('character_id', baseCharacterId),
      this.supabase.client.from('character_spells').delete().eq('character_id', baseCharacterId),
      this.supabase.client.from('character_inventory').delete().eq('character_id', baseCharacterId),
      this.supabase.client.from('character_weapons').delete().eq('character_id', baseCharacterId),
    ]);

    await this.insertClonedChildren(source, baseCharacterId);
    await Promise.all([this.loadMyRoster(), this.refreshCharacter(baseCharacterId)]);

    return { error: null };
  }

  private static readonly FULL_CHARACTER_SELECT = `
    id, name, level, alignment, experience_points, avatar_url, notes, owner_id,
    current_hp, max_hp, armor_class, equipped_armor_id, shield_equipped, mount_equipment_id, copper, silver, electrum, gold, platinum, ability_scores, applied_bonus, race_id, subrace_id, background_id,
    skill_proficiencies, skill_mastery, damage_resistances, damage_immunities, condition_immunities,
    sex,
    races ( name ),
    subraces ( name ),
    backgrounds ( name ),
    character_classes ( class_id, subclass_id, classes ( name, hit_die, saving_throw_proficiencies ), subclasses ( name ) ),
    character_spells ( spell_id, prepared, spells ( name, level, school ) ),
    character_inventory ( id, equipment_id, quantity, equipped, equipment ( name, image_url, weight, cost_value, cost_unit ) ),
    character_weapons ( id, weapon_id, quantity, weapons ( name, image_url, damage_dice, damage_type, versatile_damage, range_category, normal_range, long_range, weight, suggested_attack_ability, properties, cost_value, cost_unit ) )
  `;

  // Recupera le traduzioni di tutti i contenuti referenziati da questa riga personaggio
  // (razza, background, classe, sottoclasse, incantesimi, oggetti, armi) in un'unica query,
  // con lo stesso meccanismo di ContentStore/content_translations. Senza questo, mapRowToCharacterFull
  // mostrerebbe sempre il nome inglese canonico perché i join Supabase leggono le tabelle base.
  private async loadTranslationsForRow(row: any): Promise<Record<string, Record<string, string>>> {
    const locale = this.localeService.locale();
    if (locale === 'en') return {};

    const cls = row.character_classes?.[0];
    const idsByTable: Record<string, string[]> = {
      races: [row.race_id].filter(Boolean),
      backgrounds: [row.background_id].filter(Boolean),
      classes: [cls?.class_id].filter(Boolean),
      subclasses: [cls?.subclass_id].filter(Boolean),
      spells: (row.character_spells ?? []).map((s: any) => s.spell_id).filter(Boolean),
      equipment: (row.character_inventory ?? []).map((i: any) => i.equipment_id).filter(Boolean),
      weapons: (row.character_weapons ?? []).map((w: any) => w.weapon_id).filter(Boolean),
    };

    const allIds = Object.values(idsByTable).flat();
    if (allIds.length === 0) return {};

    const { data: translationRows } = await this.supabase.client
      .from('content_translations')
      .select('content_table, content_id, name')
      .eq('locale', locale)
      .in('content_table', Object.keys(idsByTable))
      .in('content_id', allIds);

    const translations: Record<string, Record<string, string>> = {};
    for (const t of translationRows ?? []) {
      (translations[t.content_table] ??= {})[t.content_id] = t.name;
    }
    return translations;
  }

  private mapRowToCharacterFull(
    row: any,
    translations: Record<string, Record<string, string>>
  ): CharacterFull {
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
      equipped_armor_id: row.equipped_armor_id ?? null,
      shield_equipped: row.shield_equipped ?? false,
      mount_equipment_id: row.mount_equipment_id ?? null,
      copper: row.copper ?? 0,
      silver: row.silver ?? 0,
      electrum: row.electrum ?? 0,
      gold: row.gold ?? 0,
      platinum: row.platinum ?? 0,
      ability_scores: row.ability_scores ?? {},
      applied_bonus: row.applied_bonus ?? {},
      skill_proficiencies: row.skill_proficiencies ?? [],
      skill_mastery: row.skill_mastery ?? [],
      damage_resistances: row.damage_resistances ?? [],
      damage_immunities: row.damage_immunities ?? [],
      condition_immunities: row.condition_immunities ?? [],
      sex: row.sex ?? null,
      race_id: row.race_id ?? null,
      race_name: translations['races']?.[row.race_id] ?? row.races?.name ?? null,
      subrace_id: row.subrace_id ?? null,
      subrace_name: row.subraces?.name ?? null,
      background_id: row.background_id ?? null,
      background_name:
        translations['backgrounds']?.[row.background_id] ?? row.backgrounds?.name ?? null,
      class_id: cls?.class_id ?? null,
      class_name: translations['classes']?.[cls?.class_id] ?? cls?.classes?.name ?? null,
      subclass_id: cls?.subclass_id ?? null,
      subclass_name:
        translations['subclasses']?.[cls?.subclass_id] ?? cls?.subclasses?.name ?? null,
      hit_die: cls?.classes?.hit_die ?? null,
      saving_throw_proficiencies: (cls?.classes?.saving_throw_proficiencies ?? []).map(
        (s: any) => s.name ?? s
      ),
      spells: (row.character_spells ?? []).map((s: any) => ({
        rowId: s.spell_id,
        spellId: s.spell_id,
        name: translations['spells']?.[s.spell_id] ?? s.spells?.name ?? '?',
        level: s.spells?.level ?? 0,
        school: s.spells?.school ?? '',
        prepared: s.prepared,
      })),
      inventory: (row.character_inventory ?? []).map((i: any) => ({
        rowId: i.id,
        equipmentId: i.equipment_id,
        name: translations['equipment']?.[i.equipment_id] ?? i.equipment?.name ?? '?',
        imageUrl: i.equipment?.image_url ?? null,
        weight: i.equipment?.weight ?? 0,
        quantity: i.quantity,
        equipped: i.equipped,
        costValue: i.equipment?.cost_value ?? null,
        costUnit: i.equipment?.cost_unit ?? null,
      })),
      weapons: (row.character_weapons ?? []).map((w: any) => ({
        rowId: w.id,
        weaponId: w.weapon_id,
        name: translations['weapons']?.[w.weapon_id] ?? w.weapons?.name ?? '?',
        imageUrl: w.weapons?.image_url ?? null,
        quantity: w.quantity,
        attackAbilities: w.weapons?.suggested_attack_ability ?? [],
        damageDice: w.weapons?.damage_dice ?? '',
        damageType: w.weapons?.damage_type ?? '',
        versatileDamage: w.weapons?.versatile_damage ?? null,
        rangeCategory: w.weapons?.range_category ?? 'melee',
        normalRange: w.weapons?.normal_range ?? null,
        longRange: w.weapons?.long_range ?? null,
        weight: w.weapons?.weight ?? null,
        properties: w.weapons?.properties ?? null,
        costValue: w.weapons?.cost_value ?? null,
        costUnit: w.weapons?.cost_unit ?? null,
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

    const translations = await this.loadTranslationsForRow(data);
    this.myCharacter.set(this.mapRowToCharacterFull(data, translations));
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

    const translations = await this.loadTranslationsForRow(data);
    this.selectedCharacter.set(this.mapRowToCharacterFull(data, translations));
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
      equippedArmorId: string | null;
      shieldEquipped: boolean;
      abilityScores: Record<string, number>;
      skillProficiencies: string[];
      skillMastery: string[];
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
        equipped_armor_id: updates.equippedArmorId,
        shield_equipped: updates.shieldEquipped,
        ability_scores: updates.abilityScores,
        skill_proficiencies: updates.skillProficiencies,
        skill_mastery: updates.skillMastery,
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
      subraceId: string | null;
      classId: string;
      subclassId: string | null;
      backgroundId: string | null;
      alignment: string;
      experiencePoints: number;
      abilityScores: Record<string, number>;
      appliedBonus: Record<string, number>;
      sex: 'M' | 'F';
    }
  ) {
    const { error: charError } = await this.supabase.client
      .from('characters')
      .update({
        name: updates.name,
        level: updates.level,
        race_id: updates.raceId,
        subrace_id: updates.subraceId,
        background_id: updates.backgroundId,
        alignment: updates.alignment,
        experience_points: updates.experiencePoints,
        ability_scores: updates.abilityScores,
        applied_bonus: updates.appliedBonus,
        sex: updates.sex,
      })
      .eq('id', characterId);

    if (charError) {
      return { error: charError };
    }

    const { data: classData, error: classError } = await this.supabase.client
      .from('character_classes')
      .update({ class_id: updates.classId, subclass_id: updates.subclassId, level: updates.level })
      .eq('character_id', characterId)
      .select();

    if (classError) {
      return { error: classError };
    }

    // Se l'RLS blocca l'update, Postgres non restituisce un errore: aggiorna zero righe
    // in silenzio. Lo intercettiamo qui, altrimenti classe/sottoclasse sembrano salvate
    // ma tornano al valore precedente al ricaricamento.
    if (!classData || classData.length === 0) {
      return {
        error: { message: 'Aggiornamento di classe/sottoclasse bloccato dai permessi (nessuna riga modificata).' },
      };
    }

    await this.refreshCharacter(characterId);
    return { error: null };
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

  async updateMount(characterId: string, mountEquipmentId: string | null) {
    const { error } = await this.supabase.client
      .from('characters')
      .update({ mount_equipment_id: mountEquipmentId })
      .eq('id', characterId);

    if (!error) {
      await this.refreshCharacter(characterId);
    }

    return { error };
  }

  async updateCurrency(
    characterId: string,
    currency: { copper: number; silver: number; electrum: number; gold: number; platinum: number }
  ) {
    const { error } = await this.supabase.client
      .from('characters')
      .update(currency)
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

  // Se il personaggio ha già questo oggetto in inventario, ne incrementa la quantità sulla riga
  // esistente invece di crearne una seconda (altrimenti "aggiungi" duplica la riga ogni volta).
  async addInventoryItem(characterId: string, equipmentId: string, quantity: number) {
    const { data: existing, error: findError } = await this.supabase.client
      .from('character_inventory')
      .select('id, quantity')
      .eq('character_id', characterId)
      .eq('equipment_id', equipmentId)
      .maybeSingle();

    if (findError) {
      return { error: findError };
    }

    const { error } = existing
      ? await this.supabase.client
          .from('character_inventory')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
      : await this.supabase.client
          .from('character_inventory')
          .insert({ character_id: characterId, equipment_id: equipmentId, quantity, equipped: false });

    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  // quantityToRemove >= currentQuantity elimina la riga; altrimenti decrementa solo
  // la quantità, così non serve più rimuovere l'intero stack per toglierne una parte.
  async removeInventoryItem(
    characterId: string,
    rowId: string,
    quantityToRemove: number,
    currentQuantity: number
  ) {
    const { error } =
      quantityToRemove >= currentQuantity
        ? await this.supabase.client.from('character_inventory').delete().eq('id', rowId)
        : await this.supabase.client
            .from('character_inventory')
            .update({ quantity: currentQuantity - quantityToRemove })
            .eq('id', rowId);

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

  // Stessa logica di addInventoryItem: incrementa la riga esistente invece di duplicarla.
  async addWeapon(characterId: string, weapon: { weaponId: string; quantity: number }) {
    const { data: existing, error: findError } = await this.supabase.client
      .from('character_weapons')
      .select('id, quantity')
      .eq('character_id', characterId)
      .eq('weapon_id', weapon.weaponId)
      .maybeSingle();

    if (findError) {
      return { error: findError };
    }

    const { error } = existing
      ? await this.supabase.client
          .from('character_weapons')
          .update({ quantity: existing.quantity + weapon.quantity })
          .eq('id', existing.id)
      : await this.supabase.client
          .from('character_weapons')
          .insert({ character_id: characterId, weapon_id: weapon.weaponId, quantity: weapon.quantity });

    if (!error) {
      await this.refreshCharacter(characterId);
    }
    return { error };
  }

  // Stessa logica di removeInventoryItem: quantityToRemove >= currentQuantity elimina
  // la riga, altrimenti decrementa solo la quantità.
  async removeWeapon(characterId: string, rowId: string, quantityToRemove: number, currentQuantity: number) {
    const { error } =
      quantityToRemove >= currentQuantity
        ? await this.supabase.client.from('character_weapons').delete().eq('id', rowId)
        : await this.supabase.client
            .from('character_weapons')
            .update({ quantity: currentQuantity - quantityToRemove })
            .eq('id', rowId);

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

  // Taccuino (tab Armeria+1 nella scheda): annotazioni libere del giocatore, non fanno
  // parte di FULL_CHARACTER_SELECT (lista potenzialmente lunga, non serve ricaricarla ad
  // ogni salvataggio di stats/inventario) — caricate a parte quando si apre il tab.
  // Ordinate per entry_date (data della pagina, modificabile dall'utente), non per
  // created_at: un giocatore può scrivere oggi una pagina datata qualche sessione fa.
  readonly diaryEntries = signal<DiaryEntry[]>([]);

  async loadDiaryEntries(characterId: string) {
    const { data, error } = await this.supabase.client
      .from('character_diary_entries')
      .select('id, content, title, entry_date, created_at')
      .eq('character_id', characterId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) {
      this.diaryEntries.set([]);
      return;
    }

    this.diaryEntries.set(data);
  }

  async addDiaryEntry(characterId: string, content: string, entryDate: string, title: string | null) {
    const { error } = await this.supabase.client
      .from('character_diary_entries')
      .insert({ character_id: characterId, content, entry_date: entryDate, title });

    if (!error) {
      await this.loadDiaryEntries(characterId);
    }
    return { error };
  }

  async updateDiaryEntry(
    characterId: string,
    entryId: string,
    content: string,
    entryDate: string,
    title: string | null
  ) {
    const { error } = await this.supabase.client
      .from('character_diary_entries')
      .update({ content, entry_date: entryDate, title })
      .eq('id', entryId);

    if (!error) {
      await this.loadDiaryEntries(characterId);
    }
    return { error };
  }

  async deleteDiaryEntry(characterId: string, entryId: string) {
    const { error } = await this.supabase.client
      .from('character_diary_entries')
      .delete()
      .eq('id', entryId);

    if (!error) {
      await this.loadDiaryEntries(characterId);
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
  equipped_armor_id: string | null;
  shield_equipped: boolean;
  mount_equipment_id: string | null;
  copper: number;
  silver: number;
  electrum: number;
  gold: number;
  platinum: number;
  ability_scores: Record<string, number>;
  applied_bonus: Record<string, number>;
  skill_proficiencies: string[];
  skill_mastery: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  sex: 'M' | 'F' | null;
  race_id: string | null;
  race_name: string | null;
  subrace_id: string | null;
  subrace_name: string | null;
  background_id: string | null;
  background_name: string | null;
  class_id: string | null;
  class_name: string | null;
  subclass_id: string | null;
  subclass_name: string | null;
  hit_die: number | null;
  saving_throw_proficiencies: string[];
  spells: { rowId: string; spellId: string; name: string; level: number; school: string; prepared: boolean }[];
  inventory: { rowId: string; equipmentId: string; name: string; imageUrl: string | null; weight: number; quantity: number; equipped: boolean; costValue: number | null; costUnit: string | null }[];
  weapons: {
    rowId: string;
    weaponId: string;
    name: string;
    imageUrl: string | null;
    quantity: number;
    attackAbilities: string[];
    damageDice: string;
    damageType: string;
    versatileDamage: string | null;
    rangeCategory: string;
    normalRange: number | null;
    longRange: number | null;
    weight: number | null;
    properties: string | null;
    costValue: number | null;
    costUnit: string | null;
  }[];
}
