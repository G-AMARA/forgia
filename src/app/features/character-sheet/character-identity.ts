import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';
import { ABILITY_KEYS, AbilityKey, AbilityScores } from './character-sheet.types';

const EMPTY_BONUSES: AbilityScores = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };

// Bozza modificabile dei campi identità (tab Generale + modale di modifica): razza,
// classe, background, punteggi caratteristica e bonus. Si risincronizza da zero ogni
// volta che cambia il personaggio caricato (vedi effect nel costruttore).
@Injectable()
export class CharacterIdentityService {
  private characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);

  readonly races = this.contentStore.getContent('races');
  private allSubraces = this.contentStore.getContent('subraces');
  readonly classesContent = this.contentStore.getContent('classes');
  readonly backgroundsContent = this.contentStore.getContent('backgrounds');
  private allSubclasses = this.contentStore.getContent('subclasses');

  readonly alignments = [
    'lawful_good', 'neutral_good', 'chaotic_good',
    'lawful_neutral', 'true_neutral', 'chaotic_neutral',
    'lawful_evil', 'neutral_evil', 'chaotic_evil',
  ];

  readonly modalOpen = signal(false);

  readonly name = signal('');
  readonly level = signal(1);
  readonly raceId = signal('');
  readonly subraceId = signal('');
  readonly classId = signal('');
  readonly subclassId = signal('');
  readonly backgroundId = signal('');
  readonly alignment = signal('true_neutral');
  readonly xp = signal(0);
  readonly sex = signal<'M' | 'F'>('M');
  readonly abilityScores = signal<AbilityScores>({ ...EMPTY_BONUSES });
  // Punti "a scelta libera" concessi da razza/sottorazza (es. Umano Variante, Draconide
  // Cromatico), ricostruiti da applied_bonus al caricamento (vedi resetFields sotto).
  readonly freeBonuses = signal<AbilityScores>({ ...EMPTY_BONUSES });
  // Bonus attualmente "cotto" dentro abilityScores (sempre razziale/sottorazza): serve a
  // calcolare la differenza esatta da applicare quando razza/sottorazza cambiano.
  private appliedBonus: AbilityScores = { ...EMPTY_BONUSES };

  readonly backstory = signal('');

  readonly availableSubclasses = computed(() => {
    const classId = this.classId();
    const level = this.level();
    if (!classId) return [];
    return this.allSubclasses().filter(
      (sub: any) => sub.raw.class_id === classId && sub.raw.unlocked_at_level <= level
    );
  });

  readonly availableSubraces = computed(() => {
    const raceId = this.raceId();
    if (!raceId) return [];
    return this.allSubraces().filter((sub: any) => sub.raw.race_id === raceId);
  });

  readonly freeBonusPoints = computed(() => {
    const race = this.races().find((r: any) => r.id === this.raceId());
    const subrace = this.allSubraces().find((s: any) => s.id === this.subraceId());
    return this.subraceId() ? (subrace?.raw?.free_bonus_points ?? 0) : (race?.raw?.free_bonus_points ?? 0);
  });

  readonly freeBonusPerAbilityMax = computed(() => {
    const race = this.races().find((r: any) => r.id === this.raceId());
    const subrace = this.allSubraces().find((s: any) => s.id === this.subraceId());
    return this.subraceId()
      ? (subrace?.raw?.free_bonus_max_per_ability ?? 0)
      : (race?.raw?.free_bonus_max_per_ability ?? 0);
  });

  readonly freeBonusTotal = computed(() =>
    ABILITY_KEYS.reduce((sum, k) => sum + this.freeBonuses()[k], 0)
  );

  readonly freeBonusRemaining = computed(() => this.freeBonusPoints() - this.freeBonusTotal());

  readonly racialBonusSummary = computed(() => {
    const parts = ABILITY_KEYS.filter((k) => this.getRaceOrSubraceBonus(k) > 0).map(
      (k) => `+${this.getRaceOrSubraceBonus(k)} ${this.localeService.t('ability_' + k)}`
    );
    return parts.join(', ') || '—';
  });

  // Scurovisione: tratto della razza, sostituito da quello della sottorazza se selezionata
  // (stessa logica "non cumulativa" del bonus caratteristica).
  readonly hasDarkvision = computed(() => {
    if (this.subraceId()) {
      return this.allSubraces().find((s: any) => s.id === this.subraceId())?.raw?.darkvision ?? false;
    }
    return this.races().find((r: any) => r.id === this.raceId())?.raw?.darkvision ?? false;
  });

  // Velocità: tratto della razza (le sottorazze non la sovrascrivono, a differenza di
  // bonus caratteristica e scurovisione).
  readonly raceSpeed = computed(
    () => this.races().find((r: any) => r.id === this.raceId())?.raw?.speed ?? 0
  );

  constructor() {
    effect(() => {
      const c = this.context.character();
      if (c) this.resetFields(c as any);
    });
  }

  onRaceChange(raceId: string) {
    this.raceId.set(raceId);
    this.subraceId.set('');
    this.freeBonuses.set({ ...EMPTY_BONUSES });
  }

  onSubraceChange(subraceId: string) {
    this.subraceId.set(subraceId);
    this.freeBonuses.set({ ...EMPTY_BONUSES });
  }

  openModal() {
    this.modalOpen.set(true);
  }

  cancelEdit() {
    const c = this.context.character();
    if (c) this.resetFields(c as any);
    this.modalOpen.set(false);
  }

  // Bonus razziale: fisso, definito dalla razza scelta (gestito in Gestione > Razze).
  getRaceBonus(key: AbilityKey): number {
    const race = this.races().find((r: any) => r.id === this.raceId());
    return normalizeAbilityBonuses(race?.raw?.ability_bonuses)[key] ?? 0;
  }

  // Bonus di sottorazza: SOSTITUISCE quello della razza madre (non regole 5e standard,
  // scelta di design del progetto: la sottorazza scelta è l'unica fonte di bonus caratteristica).
  getSubraceBonus(key: AbilityKey): number {
    const subrace = this.allSubraces().find((s: any) => s.id === this.subraceId());
    return normalizeAbilityBonuses(subrace?.raw?.ability_bonuses)[key] ?? 0;
  }

  // Bonus caratteristica effettivo: se è selezionata una sottorazza, conta solo il suo
  // bonus; altrimenti quello della razza. Non si sommano mai i due.
  getRaceOrSubraceBonus(key: AbilityKey): number {
    return this.subraceId() ? this.getSubraceBonus(key) : this.getRaceBonus(key);
  }

  getAppliedBonus(key: AbilityKey): number {
    return this.getRaceOrSubraceBonus(key) + this.freeBonuses()[key];
  }

  maxFreeBonus(key: AbilityKey): number {
    return Math.min(this.freeBonusPerAbilityMax(), this.freeBonuses()[key] + this.freeBonusRemaining());
  }

  setFreeBonus(key: AbilityKey, value: number) {
    const current = this.freeBonuses();
    let next = Math.max(0, Math.min(this.freeBonusPerAbilityMax(), Math.floor(value) || 0));
    const othersSum = ABILITY_KEYS.filter((k) => k !== key).reduce((sum, k) => sum + current[k], 0);
    if (othersSum + next > this.freeBonusPoints()) {
      next = Math.max(0, this.freeBonusPoints() - othersSum);
    }
    this.freeBonuses.set({ ...current, [key]: next });
  }

  setAbilityScore(key: AbilityKey, value: number) {
    this.abilityScores.set({ ...this.abilityScores(), [key]: value });
  }

  async save() {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;

    // Rimuove dagli ability_scores il bonus applicato in precedenza e vi somma quello
    // nuovo (razza/sottorazza): così le statistiche restano coerenti quando razza o
    // sottorazza cambiano.
    const newAppliedBonus = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, this.getAppliedBonus(key)])
    ) as AbilityScores;
    const currentScores = this.abilityScores();
    const newAbilityScores = Object.fromEntries(
      ABILITY_KEYS.map((key) => [
        key,
        Math.max(1, currentScores[key] - (this.appliedBonus[key] ?? 0) + newAppliedBonus[key]),
      ])
    ) as AbilityScores;

    const { error } = await this.characterStore.updateIdentity(c.id, {
      name: this.name(),
      level: this.level(),
      raceId: this.raceId(),
      subraceId: this.subraceId() || null,
      classId: this.classId(),
      subclassId: this.subclassId() || null,
      backgroundId: this.backgroundId() || null,
      alignment: this.alignment(),
      experiencePoints: this.xp(),
      abilityScores: newAbilityScores,
      appliedBonus: newAppliedBonus,
      sex: this.sex(),
    });

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.modalOpen.set(false);
    this.modal.success(this.localeService.t('saved_message'));
  }

  async saveBackstory() {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    await this.characterStore.updateNotes(c.id, this.backstory());
    this.modal.success(this.localeService.t('saved_message'));
  }

  // Popola i campi identità modificabili a partire dal personaggio salvato: usato sia
  // al caricamento sia per annullare le modifiche in corso quando si chiude la modale
  // senza salvare.
  private resetFields(c: {
    name: string; level: number; race_id: string | null; subrace_id: string | null;
    class_id: string | null; subclass_id: string | null; background_id: string | null;
    alignment: string | null; experience_points: number; sex: 'M' | 'F' | null;
    ability_scores: AbilityScores; applied_bonus: AbilityScores; notes: string | null;
  }) {
    this.name.set(c.name);
    this.level.set(c.level);
    this.raceId.set(c.race_id ?? '');
    this.subraceId.set(c.subrace_id ?? '');
    this.classId.set(c.class_id ?? '');
    this.subclassId.set(c.subclass_id ?? '');
    this.backgroundId.set(c.background_id ?? '');
    this.alignment.set(c.alignment ?? 'true_neutral');
    this.xp.set(c.experience_points);
    this.sex.set(c.sex ?? 'M');
    // Punteggi caratteristica: modificabili anche dalla modale identità (non solo dal tab
    // Abilità), quindi vanno ripristinati qui se l'utente annulla senza salvare.
    this.abilityScores.set({ ...c.ability_scores });
    this.appliedBonus = { ...EMPTY_BONUSES, ...c.applied_bonus };
    // Ricostruisce la quota "a scelta libera" per differenza rispetto ai bonus fissi di
    // razza/sottorazza: applied_bonus contiene solo il totale, non la distribuzione scelta.
    this.freeBonuses.set(
      Object.fromEntries(
        ABILITY_KEYS.map((key) => [
          key,
          Math.max(0, (c.applied_bonus[key] ?? 0) - this.getRaceOrSubraceBonus(key)),
        ])
      ) as AbilityScores
    );
    this.backstory.set(c.notes ?? '');
  }
}
