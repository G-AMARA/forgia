import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { calculateArmorClass } from '../../core/armor';
import { unarmoredMovementBonus } from '../../core/unarmored-movement';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterIdentityService } from './character-identity';
import { CharacterPrivilegesService } from './character-privileges';
import { CharacterEquipmentService } from './character-equipment';
import { abilityModifier, proficiencyBonus } from './character-sheet.utils';

// Bozza modificabile di PF/competenze/resistenze (tab Combattimento) + i calcoli derivati
// (CA, velocità, modificatore competenza) che incrociano caratteristiche (identity),
// armatura/scudo (equipment) e competenze bloccate da razza/background (privileges).
@Injectable()
export class CharacterCombatService {
  private characterStore = inject(CharacterStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);
  private identity = inject(CharacterIdentityService);
  private privileges = inject(CharacterPrivilegesService);
  private equipment = inject(CharacterEquipmentService);

  static readonly MAX_SKILL_MASTERY = 2;

  readonly currentHp = signal(0);
  readonly maxHp = signal(0);
  readonly skillProficiencies = signal(new Set<string>());
  // Maestria (Expertise 5e): max 2 competenze tra quelle proficient.
  readonly skillMastery = signal(new Set<string>());
  readonly resistanceProficiencies = signal(new Set<string>());
  // Immunità al danno e alle condizioni: non più modificabili da qui (sostituite dalle
  // checkbox Resistenze), ma tenute in memoria per non perdere un valore già salvato in
  // precedenza quando si preme Salva su questo tab.
  private damageImmunities: string[] = [];
  private conditionImmunities: string[] = [];

  // CA sempre calcolata da armatura scelta (+ scudo se spuntato) e Destrezza corrente: non
  // è più un valore modificabile a mano, così resta automaticamente coerente se la
  // Destrezza cambia. Lo scudo è comunque permesso e si somma separato.
  readonly currentArmorClass = computed(() => {
    const scores = this.identity.abilityScores();
    const dexMod = abilityModifier(scores.dex);
    const armor = this.equipment.selectedArmor();
    const unarmoredAbility = this.equipment.unarmoredDefenseAbility();
    let ac: number;
    if (armor) {
      ac = calculateArmorClass(armor.raw.armor_class, armor.raw.armor_category, dexMod);
    } else if (unarmoredAbility) {
      ac = 10 + dexMod + abilityModifier(scores[unarmoredAbility as keyof typeof scores]);
    } else {
      ac = 10 + dexMod;
    }
    return this.equipment.shieldEquipped() ? ac + 2 : ac;
  });

  // Movimento Senza Armatura (Monaco): bonus per livello configurato per classe in
  // Gestione > Classi, attivo solo senza armatura e senza scudo, sommato alla velocità
  // base della razza.
  readonly totalSpeed = computed(() => {
    const c = this.context.character();
    if (!c) return this.identity.raceSpeed();
    const hasUnarmoredMovement = this.identityClassHasUnarmoredMovement();
    if (!hasUnarmoredMovement || this.equipment.selectedArmor() || this.equipment.shieldEquipped()) {
      return this.identity.raceSpeed();
    }
    return this.identity.raceSpeed() + unarmoredMovementBonus(c.level);
  });

  constructor() {
    effect(() => {
      const c = this.context.character();
      if (c) {
        this.currentHp.set(c.current_hp ?? 0);
        this.maxHp.set(c.max_hp ?? 0);
        this.skillProficiencies.set(new Set(c.skill_proficiencies));
        this.skillMastery.set(new Set(c.skill_mastery));
        this.resistanceProficiencies.set(new Set(c.damage_resistances));
        this.damageImmunities = [...c.damage_immunities];
        this.conditionImmunities = [...c.condition_immunities];
      }
    });
  }

  proficiencyBonus(level: number): number {
    return proficiencyBonus(level);
  }

  toggleSkill(key: string) {
    if (this.privileges.isSkillLocked(key)) return;
    const current = new Set(this.skillProficiencies());
    if (current.has(key)) {
      current.delete(key);
      // Senza competenza non ha senso restare Maestria: la toglie insieme.
      if (this.skillMastery().has(key)) {
        const mastery = new Set(this.skillMastery());
        mastery.delete(key);
        this.skillMastery.set(mastery);
      }
    } else {
      current.add(key);
    }
    this.skillProficiencies.set(current);
  }

  isSkillChecked(key: string): boolean {
    return this.privileges.isSkillLocked(key) || this.skillProficiencies().has(key);
  }

  toggleSkillMastery(key: string) {
    if (!this.isSkillChecked(key)) return;
    const current = new Set(this.skillMastery());
    if (current.has(key)) {
      current.delete(key);
    } else {
      if (current.size >= CharacterCombatService.MAX_SKILL_MASTERY) return;
      current.add(key);
    }
    this.skillMastery.set(current);
  }

  // Richiede comunque la competenza: se il personaggio perde la fonte della competenza
  // (es. viene rimosso il background che la garantiva) la Maestria salvata sparisce con
  // lei invece di restare "orfana" su una competenza non più spuntata.
  isSkillMastered(key: string): boolean {
    return this.isSkillChecked(key) && this.skillMastery().has(key);
  }

  skillMasteryLimitReached(): boolean {
    return this.skillMastery().size >= CharacterCombatService.MAX_SKILL_MASTERY;
  }

  // Modificatore totale di una competenza: modificatore dell'abilità collegata, più il
  // bonus competenza se la casella è spuntata (raddoppiato in caso di Maestria),
  // altrimenti solo il modificatore base.
  skillModifier(ability: string, skillKey: string, level: number): number {
    const scores = this.identity.abilityScores();
    const abilityMod = abilityModifier(scores[ability as keyof typeof scores]);
    if (!this.isSkillChecked(skillKey)) return abilityMod;
    const multiplier = this.isSkillMastered(skillKey) ? 2 : 1;
    return abilityMod + proficiencyBonus(level) * multiplier;
  }

  toggleResistance(key: string) {
    const current = new Set(this.resistanceProficiencies());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.resistanceProficiencies.set(current);
  }

  isResistanceChecked(key: string): boolean {
    return this.resistanceProficiencies().has(key);
  }

  async saveCombat() {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;

    await this.characterStore.updateCombatStats(c.id, {
      currentHp: this.currentHp(),
      maxHp: this.maxHp(),
      armorClass: this.currentArmorClass(),
      equippedArmorId: this.equipment.selectedArmorId() || null,
      shieldEquipped: this.equipment.shieldEquipped(),
      abilityScores: this.identity.abilityScores(),
      skillProficiencies: Array.from(this.skillProficiencies()),
      skillMastery: Array.from(this.skillMastery()),
      damageResistances: Array.from(this.resistanceProficiencies()),
      damageImmunities: this.damageImmunities,
      conditionImmunities: this.conditionImmunities,
    });

    this.equipment.armorModalOpen.set(false);
    this.modal.success(this.localeService.t('saved_message'));
  }

  private identityClassHasUnarmoredMovement(): boolean {
    const c = this.context.character();
    if (!c) return false;
    return this.identity.classesContent().find((cls: any) => cls.id === c.class_id)?.raw?.unarmored_movement ?? false;
  }
}
