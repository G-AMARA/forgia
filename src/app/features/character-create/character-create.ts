import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { getSpellcastingInfo } from '../../core/spellcasting';
import { getClassImagePath } from '../../core/class-images';
import { Modal } from '../../core/modal';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { CharacterStore } from '../../core/character-store';
import { CharacterSheet } from '../character-sheet/character-sheet';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';
import { DiceRoller } from '../../shared/dice-roller/dice-roller';
function rollAbilityScore(): number {
  // 4d6, scarta il più basso: il metodo classico D&D
  const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6));
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

@Component({
  selector: 'app-character-create',
  standalone: true,
  imports: [FormsModule, CharacterSheet, DiceRoller],
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

  races = this.contentStore.getContent('races');
  classes = this.contentStore.getContent('classes');
  backgrounds = this.contentStore.getContent('backgrounds');
  private allSubclasses = this.contentStore.getContent('subclasses');
  private allSpells = this.contentStore.getContent('spells');

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
  goldCoins = 0;
  silverCoins = 0;
  copperCoins = 0;

  abilityScores = { str: 10, dex: 10, cos: 10, int: 10, wis: 10, cha: 10 };
  backgroundBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  abilityKeys: (keyof typeof this.abilityScores)[] = ['str', 'dex', 'cos', 'int', 'wis', 'cha'];

  // Punti massimi assegnabili come Bonus Background e valore massimo per singola caratteristica:
  // combinazioni valide risultanti: tre caselle a +1, oppure una a +2 e una a +1.
  readonly backgroundBonusMax = 3;
  readonly backgroundBonusPerAbilityMax = 2;

  selectedSpellIds = signal<Set<string>>(new Set());
  protected diceRollerOpen = signal(false);

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

    const info = getSpellcastingInfo(selectedClass.raw.name, this.level);
    if (!info) return classSpells;

    const maxSpellLevel = info.slots.reduce((max, s) => Math.max(max, s.level), 0);
    return classSpells.filter((spell: any) => {
      const spellLevel = spell.raw.level ?? 0;
      return spellLevel === 0 ? info.cantripsKnown > 0 : spellLevel <= maxSpellLevel;
    });
  }

  // Se cambiando classe o livello alcuni incantesimi già selezionati non sono più
  // ammessi, li rimuove: altrimenti resterebbero "fantasma" nel Set, non più visibili
  // in lista (perché filtrata) ma comunque inviati al salvataggio del personaggio.
  private pruneInvalidSpells() {
    const validIds = new Set(this.availableSpells().map((s: any) => s.id));
    const current = this.selectedSpellIds();
    const pruned = new Set([...current].filter((id) => validIds.has(id)));
    if (pruned.size !== current.size) {
      this.selectedSpellIds.set(pruned);
    }
  }

  onClassChange(classId: string) {
    this.classId = classId;
    this.pruneInvalidSpells();
  }

  onLevelChange(level: number) {
    this.level = level;
    this.pruneInvalidSpells();
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
    } else {
      current.add(spellId);
    }
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
      goldCoins: this.goldCoins,
      silverCoins: this.silverCoins,
      copperCoins: this.copperCoins,
      spellIds: Array.from(this.selectedSpellIds()),
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
