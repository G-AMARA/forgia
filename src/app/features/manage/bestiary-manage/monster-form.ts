import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BestiaryMonster, BestiaryStore, TraitBlock } from '../../../core/bestiary-store';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';
import { TraitListEditor } from './trait-list-editor';

type MonsterSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

@Component({
  selector: 'app-monster-form',
  standalone: true,
  imports: [FormsModule, TraitListEditor],
  templateUrl: './monster-form.html',
})
export class MonsterForm implements OnInit {
  private bestiaryStore = inject(BestiaryStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  @Input() editingMonster: BestiaryMonster | null = null;
  @Output() closed = new EventEmitter<void>();

  protected readonly sizes: MonsterSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

  private editingId: string | null = null;

  // 1. Informazioni generali
  name = '';
  size: MonsterSize | '' = '';
  type = '';
  alignment = '';

  // 2. Difesa e movimento
  armorClass = '';
  hitPoints = '';
  speed = '';

  // 3. Caratteristiche, tiri salvezza, abilità
  str: number | null = null;
  dex: number | null = null;
  con: number | null = null;
  intelligence: number | null = null;
  wis: number | null = null;
  cha: number | null = null;
  savingThrows = '';
  skills = '';

  // 4. Resistenze, sensi, lingue
  damageVulnerabilities = '';
  damageResistances = '';
  damageImmunities = '';
  conditionImmunities = '';
  senses = '';
  languages = '';
  challengeRating = '';
  experiencePoints: number | null = null;

  // 5-7. Blocchi ripetibili
  specialTraits: TraitBlock[] = [];
  actions: TraitBlock[] = [];
  bonusActions: TraitBlock[] = [];
  reactions: TraitBlock[] = [];
  legendaryActions: TraitBlock[] = [];
  lairActions: TraitBlock[] = [];
  regionalEffects: TraitBlock[] = [];

  imageUrl: string | null = null;
  imageUploading = signal(false);
  loading = signal(false);

  ngOnInit() {
    if (this.editingMonster) {
      this.startEdit(this.editingMonster);
    }
  }

  private startEdit(monster: BestiaryMonster) {
    this.editingId = monster.id;
    this.name = monster.name;
    this.size = (monster.size as MonsterSize) ?? '';
    this.type = monster.type ?? '';
    this.alignment = monster.alignment ?? '';
    this.armorClass = monster.armor_class ?? '';
    this.hitPoints = monster.hit_points ?? '';
    this.speed = monster.speed ?? '';
    this.str = monster.str;
    this.dex = monster.dex;
    this.con = monster.con;
    this.intelligence = monster.intelligence;
    this.wis = monster.wis;
    this.cha = monster.cha;
    this.savingThrows = monster.saving_throws ?? '';
    this.skills = monster.skills ?? '';
    this.damageVulnerabilities = monster.damage_vulnerabilities ?? '';
    this.damageResistances = monster.damage_resistances ?? '';
    this.damageImmunities = monster.damage_immunities ?? '';
    this.conditionImmunities = monster.condition_immunities ?? '';
    this.senses = monster.senses ?? '';
    this.languages = monster.languages ?? '';
    this.challengeRating = monster.challenge_rating ?? '';
    this.experiencePoints = monster.experience_points;
    this.specialTraits = monster.special_traits ?? [];
    this.actions = monster.actions ?? [];
    this.bonusActions = monster.bonus_actions ?? [];
    this.reactions = monster.reactions ?? [];
    this.legendaryActions = monster.legendary_actions ?? [];
    this.lairActions = monster.lair_actions ?? [];
    this.regionalEffects = monster.regional_effects ?? [];
    this.imageUrl = monster.image_url;
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading.set(true);

    const { error, url } = await this.bestiaryStore.uploadMonsterImage(file);

    if (error) {
      this.modal.error(error.message);
      this.imageUploading.set(false);
      input.value = '';
      return;
    }

    this.imageUrl = url ?? null;
    this.imageUploading.set(false);
    input.value = '';
  }

  cancel() {
    this.closed.emit();
  }

  async submit() {
    if (!this.name.trim()) {
      this.modal.error(this.localeService.t('bestiary_name_label'));
      return;
    }

    this.loading.set(true);

    const payload = {
      name: this.name,
      size: this.size || null,
      type: this.type || null,
      alignment: this.alignment || null,
      armor_class: this.armorClass || null,
      hit_points: this.hitPoints || null,
      speed: this.speed || null,
      str: this.str,
      dex: this.dex,
      con: this.con,
      intelligence: this.intelligence,
      wis: this.wis,
      cha: this.cha,
      saving_throws: this.savingThrows || null,
      skills: this.skills || null,
      damage_vulnerabilities: this.damageVulnerabilities || null,
      damage_resistances: this.damageResistances || null,
      damage_immunities: this.damageImmunities || null,
      condition_immunities: this.conditionImmunities || null,
      senses: this.senses || null,
      languages: this.languages || null,
      challenge_rating: this.challengeRating || null,
      experience_points: this.experiencePoints,
      special_traits: this.specialTraits,
      actions: this.actions,
      bonus_actions: this.bonusActions,
      reactions: this.reactions,
      legendary_actions: this.legendaryActions,
      lair_actions: this.lairActions,
      regional_effects: this.regionalEffects,
      image_url: this.imageUrl,
    };

    const { error } = this.editingId
      ? await this.bestiaryStore.updateMonster(this.editingId, payload)
      : await this.bestiaryStore.createMonster(payload);

    this.loading.set(false);

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.modal.success(this.localeService.t('saved_message'));
    this.closed.emit();
  }
}
