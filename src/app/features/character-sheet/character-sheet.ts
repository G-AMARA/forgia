import { Component, inject, signal, computed, effect, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStore } from '../../core/character-store';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { SKILLS } from '../../core/skills';
import { getClassImagePath } from '../../core/class-images';
import { getAbilityImagePath } from '../../core/ability-images';
import { getSpellcastingInfo } from '../../core/spellcasting';
import { calculateArmorClass } from '../../core/armor';
import { translateSpellSchool } from '../../core/spell-schools';

type SubTab = 'general' | 'combat' | 'inventory' | 'spells' | 'weapons';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './character-sheet.html',
})
export class CharacterSheet implements OnInit {
  protected characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);

  // Se valorizzato (es. dalla rotta /scheda-personaggio/:id), la scheda mostra
  // quel personaggio specifico invece del personaggio dell'utente loggato
  // nella campagna attiva.
  @Input() characterId?: string;

  protected character = computed(() =>
    this.characterId ? this.characterStore.selectedCharacter() : this.characterStore.myCharacter()
  );

  protected classImagePath = computed(() => getClassImagePath(this.character()?.class_name));
  protected getAbilityImagePath = getAbilityImagePath;

  // Vero se l'utente loggato non è il proprietario: usato per bloccare ogni modifica
  // quando la scheda si apre dal roster della campagna (vista di un altro personaggio).
  protected readOnly = computed(() => this.character()?.owner_id !== this.auth.user()?.id);

  ngOnInit() {
    if (this.characterId) {
      this.characterStore.loadCharacterById(this.characterId);
    }
  }
  protected skills = SKILLS;
  protected abilityKeys: ('str' | 'dex' | 'cos' | 'int' | 'wis' | 'cha')[] = [
    'str', 'dex', 'cos', 'int', 'wis', 'cha',
  ];

  activeSubTab = signal<SubTab>('general');

  currentHp = 0;
  maxHp = 0;
  selectedArmorId = '';
  shieldEquipped = false;
  abilityScores: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  skillProficiencies = new Set<string>();
  damageResistancesText = '';
  damageImmunitiesText = '';
  conditionImmunitiesText = '';
  backstory = '';

  private allEquipment = this.contentStore.getContent('equipment');
  private allSpells = this.contentStore.getContent('spells');
  protected races = this.contentStore.getContent('races');
  protected classesContent = this.contentStore.getContent('classes');
  protected backgroundsContent = this.contentStore.getContent('backgrounds');
  private allSubclasses = this.contentStore.getContent('subclasses');

  protected alignments = [
    'lawful_good', 'neutral_good', 'chaotic_good',
    'lawful_neutral', 'true_neutral', 'chaotic_neutral',
    'lawful_evil', 'neutral_evil', 'chaotic_evil',
  ];

  identityName = '';
  identityLevel = 1;
  identityRaceId = '';
  identityClassId = '';
  identitySubclassId = '';
  identityBackgroundId = '';
  identityAlignment = 'true_neutral';
  identityXp = 0;

  // Bonus attualmente "cotto" dentro abilityScores (razziale o background, sono alternativi):
  // serve a calcolare la differenza esatta da applicare quando razza/background cambiano.
  appliedBonus: Record<string, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  // Allocazione del Bonus Background mostrata/modificabile nel tab Generale.
  identityBackgroundBonuses: Record<string, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  readonly backgroundBonusMax = 3;
  readonly backgroundBonusPerAbilityMax = 2;

  // Sottoclassi disponibili per la classe scelta, sbloccate al livello selezionato o prima.
  // Metodo (non computed): identityClassId/identityLevel sono campi ngModel, non
  // signal, quindi un computed() non li tracciherebbe e resterebbe bloccato al
  // primo valore calcolato invece di aggiornarsi a ogni cambio di classe/livello.
  availableSubclasses(): any[] {
    if (!this.identityClassId) return [];
    return this.allSubclasses().filter(
      (sub: any) => sub.raw.class_id === this.identityClassId && sub.raw.unlocked_at_level <= this.identityLevel
    );
  }

  selectedEquipmentId = '';
  addQuantity = 1;
  selectedSpellIdToAdd = '';
  spellSearchTerm = signal('');
  spellFilterSchool = signal('');
  spellFilterLevel = signal('');

  savedMsg = signal<string | null>(null);
  avatarError = signal<string | null>(null);
  avatarUploading = signal(false);

  constructor() {
    effect(() => {
      const c = this.character();
      if (c) {
        this.identityName = c.name;
        this.identityLevel = c.level;
        this.identityRaceId = c.race_id ?? '';
        this.identityClassId = c.class_id ?? '';
        this.identitySubclassId = c.subclass_id ?? '';
        this.identityBackgroundId = c.background_id ?? '';
        this.identityAlignment = c.alignment ?? 'true_neutral';
        this.identityXp = c.experience_points;
        this.currentHp = c.current_hp ?? 0;
        this.maxHp = c.max_hp ?? 0;
        this.selectedArmorId = c.equipped_armor_id ?? '';
        this.shieldEquipped = c.shield_equipped;
        this.abilityScores = { ...c.ability_scores };
        this.appliedBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...c.applied_bonus };
        this.identityBackgroundBonuses = c.background_id
          ? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...c.applied_bonus }
          : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
        this.skillProficiencies = new Set(c.skill_proficiencies);
        this.damageResistancesText = c.damage_resistances.join(', ');
        this.damageImmunitiesText = c.damage_immunities.join(', ');
        this.conditionImmunitiesText = c.condition_immunities.join(', ');
        this.backstory = c.notes ?? '';
      }
    });
  }

  setSubTab(tab: SubTab) {
    this.activeSubTab.set(tab);
  }

  abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  formatModifier(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  // Progressione standard D&D 5e: +2 dal livello 1 al 4, poi +1 ogni 4 livelli fino a +6 al livello 20.
  proficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
  }

  // Armature indossabili dal catalogo (esclude lo scudo, gestito a parte come bonus separato).
  availableArmors(): any[] {
    return this.allEquipment().filter(
      (e: any) => e.raw.type === 'Armor' && e.raw.armor_category !== 'shield' && e.raw.armor_class != null
    );
  }

  // CA sempre calcolata da armatura scelta (+ scudo se spuntato) e Destrezza corrente: non è più
  // un valore modificabile a mano, così resta automaticamente coerente se la Destrezza cambia.
  currentArmorClass(): number {
    const dexMod = this.abilityModifier(this.abilityScores['dex']);
    const armor = this.allEquipment().find((e: any) => e.id === this.selectedArmorId);
    let ac = armor ? calculateArmorClass(armor.raw.armor_class, armor.raw.armor_category, dexMod) : 10 + dexMod;
    if (this.shieldEquipped) ac += 2;
    return ac;
  }

  // Colore distintivo per livello incantesimo: bordo + sfumatura leggera delle card.
  private static readonly SPELL_LEVEL_COLORS: Record<number, string> = {
    0: '#8C8C8C',
    1: '#4E9F3D',
    2: '#00A8E8',
    3: '#FF6B00',
    4: '#D62828',
    5: '#8A2BE2',
    6: '#4A0E4E',
    7: '#FF007F',
    8: '#FFD700',
  };

  spellLevelColor(level: number): string {
    if (level >= 9) return '#1A1A1A';
    return CharacterSheet.SPELL_LEVEL_COLORS[level] ?? '#8C8C8C';
  }

  spellLevelOptionLabel(level: number): string {
    return level === 0
      ? this.localeService.t('cantrip_short')
      : `${this.localeService.t('level_label')} ${level}`;
  }

  // Colore del cerchietto del modificatore: verde se positivo, rosso se negativo, grigio se zero.
  modifierBadgeClass(score: number): string {
    const mod = this.abilityModifier(score);
    if (mod > 0) return 'bg-forest';
    if (mod < 0) return 'bg-red-600';
    return 'bg-slate-500';
  }

  toggleSkill(key: string) {
    const current = new Set(this.skillProficiencies);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.skillProficiencies = current;
  }

  isSkillChecked(key: string): boolean {
    return this.skillProficiencies.has(key);
  }

  // Breve descrizione della razza/classe/sottoclasse/background attualmente selezionati nel form
  // identità (tab Generale): cercate per id nei rispettivi cataloghi già caricati. Null se assente,
  // così le card in template restano nascoste finché in Gestione non viene compilato il campo.
  getRaceDescription(): string | null {
    return this.races().find((r: any) => r.id === this.identityRaceId)?.description ?? null;
  }

  getClassDescription(): string | null {
    return this.classesContent().find((c: any) => c.id === this.identityClassId)?.description ?? null;
  }

  getSubclassDescription(): string | null {
    return this.allSubclasses().find((s: any) => s.id === this.identitySubclassId)?.description ?? null;
  }

  getBackgroundDescription(): string | null {
    return this.backgroundsContent().find((b: any) => b.id === this.identityBackgroundId)?.description ?? null;
  }

  // Traduce il nome grezzo inglese della razza al nome tradotto dal catalogo.
  getTranslatedRaceName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    const race = this.races().find((r: any) => r.raw.name === rawName);
    return race?.name ?? rawName;
  }

  // Traduce il nome grezzo inglese della classe al nome tradotto dal catalogo.
  getTranslatedClassName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    const cls = this.classesContent().find((c: any) => c.raw.name === rawName);
    return cls?.name ?? rawName;
  }

  // Traduce il nome grezzo inglese della sottoclasse al nome tradotto dal catalogo.
  getTranslatedSubclassName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    const subclass = this.allSubclasses().find((s: any) => s.raw.name === rawName);
    return subclass?.name ?? rawName;
  }

  // Traduce il nome grezzo inglese del background al nome tradotto dal catalogo.
  getTranslatedBackgroundName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    const bg = this.backgroundsContent().find((b: any) => b.raw.name === rawName);
    return bg?.name ?? rawName;
  }

  // Le proficienze arrivano come abbreviazione inglese (es. "STR", "dex", a seconda
  // che la classe sia dall'SRD o homebrew): le traduce nel nome esteso in italiano.
  savingThrowNames(proficiencies: string[]): string {
    return proficiencies.map((p) => this.localeService.t('ability_' + p.toLowerCase())).join(', ');
  }

  // Bonus razziale: fisso, definito dalla razza scelta (gestito in Gestione > Razze).
  getRaceBonus(key: keyof typeof this.abilityScores): number {
    const race = this.races().find((r: any) => r.id === this.identityRaceId);
    return normalizeAbilityBonuses(race?.raw?.ability_bonuses)[key] ?? 0;
  }

  backgroundBonusTotal(): number {
    return this.abilityKeys.reduce((sum, k) => sum + this.identityBackgroundBonuses[k], 0);
  }

  backgroundBonusRemaining(): number {
    return this.backgroundBonusMax - this.backgroundBonusTotal();
  }

  setBackgroundBonus(key: keyof typeof this.abilityScores, value: number) {
    let next = Math.max(0, Math.min(this.backgroundBonusPerAbilityMax, Math.floor(value) || 0));
    const othersSum = this.abilityKeys
      .filter((k) => k !== key)
      .reduce((sum, k) => sum + this.identityBackgroundBonuses[k], 0);
    if (othersSum + next > this.backgroundBonusMax) {
      next = Math.max(0, this.backgroundBonusMax - othersSum);
    }
    this.identityBackgroundBonuses[key] = next;
  }

  // Bonus razziale e background sono alternativi, non cumulativi: quello del
  // background (se scelto) sostituisce quello automatico della razza.
  getAppliedBonus(key: keyof typeof this.abilityScores): number {
    return this.identityBackgroundId ? this.identityBackgroundBonuses[key] : this.getRaceBonus(key);
  }

  async saveIdentity() {
    const c = this.character();
    if (!c || this.readOnly()) return;

    this.actionError.set(null);

    // Rimuove dagli ability_scores il bonus applicato in precedenza e vi somma
    // quello nuovo (razziale o background, in base alla selezione corrente):
    // così le statistiche restano coerenti quando razza/background cambiano.
    const newAppliedBonus = Object.fromEntries(
      this.abilityKeys.map((key) => [key, this.getAppliedBonus(key)])
    );
    const newAbilityScores = Object.fromEntries(
      this.abilityKeys.map((key) => [
        key,
        Math.max(1, this.abilityScores[key] - (this.appliedBonus[key] ?? 0) + newAppliedBonus[key]),
      ])
    );

    const { error } = await this.characterStore.updateIdentity(c.id, {
      name: this.identityName,
      level: this.identityLevel,
      raceId: this.identityRaceId,
      classId: this.identityClassId,
      subclassId: this.identitySubclassId || null,
      backgroundId: this.identityBackgroundId || null,
      alignment: this.identityAlignment,
      experiencePoints: this.identityXp,
      abilityScores: newAbilityScores,
      appliedBonus: newAppliedBonus,
    });

    if (error) {
      this.actionError.set(error.message);
      return;
    }

    this.showSaved();
  }

  async saveCombat() {
    const c = this.character();
    if (!c || this.readOnly()) return;

    await this.characterStore.updateCombatStats(c.id, {
      currentHp: this.currentHp,
      maxHp: this.maxHp,
      armorClass: this.currentArmorClass(),
      equippedArmorId: this.selectedArmorId || null,
      shieldEquipped: this.shieldEquipped,
      abilityScores: this.abilityScores,
      skillProficiencies: Array.from(this.skillProficiencies),
      damageResistances: this.splitList(this.damageResistancesText),
      damageImmunities: this.splitList(this.damageImmunitiesText),
      conditionImmunities: this.splitList(this.conditionImmunitiesText),
    });

    this.showSaved();
  }

  async saveBackstory() {
    const c = this.character();
    if (!c || this.readOnly()) return;
    await this.characterStore.updateNotes(c.id, this.backstory);
    this.showSaved();
  }

  private splitList(text: string): string[] {
    return text.split(',').map((s) => s.trim()).filter(Boolean);
  }

  private showSaved() {
    this.savedMsg.set(this.localeService.t('saved_message'));
    setTimeout(() => this.savedMsg.set(null), 2000);
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const c = this.character();
    const userId = this.auth.user()?.id;
    if (!file || !c || !userId || this.readOnly()) return;

    this.avatarError.set(null);
    this.avatarUploading.set(true);

    const { error } = await this.characterStore.uploadAvatar(c.id, userId, file);

    if (error) {
      this.avatarError.set(error.message);
    }

    this.avatarUploading.set(false);
    input.value = '';
  }

  equipmentSearchTerm = signal('');

  availableEquipment = computed(() => {
    const term = this.equipmentSearchTerm().trim().toLowerCase();
    const equipment = this.allEquipment();
    if (!term) return equipment;
    return equipment.filter((item: any) => item.name.toLowerCase().includes(term));
  });

  actionError = signal<string | null>(null);

  async addItem() {
    const c = this.character();
    if (!c || !this.selectedEquipmentId || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.addInventoryItem(c.id, this.selectedEquipmentId, this.addQuantity);
    if (error) {
      this.actionError.set(error.message);
      return;
    }
    this.selectedEquipmentId = '';
    this.addQuantity = 1;
  }

  async removeItem(rowId: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.removeInventoryItem(c.id, rowId);
    if (error) this.actionError.set(error.message);
  }

  async toggleEquip(rowId: string, currentlyEquipped: boolean) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.toggleEquipped(c.id, rowId, !currentlyEquipped);
    if (error) this.actionError.set(error.message);
  }

  private allWeaponsCatalog = this.contentStore.getContent('weapons');
  availableWeaponsCatalog = computed(() => this.allWeaponsCatalog());

  selectedWeaponId = '';
  weaponQuantity = 1;

  async addWeapon() {
    const c = this.character();
    if (!c || !this.selectedWeaponId || this.readOnly()) return;

    this.actionError.set(null);
    const { error } = await this.characterStore.addWeapon(c.id, {
      weaponId: this.selectedWeaponId,
      quantity: this.weaponQuantity,
    });

    if (error) {
      this.actionError.set(error.message);
      return;
    }

    this.selectedWeaponId = '';
    this.weaponQuantity = 1;
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
  }

  async removeWeapon(rowId: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.removeWeapon(c.id, rowId);
    if (error) this.actionError.set(error.message);
  }

  // Nome inglese canonico della classe del personaggio, risalito dal suo id: sia
  // getSpellcastingInfo() sia spell.raw.classes ragionano sul nome base SRD in inglese,
  // mentre c.class_name può essere tradotto (vedi character-store.ts) e non va usato qui.
  private canonicalClassName = computed(() => {
    const c = this.character();
    if (!c || !c.class_id) return null;
    return this.classesContent().find((cls: any) => cls.id === c.class_id)?.raw?.name ?? null;
  });

  // Slot incantesimo e trucchetti disponibili, calcolati da classe+livello secondo
  // le tabelle standard SRD (solo per le 8 classi incantatrici canoniche: null altrimenti).
  spellcastingInfo = computed(() => {
    const c = this.character();
    if (!c) return null;
    return getSpellcastingInfo(this.canonicalClassName(), c.level, c.ability_scores);
  });

  knownCantripsCount(): number {
    return this.character()?.spells.filter((s) => s.level === 0).length ?? 0;
  }

  knownLeveledSpellsCount(): number {
    return this.character()?.spells.filter((s) => s.level > 0).length ?? 0;
  }

  // Incantesimi disponibili per la classe del personaggio, prima dei filtri di ricerca:
  // serve sia per popolare le opzioni scuola/livello sia come base per il filtro.
  private classSpells = computed(() => {
    const canonicalClassName = this.canonicalClassName();
    if (!canonicalClassName) return [];
    return this.allSpells().filter((spell: any) =>
      (spell.raw.classes ?? []).some((cn: any) => cn.name === canonicalClassName)
    );
  });

  // value = school grezzo (inglese, usato per il filtro), label = tradotto per la UI.
  availableSpellSchools = computed(() => {
    const locale = this.localeService.locale();
    const schools = [...new Set(this.classSpells().map((s: any) => s.raw.school).filter(Boolean))];
    return schools
      .map((school: string) => ({ value: school, label: translateSpellSchool(school, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  availableSpellLevels = computed(() =>
    [...new Set(this.classSpells().map((s: any) => s.raw.level ?? 0))].sort((a: number, b: number) => a - b)
  );

  availableClassSpells = computed(() => {
    const term = this.spellSearchTerm().trim().toLowerCase();
    const school = this.spellFilterSchool();
    const level = this.spellFilterLevel();

    return this.classSpells().filter((spell: any) => {
      if (
        term &&
        !spell.name.toLowerCase().includes(term) &&
        !(spell.description ?? '').toLowerCase().includes(term)
      ) {
        return false;
      }
      if (school && spell.raw.school !== school) return false;
      if (level !== '' && String(spell.raw.level ?? 0) !== level) return false;
      return true;
    });
  });

  // Gli incantesimi del personaggio arrivano da una join diretta (characters.spells)
  // che non applica le traduzioni: qui li arricchiamo incrociandoli con il catalogo
  // già tradotto (allSpells), da cui prendiamo anche i dettagli per le card.
  groupedCharacterSpells = computed(() => {
    const c = this.character();
    if (!c) return [];

    const catalogMap = new Map(this.allSpells().map((s: any) => [s.id, s]));
    const groups = new Map<number, any[]>();
    const locale = this.localeService.locale();

    for (const spell of c.spells) {
      const detail = catalogMap.get(spell.spellId);
      const level = detail?.raw?.level ?? spell.level ?? 0;
      const entry = {
        rowId: spell.rowId,
        name: detail?.name ?? spell.name,
        level,
        school: translateSpellSchool(detail?.raw?.school ?? spell.school ?? '', locale),
        castingTime: detail?.raw?.casting_time ?? null,
        range: detail?.raw?.range ?? null,
        duration: detail?.raw?.duration ?? null,
        damageEffect: detail?.raw?.damage_effect ?? null,
        description: detail?.description ?? null,
        prepared: spell.prepared,
      };
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level)!.push(entry);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, spells]) => ({
        level,
        label:
          level === 0
            ? this.localeService.t('cantrips_label')
            : `${this.localeService.t('spell_level_label')} ${level}`,
        spells,
      }));
  });

  async addSpell() {
    const c = this.character();
    if (!c || !this.selectedSpellIdToAdd || this.readOnly()) return;

    this.actionError.set(null);

    // Applica il limite di trucchetti/incantesimi conosciuti calcolato da classe+livello
    // (nessun limite se la classe non è tra quelle riconosciute in spellcasting.ts).
    const info = this.spellcastingInfo();
    if (info) {
      const spell = this.allSpells().find((s: any) => s.id === this.selectedSpellIdToAdd);
      const spellLevel = spell?.raw?.level ?? 0;

      if (spellLevel === 0) {
        if (this.knownCantripsCount() >= info.cantripsKnown) {
          this.actionError.set(this.localeService.t('cantrip_limit_reached'));
          return;
        }
      } else if (info.spellsKnownLimit !== null && this.knownLeveledSpellsCount() >= info.spellsKnownLimit) {
        this.actionError.set(this.localeService.t('spell_limit_reached'));
        return;
      }
    }

    const { error } = await this.characterStore.addSpellToCharacter(c.id, this.selectedSpellIdToAdd);
    if (error) {
      this.actionError.set(error.message);
      return;
    }
    this.selectedSpellIdToAdd = '';
  }

  async removeSpell(rowId: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.removeSpellFromCharacter(c.id, rowId);
    if (error) this.actionError.set(error.message);
  }

  async toggleSpellPrepared(rowId: string, currentlyPrepared: boolean) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    this.actionError.set(null);
    const { error } = await this.characterStore.togglePrepared(c.id, rowId, !currentlyPrepared);
    if (error) this.actionError.set(error.message);
  }
}
