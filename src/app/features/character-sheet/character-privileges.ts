import { Injectable, inject } from '@angular/core';
import { ContentStore } from '../../core/content-store';
import { LocaleService } from '../../core/locale';
import { TraitBlock } from '../../core/bestiary-store';
import { CharacterIdentityService } from './character-identity';

// Dati derivati (sola lettura) da razza/sottorazza/classe/sottoclasse/background: descrizioni,
// nomi tradotti, tratti (pannello "Privilegi e Tratti") e competenze bloccate dalle fonti
// automatiche. Legge gli id scelti dal draft di CharacterIdentityService.
@Injectable()
export class CharacterPrivilegesService {
  private contentStore = inject(ContentStore);
  private localeService = inject(LocaleService);
  private identity = inject(CharacterIdentityService);

  private races = this.contentStore.getContent('races');
  private allSubraces = this.contentStore.getContent('subraces');
  private classesContent = this.contentStore.getContent('classes');
  private backgroundsContent = this.contentStore.getContent('backgrounds');
  private allSubclasses = this.contentStore.getContent('subclasses');

  getRaceDescription(): string | null {
    return this.races().find((r: any) => r.id === this.identity.raceId())?.description ?? null;
  }

  getSubraceDescription(): string | null {
    return this.allSubraces().find((s: any) => s.id === this.identity.subraceId())?.description ?? null;
  }

  getClassDescription(): string | null {
    return this.classesContent().find((c: any) => c.id === this.identity.classId())?.description ?? null;
  }

  getSubclassDescription(): string | null {
    return this.allSubclasses().find((s: any) => s.id === this.identity.subclassId())?.description ?? null;
  }

  getBackgroundDescription(): string | null {
    return this.backgroundsContent().find((b: any) => b.id === this.identity.backgroundId())?.description ?? null;
  }

  // Traduce il nome grezzo inglese al nome tradotto dal catalogo (razza/classe/sottoclasse/
  // background). La sottorazza è sempre homebrew (niente content_translations), il nome
  // grezzo è già quello finale.
  getTranslatedRaceName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    return this.races().find((r: any) => r.raw.name === rawName)?.name ?? rawName;
  }

  getTranslatedSubraceName(rawName: string | null | undefined): string {
    return rawName ?? '';
  }

  getTranslatedClassName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    return this.classesContent().find((c: any) => c.raw.name === rawName)?.name ?? rawName;
  }

  getTranslatedSubclassName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    return this.allSubclasses().find((s: any) => s.raw.name === rawName)?.name ?? rawName;
  }

  getTranslatedBackgroundName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    return this.backgroundsContent().find((b: any) => b.raw.name === rawName)?.name ?? rawName;
  }

  // Privilegi e Tratti (tab Generale): a differenza di ability_bonuses/darkvision, i tratti
  // di sottorazza si SOMMANO a quelli della razza invece di sostituirli (sono voci distinte
  // con nome proprio, non un singolo valore).
  raceTraits(): TraitBlock[] {
    return this.races().find((r: any) => r.id === this.identity.raceId())?.raw?.traits ?? [];
  }

  subraceTraits(): TraitBlock[] {
    if (!this.identity.subraceId()) return [];
    return this.allSubraces().find((s: any) => s.id === this.identity.subraceId())?.raw?.traits ?? [];
  }

  backgroundTraits(): TraitBlock[] {
    return this.backgroundsContent().find((b: any) => b.id === this.identity.backgroundId())?.raw?.traits ?? [];
  }

  subclassTraits(): TraitBlock[] {
    if (!this.identity.subclassId()) return [];
    return this.allSubclasses().find((s: any) => s.id === this.identity.subclassId())?.raw?.traits ?? [];
  }

  // Le competenze arrivano come stringhe piatte (homebrew), oggetti SRD con index tipo
  // "skill-insight", o oggetti homebrew più vecchi con solo il nome inglese.
  private toSkillKey(p: any): string {
    if (typeof p === 'string') return p;
    if (p.index) return p.index.replace(/^skill-/, '');
    return (p.name ?? '').toLowerCase().replace(/\s+/g, '_');
  }

  // Competenze concesse da razza, sottorazza o background: automatiche e bloccate.
  // Calcolate al volo dalla razza/sottorazza/background correnti invece che salvate,
  // così cambiandoli si sbloccano/spariscono da sole, senza competenze "orfane" salvate.
  raceSkillKeys(): Set<string> {
    const race = this.races().find((r: any) => r.id === this.identity.raceId());
    return new Set((race?.raw?.skill_proficiencies ?? []).map((p: any) => this.toSkillKey(p)));
  }

  subraceSkillKeys(): Set<string> {
    if (!this.identity.subraceId()) return new Set();
    const subrace = this.allSubraces().find((s: any) => s.id === this.identity.subraceId());
    return new Set((subrace?.raw?.skill_proficiencies ?? []).map((p: any) => this.toSkillKey(p)));
  }

  backgroundSkillKeys(): Set<string> {
    const background = this.backgroundsContent().find((b: any) => b.id === this.identity.backgroundId());
    return new Set((background?.raw?.skill_proficiencies ?? []).map((p: any) => this.toSkillKey(p)));
  }

  isSkillLocked(key: string): boolean {
    return this.raceSkillKeys().has(key) || this.subraceSkillKeys().has(key) || this.backgroundSkillKeys().has(key);
  }

  // Per la scritta "(Razza)"/"(Sottorazza)"/"(Background)" accanto al nome della
  // competenza bloccata nel template: stessa priorità di isSkillLocked sopra.
  skillLockSourceLabel(key: string): string {
    if (this.raceSkillKeys().has(key)) return this.localeService.t('race_label');
    if (this.subraceSkillKeys().has(key)) return this.localeService.t('subrace_label');
    if (this.backgroundSkillKeys().has(key)) return this.localeService.t('background_label');
    return '';
  }

  // Le proficienze arrivano come abbreviazione inglese (es. "STR", "dex"): le traduce nel
  // nome esteso in italiano. "con" (Constitution, SRD) va normalizzato a "cos"
  // (Costituzione): è l'unica delle sei sigle a non coincidere tra inglese e italiano.
  savingThrowNames(proficiencies: string[]): string {
    return proficiencies
      .map((p) => {
        const key = p.toLowerCase();
        return this.localeService.t('ability_' + (key === 'con' ? 'cos' : key));
      })
      .join(', ');
  }
}
