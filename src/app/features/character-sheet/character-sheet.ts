import { Component, inject, signal, computed, effect, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStore } from '../../core/character-store';
import { ContentStore } from '../../core/content-store';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { SKILLS } from '../../core/skills';
import { getClassImagePath } from '../../core/class-images';

type SubTab = 'general' | 'combat' | 'inventory' | 'spells';

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

  // Vero se l'utente loggato non è il proprietario: usato per bloccare ogni modifica
  // quando la scheda si apre dal roster della campagna (vista di un altro personaggio).
  protected readOnly = computed(() => this.character()?.owner_id !== this.auth.user()?.id);

  ngOnInit() {
    if (this.characterId) {
      this.characterStore.loadCharacterById(this.characterId);
    }
  }
  protected skills = SKILLS;
  protected abilityKeys: ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[] = [
    'str', 'dex', 'con', 'int', 'wis', 'cha',
  ];

  activeSubTab = signal<SubTab>('general');

  currentHp = 0;
  maxHp = 0;
  armorClass = 10;
  abilityScores: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  skillProficiencies = new Set<string>();
  damageResistancesText = '';
  damageImmunitiesText = '';
  conditionImmunitiesText = '';
  backstory = '';

  private allEquipment = this.contentStore.getContent('equipment');
  private allSpells = this.contentStore.getContent('spells');

  selectedEquipmentId = '';
  addQuantity = 1;
  selectedSpellIdToAdd = '';

  savedMsg = signal<string | null>(null);
  avatarError = signal<string | null>(null);
  avatarUploading = signal(false);

  constructor() {
    effect(() => {
      const c = this.character();
      if (c) {
        this.currentHp = c.current_hp ?? 0;
        this.maxHp = c.max_hp ?? 0;
        this.armorClass = c.armor_class ?? 10;
        this.abilityScores = { ...c.ability_scores };
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

  async saveCombat() {
    const c = this.character();
    if (!c || this.readOnly()) return;

    await this.characterStore.updateCombatStats(c.id, {
      currentHp: this.currentHp,
      maxHp: this.maxHp,
      armorClass: this.armorClass,
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

  availableEquipment = computed(() => this.allEquipment());

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

  availableClassSpells = computed(() => {
    const c = this.character();
    if (!c || !c.class_name) return [];
    return this.allSpells().filter((spell: any) =>
      (spell.raw.classes ?? []).some((cn: any) => cn.name === c.class_name)
    );
  });

  async addSpell() {
    const c = this.character();
    if (!c || !this.selectedSpellIdToAdd || this.readOnly()) return;
    this.actionError.set(null);
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
