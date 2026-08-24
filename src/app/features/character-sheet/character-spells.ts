import { Injectable, computed, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { ContentStore } from '../../core/content-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { getSpellcastingInfo } from '../../core/spellcasting';
import { translateSpellSchool } from '../../core/spell-schools';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';

// Slot incantesimo, catalogo filtrabile per classe e incantesimi conosciuti dal
// personaggio (tab Incantesimi), calcolati da classe+livello secondo le tabelle SRD.
@Injectable()
export class CharacterSpellsService {
  private characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);
  private identity = inject(CharacterIdentityService);

  private allSpells = this.contentStore.getContent('spells');

  readonly selectedSpellIdToAdd = signal('');
  readonly spellSearchTerm = signal('');
  readonly spellFilterSchool = signal('');
  readonly spellFilterLevel = signal('');

  // Nome inglese canonico della classe del personaggio, risalito dal suo id: sia
  // getSpellcastingInfo() sia spell.raw.classes ragionano sul nome base SRD in inglese,
  // mentre class_name può essere tradotto e non va usato qui.
  private canonicalClassName = computed(() => {
    const c = this.context.character();
    if (!c || !c.class_id) return null;
    return this.identity.classesContent().find((cls: any) => cls.id === c.class_id)?.raw?.name ?? null;
  });

  // Slot incantesimo e trucchetti disponibili, calcolati da classe+livello secondo le
  // tabelle standard SRD (solo per le 8 classi incantatrici canoniche: null altrimenti).
  readonly spellcastingInfo = computed(() => {
    const c = this.context.character();
    if (!c) return null;
    return getSpellcastingInfo(this.canonicalClassName(), c.level, c.ability_scores);
  });

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
  readonly availableSpellSchools = computed(() => {
    const locale = this.localeService.locale();
    const schools = [...new Set(this.classSpells().map((s: any) => s.raw.school).filter(Boolean))];
    return schools
      .map((school: string) => ({ value: school, label: translateSpellSchool(school, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly availableSpellLevels = computed(() =>
    [...new Set(this.classSpells().map((s: any) => s.raw.level ?? 0))].sort((a: number, b: number) => a - b)
  );

  readonly availableClassSpells = computed(() => {
    const term = this.spellSearchTerm().trim().toLowerCase();
    const school = this.spellFilterSchool();
    const level = this.spellFilterLevel();

    return this.classSpells().filter((spell: any) => {
      if (term && !spell.name.toLowerCase().includes(term) && !(spell.description ?? '').toLowerCase().includes(term)) {
        return false;
      }
      if (school && spell.raw.school !== school) return false;
      if (level !== '' && String(spell.raw.level ?? 0) !== level) return false;
      return true;
    });
  });

  // Gli incantesimi del personaggio arrivano da una join diretta (characters.spells) che
  // non applica le traduzioni: qui li arricchiamo incrociandoli con il catalogo già
  // tradotto (allSpells), da cui prendiamo anche i dettagli per le card.
  readonly groupedCharacterSpells = computed(() => {
    const c = this.context.character();
    if (!c) return [];

    const catalogMap = new Map(this.allSpells().map((s: any) => [s.id, s]));
    const groups = new Map<number, any[]>();
    const locale = this.localeService.locale();

    for (const spell of c.spells) {
      const detail = catalogMap.get(spell.spellId);
      const level = detail?.raw?.level ?? spell.level ?? 0;
      const schoolRaw = detail?.raw?.school ?? spell.school ?? '';
      const entry = {
        rowId: spell.rowId,
        name: detail?.name ?? spell.name,
        level,
        school: translateSpellSchool(schoolRaw, locale),
        schoolRaw,
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
        label: level === 0 ? this.localeService.t('cantrips_label') : `${this.localeService.t('spell_level_label')} ${level}`,
        spells,
      }));
  });

  knownCantripsCount(): number {
    return this.context.character()?.spells.filter((s) => s.level === 0).length ?? 0;
  }

  knownLeveledSpellsCount(): number {
    return this.context.character()?.spells.filter((s) => s.level > 0).length ?? 0;
  }

  spellLevelOptionLabel(level: number): string {
    return level === 0 ? this.localeService.t('cantrip_short') : `${this.localeService.t('level_label')} ${level}`;
  }

  async addSpell() {
    const c = this.context.character();
    if (!c || !this.selectedSpellIdToAdd() || this.context.readOnly()) return;

    // Applica il limite di trucchetti/incantesimi conosciuti calcolato da classe+livello
    // (nessun limite se la classe non è tra quelle riconosciute in spellcasting.ts).
    const info = this.spellcastingInfo();
    if (info) {
      const spell = this.allSpells().find((s: any) => s.id === this.selectedSpellIdToAdd());
      const spellLevel = spell?.raw?.level ?? 0;

      if (spellLevel === 0) {
        if (this.knownCantripsCount() >= info.cantripsKnown) {
          this.modal.error(this.localeService.t('cantrip_limit_reached'));
          return;
        }
      } else if (info.spellsKnownLimit !== null && this.knownLeveledSpellsCount() >= info.spellsKnownLimit) {
        this.modal.error(this.localeService.t('spell_limit_reached'));
        return;
      }
    }

    const { error } = await this.characterStore.addSpellToCharacter(c.id, this.selectedSpellIdToAdd());
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.selectedSpellIdToAdd.set('');
  }

  async removeSpell(rowId: string) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const { error } = await this.characterStore.removeSpellFromCharacter(c.id, rowId);
    if (error) this.modal.error(error.message);
  }

  async toggleSpellPrepared(rowId: string, currentlyPrepared: boolean) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;
    const { error } = await this.characterStore.togglePrepared(c.id, rowId, !currentlyPrepared);
    if (error) this.modal.error(error.message);
  }
}
