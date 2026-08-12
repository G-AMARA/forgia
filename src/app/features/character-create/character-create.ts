import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { getSpellcastingInfo } from '../../core/spellcasting';
import {
  EquipmentChoiceGroup,
  EquipmentRef,
  resolveCategoryOptions,
  resolveItemRef,
} from '../../core/starting-equipment';
import { getClassImagePath } from '../../core/class-images';
import { Modal } from '../../core/modal';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { CharacterStore } from '../../core/character-store';
import { CharacterSheet } from '../character-sheet/character-sheet';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';
import { DiceRoller } from '../../shared/dice-roller/dice-roller';
import { Supabase } from '../../core/supabase';

function rollAbilityScore(): number {
  // 4d6, scarta il più basso: il metodo classico D&D
  const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6));
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

@Component({
  selector: 'app-character-create',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, CharacterSheet, DiceRoller],
  templateUrl: './character-create.html',
})
export class CharacterCreate {
  private contentStore = inject(ContentStore);
  protected characterStore = inject(CharacterStore);
  protected campaignStore = inject(ActiveCampaign);
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private appNav = inject(AppNav);
  private router = inject(Router);
  private modal = inject(Modal);
  isDiceRollerOpen = false;
  activeAbilityForRoll: (keyof typeof this.abilityScores) | null = null;
  isAbilityRollMode = false;
  private supabase = inject(Supabase);

  races = this.contentStore.getContent('races');
  classes = this.contentStore.getContent('classes');
  backgrounds = this.contentStore.getContent('backgrounds');
  private allSubclasses = this.contentStore.getContent('subclasses');
  private allSpells = this.contentStore.getContent('spells');
  private allWeapons = this.contentStore.getContent('weapons');
  // Contenuti delle Dotazioni (equipment_contents), per mostrare "Dotazione da Studioso (Zaino,
  // Libro, ...)" invece del solo nome del pack nel picker. Non è un ContentTable di ContentStore
  // (è una tabella di giunzione), quindi si carica a parte, una volta sola.
  private packContents = signal<Map<string, { childId: string; quantity: number }[]>>(new Map());
  private allEquipment = this.contentStore.getContent('equipment');

  levels = Array.from({ length: 20 }, (_, i) => i + 1);

  alignments = [
    'lawful_good', 'neutral_good', 'chaotic_good',
    'lawful_neutral', 'true_neutral', 'chaotic_neutral',
    'lawful_evil', 'neutral_evil', 'chaotic_evil',
  ];

  name = '';
  raceId = '';
  classId = '';
  backgroundId = '';
  subclassId = '';
  level = 1;
  alignment = 'true_neutral';
  experiencePoints = 0;
  backstory = '';
  sex: 'M' | 'F' = 'M';
  darkvision = false;

  abilityScores = { str: 10, dex: 10, cos: 10, int: 10, wis: 10, cha: 10 };
  backgroundBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityScores)[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

  // Punti massimi assegnabili come Bonus Background e valore massimo per singola caratteristica:
  // combinazioni valide risultanti: tre caselle a +1, oppure una a +2 e una a +1.
  readonly backgroundBonusMax = 3;
  readonly backgroundBonusPerAbilityMax = 2;

  constructor() {
    this.loadPackContents();
  }

  private async loadPackContents() {
    const { data } = await this.supabase.client
      .from('equipment_contents')
      .select('parent_equipment_id, child_equipment_id, quantity');

    const map = new Map<string, { childId: string; quantity: number }[]>();
    for (const row of data ?? []) {
      const list = map.get(row.parent_equipment_id) ?? [];
      list.push({ childId: row.child_equipment_id, quantity: row.quantity });
      map.set(row.parent_equipment_id, list);
    }
    this.packContents.set(map);
  }

  selectedSpellIds = signal<Set<string>>(new Set());
  protected diceRollerOpen = signal(false);

  // Scelte di equipaggiamento iniziale: optionIndex scelto per ciascun gruppo (classe/background
  // uniti, chiave prefissata "class:"/"bg:" per evitare collisioni), e oggetti concreti scelti per
  // ogni ref di tipo 'category' dentro l'opzione selezionata (chiave `${groupKey}:${refIndex}`).
  equipmentOptionChoice = signal<Record<string, number>>({});
  equipmentCategoryPicks = signal<Record<string, string[]>>({});

  loading = signal(false);

  // Sottoclassi disponibili per la classe scelta, sbloccate al livello selezionato o prima.
  // Metodo (non computed): classId/level sono campi normali legati con ngModel,
  // non signal, quindi un computed() non li tracciherebbe e resterebbe bloccato
  // al primo valore calcolato. Un metodo viene invece rivalutato a ogni ciclo
  // di change detection, cioè a ogni interazione con la select.
  availableSubclasses(): any[] {
    if (!this.classId) return [];
    return this.allSubclasses().filter(
      (sub: any) => sub.raw.class_id === this.classId && sub.raw.unlocked_at_level <= this.level
    );
  }

  // Immagine di sfondo della classe scelta, versione femminile o maschile a seconda del
  // sesso impostato. Metodo (non computed): classId/sex sono campi ngModel, non signal.
  classImagePath(): string | null {
    const selectedClass = this.classes().find((c: any) => c.id === this.classId);
    return getClassImagePath(selectedClass?.name, this.sex);
  }

  // Incantesimi disponibili per la classe scelta, ristretti al livello massimo che
  // quella classe ha sbloccato al livello del personaggio (es. Warlock lvl 1 vede solo
  // trucchetti e incantesimi di 1° livello, non l'intera lista della classe). Le classi
  // homebrew/non canoniche (getSpellcastingInfo torna null, nessuna progressione nota)
  // non subiscono il taglio per livello: si vede l'intera lista come prima.
  availableSpells(): any[] {
    if (!this.classId) return [];
    const selectedClass = this.classes().find((c: any) => c.id === this.classId);
    if (!selectedClass) return [];

    // Confronto sul nome base (inglese, raw.name), non su quello tradotto,
    // perché l'array spell.raw.classes arriva così com'è dall'SRD in inglese.
    const baseClassName = selectedClass.raw.name?.toLowerCase();

    const classSpells = this.allSpells().filter((spell: any) => {
      const classNames = spell.raw.classes ?? [];
      return classNames.some((c: any) => c.name?.toLowerCase() === baseClassName);
    });

    const info = this.currentSpellcastingInfo();
    if (!info) return classSpells;

    const maxSpellLevel = info.slots.reduce((max, s) => Math.max(max, s.level), 0);
    return classSpells.filter((spell: any) => {
      const spellLevel = spell.raw.level ?? 0;
      return spellLevel === 0 ? info.cantripsKnown > 0 : spellLevel <= maxSpellLevel;
    });
  }

  // Slot/trucchetti/incantesimi conosciuti per la classe+livello scelti, stessa tabella SRD
  // usata nella scheda personaggio (core/spellcasting.ts). Serve l'ability score finale (con
  // bonus applicato) perché le classi "preparate" (Mago, Chierico, Druido, Paladino) calcolano
  // il limite come mod. caratteristica + livello.
  currentSpellcastingInfo() {
    if (!this.classId) return null;
    const selectedClass = this.classes().find((c: any) => c.id === this.classId);
    if (!selectedClass) return null;
    const abilityScores = Object.fromEntries(this.abilityKeys.map((key) => [key, this.getTotalScore(key)]));
    return getSpellcastingInfo(selectedClass.raw.name, this.level, abilityScores);
  }

  knownCantripsCount(): number {
    return [...this.selectedSpellIds()].filter((id) => (this.allSpells().find((s: any) => s.id === id)?.raw.level ?? 0) === 0).length;
  }

  knownLeveledSpellsCount(): number {
    return [...this.selectedSpellIds()].filter((id) => (this.allSpells().find((s: any) => s.id === id)?.raw.level ?? 0) > 0).length;
  }

  // Un trucchetto/incantesimo non ancora scelto è selezionabile solo se non si è già al tetto
  // massimo per la sua categoria; quelli già scelti restano sempre deselezionabili.
  canSelectSpell(spell: any): boolean {
    if (this.isSpellSelected(spell.id)) return true;
    const info = this.currentSpellcastingInfo();
    if (!info) return true;
    const spellLevel = spell.raw.level ?? 0;
    if (spellLevel === 0) return this.knownCantripsCount() < info.cantripsKnown;
    return info.spellsKnownLimit === null || this.knownLeveledSpellsCount() < info.spellsKnownLimit;
  }

  // Se cambiando classe o livello alcuni incantesimi già selezionati non sono più
  // ammessi (fuori lista o oltre il nuovo tetto massimo), li rimuove: altrimenti
  // resterebbero "fantasma" nel Set, non più visibili in lista ma comunque inviati
  // al salvataggio del personaggio.
  private pruneInvalidSpells() {
    const validIds = new Set(this.availableSpells().map((s: any) => s.id));
    let current = new Set([...this.selectedSpellIds()].filter((id) => validIds.has(id)));

    const info = this.currentSpellcastingInfo();
    if (info) {
      const cantripIds: string[] = [];
      const leveledIds: string[] = [];
      for (const id of current) {
        const level = this.allSpells().find((s: any) => s.id === id)?.raw.level ?? 0;
        (level === 0 ? cantripIds : leveledIds).push(id);
      }
      current = new Set([
        ...cantripIds.slice(0, info.cantripsKnown),
        ...(info.spellsKnownLimit !== null ? leveledIds.slice(0, info.spellsKnownLimit) : leveledIds),
      ]);
    }

    const originalIds = this.selectedSpellIds();
    if (current.size !== originalIds.size || [...current].some((id) => !originalIds.has(id))) {
      this.selectedSpellIds.set(current);
    }
  }

  onClassChange(classId: string) {
    this.classId = classId;
    this.pruneInvalidSpells();
    this.equipmentOptionChoice.set({});
    this.equipmentCategoryPicks.set({});
  }

  onLevelChange(level: number) {
    this.level = level;
    this.pruneInvalidSpells();
  }

  onBackgroundChange(backgroundId: string) {
    this.backgroundId = backgroundId;
    this.equipmentOptionChoice.set({});
    this.equipmentCategoryPicks.set({});
  }

  // Gruppi di scelta equipaggiamento di classe + background uniti in un'unica lista, con
  // chiave prefissata per evitare collisioni tra i due (es. entrambi potrebbero avere "fixed-pack").
  // Metodo (non computed): come availableSubclasses(), classId/backgroundId sono ngModel, non signal.
  startingEquipmentGroups(): { groupKey: string; group: EquipmentChoiceGroup }[] {
    const cls = this.classes().find((c: any) => c.id === this.classId);
    const bg = this.backgrounds().find((b: any) => b.id === this.backgroundId);
    const groups: { groupKey: string; group: EquipmentChoiceGroup }[] = [];
    for (const g of (cls?.raw.starting_equipment ?? []) as EquipmentChoiceGroup[]) {
      groups.push({ groupKey: `class:${g.key}`, group: g });
    }
    for (const g of (bg?.raw.starting_equipment ?? []) as EquipmentChoiceGroup[]) {
      groups.push({ groupKey: `bg:${g.key}`, group: g });
    }
    return groups;
  }

  // Sottoinsiemi per mostrare in UI l'equipaggiamento di classe e di background in due
  // sezioni separate, così è chiaro da dove arriva ciascuna scelta.
  classEquipmentGroups(): { groupKey: string; group: EquipmentChoiceGroup }[] {
    return this.startingEquipmentGroups().filter((e) => e.groupKey.startsWith('class:'));
  }

  backgroundEquipmentGroups(): { groupKey: string; group: EquipmentChoiceGroup }[] {
    return this.startingEquipmentGroups().filter((e) => e.groupKey.startsWith('bg:'));
  }

  startingGoldPreview(): number {
    return this.backgrounds().find((b: any) => b.id === this.backgroundId)?.raw.starting_gold ?? 0;
  }

  selectedOptionIndex(groupKey: string): number {
    return this.equipmentOptionChoice()[groupKey] ?? 0;
  }

  selectEquipmentOption(groupKey: string, optionIndex: number) {
    this.equipmentOptionChoice.update((current) => ({ ...current, [groupKey]: optionIndex }));
    // Cambiando opzione, le scelte di categoria fatte per l'opzione precedente non sono più valide.
    this.equipmentCategoryPicks.update((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${groupKey}:`)) delete next[key];
      }
      return next;
    });
  }

  categoryPickKey(groupKey: string, refIndex: number): string {
    return `${groupKey}:${refIndex}`;
  }

  // Slot da compilare per un ref 'category' con quantity > 1 (es. "due armi semplici a scelta").
  categoryPickSlots(ref: Extract<EquipmentRef, { kind: 'category' }>): number[] {
    return Array.from({ length: ref.quantity ?? 1 }, (_, i) => i);
  }

  categoryOptionsFor(ref: Extract<EquipmentRef, { kind: 'category' }>): any[] {
    return resolveCategoryOptions(ref, this.allWeapons(), this.allEquipment());
  }

  getCategoryPick(groupKey: string, refIndex: number, slot: number): string {
    return this.equipmentCategoryPicks()[this.categoryPickKey(groupKey, refIndex)]?.[slot] ?? '';
  }

  setCategoryPick(groupKey: string, refIndex: number, slot: number, itemId: string) {
    const key = this.categoryPickKey(groupKey, refIndex);
    this.equipmentCategoryPicks.update((current) => {
      const picks = [...(current[key] ?? [])];
      picks[slot] = itemId;
      return { ...current, [key]: picks };
    });
  }

  // Elenco leggibile del contenuto di una Dotazione (equipment_contents), es.
  // "Zaino, Libro, Boccetta d'inchiostro, 10× Foglio di pergamena". Stringa vuota se l'oggetto
  // non è una Dotazione o non ha ancora nessun contenuto configurato.
  private packContentsLabel(item: any): string {
    if (item.raw.type !== 'Pack') return '';
    const contents = this.packContents().get(item.id) ?? [];
    return contents
      .map((c) => {
        const child = this.allEquipment().find((e: any) => e.id === c.childId);
        const name = child?.name ?? '?';
        return c.quantity > 1 ? `${c.quantity}× ${name}` : name;
      })
      .join(', ');
  }

  // Etichetta leggibile di un ref (oggetto fisso o categoria), per il testo dell'opzione radio.
  refLabel(ref: EquipmentRef): string {
    const quantityPrefix = ref.quantity && ref.quantity > 1 ? `${ref.quantity}× ` : '';
    if (ref.kind === 'item') {
      const item = resolveItemRef(ref, this.allWeapons(), this.allEquipment());
      const label = quantityPrefix + (item?.name ?? ref.name);
      const contents = item && ref.table === 'equipment' ? this.packContentsLabel(item) : '';
      return contents ? `${label} (${contents})` : label;
    }
    const key = ref.table === 'weapons' ? `weapon_category_${ref.category}` : `tool_category_${ref.category}`;
    return quantityPrefix + this.localeService.t(key);
  }

  optionLabel(refs: EquipmentRef[]): string {
    return refs.map((r) => this.refLabel(r)).join(' + ');
  }

  // Nome dell'oggetto concreto scelto per un ref 'category': usato per mostrarlo nella select.
  categoryItemName(item: any): string {
    return item.name;
  }

  // True se l'utente loggato ha già un personaggio in questa campagna (max 1 per regola)
  hasOwnCharacterAlready = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return false;
    return this.characterStore.characters().some((c) => c.owner_id === userId);
  });

  getModifier(score: number): number {
    if (score <= 1) return -5;
    if (score <= 3) return -4;
    if (score <= 5) return -3;
    if (score <= 7) return -2;
    if (score <= 9) return -1;
    if (score <= 11) return 0;
    if (score <= 13) return 1;
    if (score <= 15) return 2;
    if (score <= 17) return 3;
    if (score <= 19) return 4;
    if (score <= 21) return 5;
    if (score <= 23) return 6;
    if (score <= 25) return 7;
    if (score <= 27) return 8;
    if (score <= 29) return 9;
    return 10;
  }

  rollAllScores() {
    for (const key of this.abilityKeys) {
      this.abilityScores[key] = rollAbilityScore();
    }
  }

  toggleSpell(spellId: string) {
    const current = new Set(this.selectedSpellIds());
    if (current.has(spellId)) {
      current.delete(spellId);
      this.selectedSpellIds.set(current);
      return;
    }

    // Stesso tetto massimo (trucchetti/incantesimi conosciuti) applicato nella scheda
    // personaggio: qui il checkbox è già disabilitato via canSelectSpell(), questo è
    // solo un ulteriore guardrail lato dati.
    const spell = this.allSpells().find((s: any) => s.id === spellId);
    if (spell && !this.canSelectSpell(spell)) return;

    current.add(spellId);
    this.selectedSpellIds.set(current);
  }

  isSpellSelected(spellId: string): boolean {
    return this.selectedSpellIds().has(spellId);
  }

  // Bonus razziale: fisso, definito dalla razza scelta (gestito in Gestione > Razze), non modificabile qui.
  getRaceBonus(key: keyof typeof this.abilityScores): number {
    const race = this.races().find((r: any) => r.id === this.raceId);
    return normalizeAbilityBonuses(race?.raw?.ability_bonuses)[key] ?? 0;
  }

  backgroundBonusTotal(): number {
    return this.abilityKeys.reduce((sum, k) => sum + this.backgroundBonuses[k], 0);
  }

  backgroundBonusRemaining(): number {
    return this.backgroundBonusMax - this.backgroundBonusTotal();
  }

  // Tetto dinamico per l'input: non oltre il max per caratteristica, né oltre i punti rimasti.
  maxBackgroundBonus(key: keyof typeof this.abilityScores): number {
    return Math.min(this.backgroundBonusPerAbilityMax, this.backgroundBonuses[key] + this.backgroundBonusRemaining());
  }

  // Applica il nuovo valore rispettando i vincoli: max 2 per caratteristica, max 3 punti totali.
  setBackgroundBonus(key: keyof typeof this.abilityScores, value: number) {
    let next = Math.max(0, Math.min(this.backgroundBonusPerAbilityMax, Math.floor(value) || 0));
    const othersSum = this.abilityKeys
      .filter((k) => k !== key)
      .reduce((sum, k) => sum + this.backgroundBonuses[k], 0);
    if (othersSum + next > this.backgroundBonusMax) {
      next = Math.max(0, this.backgroundBonusMax - othersSum);
    }
    this.backgroundBonuses[key] = next;
  }

  // Il bonus razziale e quello di background sono alternativi, non cumulativi:
  // se è stato scelto un background, il suo bonus manuale sostituisce quello automatico della razza.
  getAppliedBonus(key: keyof typeof this.abilityScores): number {
    return this.backgroundId ? this.backgroundBonuses[key] : this.getRaceBonus(key);
  }

  getTotalScore(key: keyof typeof this.abilityScores): number {
    return this.abilityScores[key] + this.getAppliedBonus(key);
  }

  // Trasforma le scelte fatte nei gruppi (opzione + eventuali pick di categoria) nella lista
  // finale di oggetti da assegnare al personaggio, sommando le quantità se lo stesso oggetto
  // ricorre più volte (es. due pick di categoria finiti sulla stessa arma).
  private resolveStartingEquipment(): { table: 'weapons' | 'equipment'; id: string; quantity: number }[] {
    const merged = new Map<string, { table: 'weapons' | 'equipment'; id: string; quantity: number }>();

    const add = (table: 'weapons' | 'equipment', id: string, quantity: number) => {
      const key = `${table}:${id}`;
      const existing = merged.get(key);
      if (existing) existing.quantity += quantity;
      else merged.set(key, { table, id, quantity });
    };

    for (const { groupKey, group } of this.startingEquipmentGroups()) {
      const option = group.options[this.selectedOptionIndex(groupKey)];
      if (!option) continue;

      option.refs.forEach((ref, refIndex) => {
        if (ref.kind === 'item') {
          const item = resolveItemRef(ref, this.allWeapons(), this.allEquipment());
          if (!item) return;
          // Una Dotazione non va in inventario come riga unica: si scompone nei singoli
          // oggetti che contiene (stessa idea di equipment_contents in Gestione), così il
          // giocatore la ritrova già spacchettata nell'inventario invece di un nome opaco.
          if (ref.table === 'equipment' && item.raw.type === 'Pack') {
            const contents = this.packContents().get(item.id) ?? [];
            for (const c of contents) {
              add('equipment', c.childId, c.quantity * (ref.quantity ?? 1));
            }
          } else {
            add(ref.table, item.id, ref.quantity ?? 1);
          }
        } else {
          const picks = this.equipmentCategoryPicks()[this.categoryPickKey(groupKey, refIndex)] ?? [];
          for (const itemId of picks) {
            if (itemId) add(ref.table, itemId, 1);
          }
        }
      });
    }

    return Array.from(merged.values());
  }

  // Se tra l'equipaggiamento iniziale c'è un'armatura (o uno scudo), la indossa subito invece
  // di lasciarla "nessuna armatura" finché il giocatore non la equipaggia a mano dalla scheda:
  // altrimenti la CA calcolata resterebbe sbagliata (10 + Des) nonostante l'armatura sia già
  // in inventario.
  private detectStartingArmor(
    items: { table: 'weapons' | 'equipment'; id: string; quantity: number }[]
  ): { equippedArmorId: string | null; shieldEquipped: boolean; equippedEquipmentIds: string[] } {
    let equippedArmorId: string | null = null;
    let shieldEquipped = false;
    const equippedEquipmentIds: string[] = [];

    for (const item of items) {
      if (item.table !== 'equipment') continue;
      const equip = this.allEquipment().find((e: any) => e.id === item.id);
      if (!equip || equip.raw.type !== 'Armor') continue;

      equippedEquipmentIds.push(equip.id);
      if (equip.raw.armor_category === 'shield') shieldEquipped = true;
      else if (!equippedArmorId) equippedArmorId = equip.id;
    }

    return { equippedArmorId, shieldEquipped, equippedEquipmentIds };
  }

  async submit() {
    this.loading.set(true);

    // I punteggi finali (base + bonus applicato) sono l'unico valore persistito in
    // ability_scores; appliedBonus viene salvato a parte per poter ricalcolare
    // correttamente le statistiche se in futuro razza o background cambiano.
    const finalAbilityScores = Object.fromEntries(
      this.abilityKeys.map((key) => [key, this.getTotalScore(key)])
    );
    const appliedBonus = Object.fromEntries(
      this.abilityKeys.map((key) => [key, this.getAppliedBonus(key)])
    );

    const startingItems = this.resolveStartingEquipment();
    const { equippedArmorId, shieldEquipped, equippedEquipmentIds } = this.detectStartingArmor(startingItems);
    const background = this.backgrounds().find((b: any) => b.id === this.backgroundId);
    const startingGold = background?.raw.starting_gold ?? 0;

    const { error, characterId } = await this.characterStore.createCharacter({
      name: this.name,
      raceId: this.raceId,
      classId: this.classId,
      subclassId: this.subclassId || null,
      backgroundId: this.backgroundId || null,
      level: this.level,
      alignment: this.alignment,
      experiencePoints: this.experiencePoints,
      abilityScores: finalAbilityScores,
      appliedBonus,
      backstory: this.backstory,
      sex: this.sex,
      darkvision: this.darkvision,
      spellIds: Array.from(this.selectedSpellIds()),
      startingItems,
      equippedArmorId,
      shieldEquipped,
      equippedEquipmentIds,
      startingGold,
    });

    if (error || !characterId) {
      this.modal.error(error?.message ?? 'Errore sconosciuto');
      this.loading.set(false);
      return;
    }

    this.appNav.setTab('character-sheet');
    this.router.navigate(['/scheda-personaggio', characterId]);
  }

  // Quando apri la modale, TypeScript riconosce 'key' come tipo valido
  openDiceRollerForAbility(key: keyof typeof this.abilityScores) {
    this.activeAbilityForRoll = key;
    this.isAbilityRollMode = true;  // Attiva la regola dei 4d6 bloccati
    this.isDiceRollerOpen = true;
  }

  // Intercetta il risultato totale emesso dal DiceRoller
  handleRollResult(total: number) {
    if (this.activeAbilityForRoll) {
      // Assegna il totale dei dadi direttamente al punteggio base della caratteristica (es. Forza, Destrezza...)
      this.abilityScores[this.activeAbilityForRoll] = total;
    }
  }
  // Chiude la modale pulendo lo stato
  closeDiceRoller() {
    this.isDiceRollerOpen = false;
    this.activeAbilityForRoll = null;
    this.isAbilityRollMode = false; // Reset della modalità
  }
}
