import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentStore } from '../../core/content-store';
import { ActiveCampaign } from '../../core/active-campaign';
import { Auth } from '../../core/auth';
import { CharacterStore } from '../../core/character-store';
import { CharacterSheet } from '../character-sheet/character-sheet';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';

function rollAbilityScore(): number {
  // 4d6, scarta il più basso: il metodo classico D&D
  const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6));
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

@Component({
  selector: 'app-character-create',
  standalone: true,
  imports: [FormsModule, CharacterSheet],
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

  abilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  abilityKeys: (keyof typeof this.abilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  selectedSpellIds = signal<Set<string>>(new Set());

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
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

  // Incantesimi disponibili per la classe scelta (solo se la classe lancia incantesimi)
  availableSpells(): any[] {
    if (!this.classId) return [];
    const selectedClass = this.classes().find((c: any) => c.id === this.classId);
    if (!selectedClass) return [];

    // Confronto sul nome base (inglese, raw.name), non su quello tradotto,
    // perché l'array spell.raw.classes arriva così com'è dall'SRD in inglese.
    const baseClassName = selectedClass.raw.name?.toLowerCase();

    return this.allSpells().filter((spell: any) => {
      const classNames = spell.raw.classes ?? [];
      return classNames.some((c: any) => c.name?.toLowerCase() === baseClassName);
    });
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

  async submit() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.loading.set(true);

    const { error, characterId } = await this.characterStore.createCharacter({
      name: this.name,
      raceId: this.raceId,
      classId: this.classId,
      subclassId: this.subclassId || null,
      backgroundId: this.backgroundId,
      level: this.level,
      alignment: this.alignment,
      experiencePoints: this.experiencePoints,
      abilityScores: this.abilityScores,
      backstory: this.backstory,
      spellIds: Array.from(this.selectedSpellIds()),
    });

    if (error || !characterId) {
      this.errorMsg.set(error?.message ?? 'Errore sconosciuto');
      this.loading.set(false);
      return;
    }

    this.appNav.setTab('character-sheet');
    this.router.navigate(['/scheda-personaggio', characterId]);
  }
}
