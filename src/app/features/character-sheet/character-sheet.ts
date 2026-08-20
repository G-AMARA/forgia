import { Component, inject, signal, computed, effect, Input, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStore } from '../../core/character-store';
import { ContentStore, normalizeAbilityBonuses } from '../../core/content-store';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { SKILLS } from '../../core/skills';
import { DAMAGE_TYPES } from '../../core/damage-types';
import { getClassImagePath } from '../../core/class-images';
import { getStatLabelImagePath } from '../../core/ability-images';
import { getCoinImagePath } from '../../core/coin-images';
import { getSpellcastingInfo } from '../../core/spellcasting';
import { calculateArmorClass } from '../../core/armor';
import { unarmoredMovementBonus } from '../../core/unarmored-movement';
import { translateSpellSchool } from '../../core/spell-schools';
import { getSpellLevelTheme, type SpellLevelTheme } from '../../core/spell-level-theme';
import { getXpProgress } from '../../core/xp-progression';
import { TraitBlock } from '../../core/bestiary-store';
import { Card } from '../../shared/card/card';
import { SpellLevelSeal } from '../../shared/spell-level-seal/spell-level-seal';
import { SpellSchoolIcon } from '../../shared/spell-school-icon/spell-school-icon';
import { DamageTypeIcon } from '../../shared/damage-type-icon/damage-type-icon';

type SubTab = 'general' | 'combat' | 'inventory' | 'spells' | 'weapons' | 'diary';

// Stesso pattern lazy di bestiary.ts: import dinamico (genera il chunk separato
// "swiper-element-bundle" invece di gonfiare il bundle iniziale) + flag anti-doppia-
// registrazione (customElements.define lancia se richiamato due volte sullo stesso tag).
let swiperRegistered: Promise<void> | null = null;
function ensureSwiperRegistered(): Promise<void> {
  if (!swiperRegistered) {
    swiperRegistered = import('swiper/element/bundle').then(({ register }) => register());
  }
  return swiperRegistered;
}

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [FormsModule, Card, SpellLevelSeal, SpellSchoolIcon, DamageTypeIcon],
  templateUrl: './character-sheet.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // richiesto da <swiper-container>/<swiper-slide> nel tab Taccuino
})
export class CharacterSheet implements OnInit {
  protected characterStore = inject(CharacterStore);
  private contentStore = inject(ContentStore);
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  // Se valorizzato (es. dalla rotta /scheda-personaggio/:id), la scheda mostra
  // quel personaggio specifico invece del personaggio dell'utente loggato
  // nella campagna attiva.
  @Input() characterId?: string;

  protected character = computed(() =>
    this.characterId ? this.characterStore.selectedCharacter() : this.characterStore.myCharacter()
  );

  protected classImagePath = computed(() =>
    getClassImagePath(this.character()?.class_name, this.character()?.sex)
  );
  protected getStatLabelImagePath = getStatLabelImagePath;
  protected getCoinImagePath = getCoinImagePath;
  // Illustrazione di sfondo del "libro" dettagli arma (tab Armi): cornice dorata + doppia
  // pagina, vedi .book-container in tailwind.css.
  protected weaponBookImage = 'themes/LIBRO.png';

  // Progresso XP verso il prossimo livello, per la barra nel banner: ricalcolato da
  // level + experience_points del personaggio corrente (soglie standard SRD).
  protected xpProgress = computed(() => {
    const c = this.character();
    if (!c) return null;
    return getXpProgress(c.level, c.experience_points);
  });

  // Vero se l'utente loggato non è il proprietario né un admin: usato per bloccare ogni
  // modifica quando la scheda si apre dal roster della campagna (vista di un altro
  // personaggio). Gli admin possono editare le schede di chiunque (vedi profiles.is_admin).
  protected readOnly = computed(() =>
    this.character()?.owner_id !== this.auth.user()?.id && !this.auth.isAdmin()
  );

  ngOnInit() {
    ensureSwiperRegistered();
    // Ricarica sempre all'apertura della scheda (non solo al cambio di campagna, l'unico
    // altro momento in cui CharacterStore la aggiorna da solo): senza, un rinominare razza/
    // sottoclasse/background/ecc. da Gestione mentre la campagna resta la stessa non si
    // vedrebbe finché non si ricarica l'intera pagina.
    if (this.characterId) {
      this.characterStore.loadCharacterById(this.characterId);
    } else {
      this.characterStore.loadMyCharacter();
    }
  }
  protected skills = SKILLS;
  // Competenze divise in 3 colonne contigue (lette dall'alto in basso per colonna, poi si
  // passa alla successiva): serve nel tab Abilità per i separatori orizzontali "per colonna"
  // (divide-y su ogni colonna), che altrimenti con un'unica griglia row-first taglierebbero
  // trasversalmente tutte e tre le colonne invece di restare dentro ciascuna.
  protected skillColumns = this.chunkIntoColumns(SKILLS, 3);
  // Stessa idea di skillColumns, per i 13 tipi di danno delle Resistenze.
  protected resistanceColumns = this.chunkIntoColumns(DAMAGE_TYPES, 3);
  protected abilityKeys: ('str' | 'dex' | 'cos' | 'int' | 'wis' | 'cha')[] = [
    'str', 'dex', 'cos', 'int', 'wis', 'cha',
  ];

  private chunkIntoColumns<T>(items: T[], columns: number): T[][] {
    const perColumn = Math.ceil(items.length / columns);
    return Array.from({ length: columns }, (_, i) => items.slice(i * perColumn, (i + 1) * perColumn));
  }

  activeSubTab = signal<SubTab>('general');

  // Tab interna della card "Privilegi e Tratti": razziali (razza + sottorazza) vs background.
  privilegesTab = signal<'racial' | 'subclass' | 'background'>('racial');

  currentHp = 0;
  maxHp = 0;
  copper = 0;
  silver = 0;
  electrum = 0;
  gold = 0;
  platinum = 0;
  selectedArmorId = '';
  shieldEquipped = false;
  selectedMountId = '';
  abilityScores: Record<string, number> = { str: 10, dex: 10, cos: 10, int: 10, wis: 10, cha: 10 };
  skillProficiencies = new Set<string>();
  // Maestria (Expertise 5e): max 2 competenze tra quelle proficient, vedi toggleSkillMastery.
  skillMastery = new Set<string>();
  resistanceProficiencies = new Set<string>();
  // Immunità al danno e alle condizioni: non più modificabili da qui (sostituite dalle
  // checkbox Resistenze), ma tenute in memoria per non perdere un valore già salvato in
  // precedenza quando si preme Salva su questo tab (vedi saveCombat()).
  damageImmunitiesText = '';
  conditionImmunitiesText = '';
  backstory = '';

  private allEquipment = this.contentStore.getContent('equipment');
  private allSpells = this.contentStore.getContent('spells');
  protected races = this.contentStore.getContent('races');
  private allSubraces = this.contentStore.getContent('subraces');
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
  identitySubraceId = '';
  identityClassId = '';
  identitySubclassId = '';
  identityBackgroundId = '';
  identityAlignment = 'true_neutral';
  identityXp = 0;
  identitySex: 'M' | 'F' = 'M';

  // Bonus attualmente "cotto" dentro abilityScores (sempre razziale/sottorazza): serve a
  // calcolare la differenza esatta da applicare quando razza/sottorazza cambiano.
  appliedBonus: Record<string, number> = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  // Punti "a scelta libera" concessi da razza/sottorazza (es. Umano Variante, Draconide
  // Cromatico), ricostruiti da applied_bonus al caricamento (vedi effect() sotto).
  freeBonuses: Record<string, number> = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };

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

  // Sottorazze disponibili per la razza scelta. Stesso pattern metodo di availableSubclasses().
  availableSubraces(): any[] {
    if (!this.identityRaceId) return [];
    return this.allSubraces().filter((sub: any) => sub.raw.race_id === this.identityRaceId);
  }

  onIdentityRaceChange(raceId: string) {
    this.identityRaceId = raceId;
    this.identitySubraceId = '';
    this.freeBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  }

  onIdentitySubraceChange(subraceId: string) {
    this.identitySubraceId = subraceId;
    this.freeBonuses = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0 };
  }

  selectedEquipmentId = '';
  addQuantity = 1;
  // Quantità da rimuovere per ogni riga d'inventario, tenuta per rowId perché ogni
  // oggetto ha il proprio input accanto al bottone Rimuovi (default 1 finché non toccato).
  private removeQuantities: Record<string, number> = {};
  selectedSpellIdToAdd = '';
  spellSearchTerm = signal('');
  spellFilterSchool = signal('');
  spellFilterLevel = signal('');

  avatarUploading = signal(false);

  // Controlla la modale di modifica identità (tab Generale): i campi restano quelli
  // esistenti (identityName, identityRaceId, ...), la modale è solo un contenitore.
  identityModalOpen = signal(false);

  // Popola i campi identità modificabili a partire dal personaggio salvato: usato sia
  // al caricamento (effect sotto) sia per annullare le modifiche in corso quando si
  // chiude la modale senza salvare (i campi sono ngModel semplici, non si auto-ripristinano).
  private resetIdentityFields(c: ReturnType<typeof this.character>) {
    if (!c) return;
    this.identityName = c.name;
    this.identityLevel = c.level;
    this.identityRaceId = c.race_id ?? '';
    this.identitySubraceId = c.subrace_id ?? '';
    this.identityClassId = c.class_id ?? '';
    this.identitySubclassId = c.subclass_id ?? '';
    this.identityBackgroundId = c.background_id ?? '';
    this.identityAlignment = c.alignment ?? 'true_neutral';
    this.identityXp = c.experience_points;
    this.identitySex = c.sex ?? 'M';
    // Punteggi caratteristica: modificabili anche dalla modale identità (non solo dal tab
    // Abilità), quindi vanno ripristinati qui se l'utente annulla senza salvare.
    this.abilityScores = { ...c.ability_scores };
    // Ricostruisce la quota "a scelta libera" per differenza rispetto ai bonus fissi di
    // razza/sottorazza: applied_bonus contiene solo il totale, non la distribuzione scelta.
    this.freeBonuses = Object.fromEntries(
      this.abilityKeys.map((key) => [
        key,
        Math.max(0, (c.applied_bonus[key] ?? 0) - this.getRaceOrSubraceBonus(key)),
      ])
    );
  }

  openIdentityModal() {
    this.identityModalOpen.set(true);
  }

  cancelIdentityEdit() {
    this.resetIdentityFields(this.character());
    this.identityModalOpen.set(false);
  }

  // Stessa idea di identityModalOpen/resetIdentityFields, per la modale di modifica
  // dell'armatura indossata (tab Equipaggiamento).
  armorModalOpen = signal(false);

  private resetArmorFields(c: ReturnType<typeof this.character>) {
    if (!c) return;
    this.selectedArmorId = c.equipped_armor_id ?? '';
    this.shieldEquipped = c.shield_equipped;
  }

  openArmorModal() {
    this.armorModalOpen.set(true);
  }

  cancelArmorEdit() {
    this.resetArmorFields(this.character());
    this.armorModalOpen.set(false);
  }

  // Stessa idea di armorModalOpen/resetArmorFields, per la modale di modifica della
  // cavalcatura/veicolo posseduto (tab Equipaggiamento).
  mountModalOpen = signal(false);

  private resetMountFields(c: ReturnType<typeof this.character>) {
    if (!c) return;
    this.selectedMountId = c.mount_equipment_id ?? '';
  }

  openMountModal() {
    this.mountModalOpen.set(true);
  }

  cancelMountEdit() {
    this.resetMountFields(this.character());
    this.mountModalOpen.set(false);
  }

  constructor() {
    effect(() => {
      const c = this.character();
      if (c) {
        this.resetIdentityFields(c);
        this.currentHp = c.current_hp ?? 0;
        this.maxHp = c.max_hp ?? 0;
        this.copper = c.copper ?? 0;
        this.silver = c.silver ?? 0;
        this.electrum = c.electrum ?? 0;
        this.gold = c.gold ?? 0;
        this.platinum = c.platinum ?? 0;
        this.resetArmorFields(c);
        this.resetMountFields(c);
        this.appliedBonus = { str: 0, dex: 0, cos: 0, int: 0, wis: 0, cha: 0, ...c.applied_bonus };
        this.skillProficiencies = new Set(c.skill_proficiencies);
        this.skillMastery = new Set(c.skill_mastery);
        this.resistanceProficiencies = new Set(c.damage_resistances);
        this.damageImmunitiesText = c.damage_immunities.join(', ');
        this.conditionImmunitiesText = c.condition_immunities.join(', ');
        this.backstory = c.notes ?? '';
      }
    });
  }

  setSubTab(tab: SubTab) {
    this.activeSubTab.set(tab);
    // Caricato a parte (non in FULL_CHARACTER_SELECT, vedi CharacterStore.loadDiaryEntries):
    // niente da fare finché il tab non si apre davvero.
    const c = this.character();
    if (tab === 'diary' && c) {
      this.characterStore.loadDiaryEntries(c.id);
    }
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

  // Voce del catalogo per l'armatura attualmente selezionata: usata per mostrarne
  // l'immagine (raw.image_url, caricata in Gestione > Equipaggiamento) sotto il select.
  selectedArmor(): any {
    return this.availableArmors().find((a: any) => a.id === this.selectedArmorId);
  }

  // Cavalcature e veicoli dal catalogo: is_mount_or_vehicle esclude gli accessori che
  // condividono lo stesso type SRD 'Mounts and Vehicles' (bardature, selle, bisacce da
  // sella, morso e briglia, stallaggio), quelli restano equipaggiamento generico.
  availableMounts(): any[] {
    return this.allEquipment().filter(
      (e: any) => e.raw.type === 'Mounts and Vehicles' && e.raw.is_mount_or_vehicle === true
    );
  }

  selectedMount(): any {
    return this.availableMounts().find((m: any) => m.id === this.selectedMountId);
  }

  // Peso complessivo: armatura indossata + solo gli oggetti d'inventario spuntati come
  // equipaggiati (quantità incluse), non l'intero inventario, + tutte le armi portate
  // (niente flag "equipaggiata" per le armi, si contano tutte). weight è già in kg così
  // com'è in DB (i form di Gestione lo chiedono esplicitamente in kg, "Peso (kg)"):
  // nessuna conversione qui.
  totalCarriedWeightKg(): string {
    const c = this.character();
    if (!c) return '0.0';
    const armorWeight = this.selectedArmor()?.raw?.weight ?? 0;
    const equippedWeight = c.inventory
      .filter((item) => item.equipped)
      .reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const weaponsWeight = c.weapons.reduce((sum, w) => sum + (w.weight ?? 0) * w.quantity, 0);
    return (armorWeight + equippedWeight + weaponsWeight).toFixed(1);
  }

  // Difesa Senza Armatura (Barbaro: Cos, Monaco: Sag, ecc.): quale caratteristica extra si
  // somma a Destrezza quando la classe non indossa armatura, configurato per classe in
  // Gestione > Classi (classes.unarmored_defense_ability) invece che dedotto dal nome della
  // classe — il nome è testo libero modificabile in Gestione, quindi non è un identificatore
  // stabile su cui riconoscere "è il Barbaro" (bug osservato: rinominato "Barbaro", il
  // confronto con la stringa inglese "Barbarian" smetteva di corrispondere).
  private unarmoredDefenseAbility(): string | null {
    const c = this.character();
    if (!c || !c.class_id) return null;
    return this.classesContent().find((cls: any) => cls.id === c.class_id)?.raw
      ?.unarmored_defense_ability ?? null;
  }

  // CA sempre calcolata da armatura scelta (+ scudo se spuntato) e Destrezza corrente: non è più
  // un valore modificabile a mano, così resta automaticamente coerente se la Destrezza cambia.
  // Non si cumula con altri calcoli alternativi: è un semplice if/else, non un cumulo di bonus.
  // Lo scudo è comunque permesso e si somma separato, come per chiunque altro.
  currentArmorClass(): number {
    const dexMod = this.abilityModifier(this.abilityScores['dex']);
    const armor = this.allEquipment().find((e: any) => e.id === this.selectedArmorId);
    const unarmoredAbility = this.unarmoredDefenseAbility();
    let ac: number;
    if (armor) {
      ac = calculateArmorClass(armor.raw.armor_class, armor.raw.armor_category, dexMod);
    } else if (unarmoredAbility) {
      ac = 10 + dexMod + this.abilityModifier(this.abilityScores[unarmoredAbility]);
    } else {
      ac = 10 + dexMod;
    }
    if (this.shieldEquipped) ac += 2;
    return ac;
  }

  // Tema cromatico per livello incantesimo (bordo, sigillo, icona scuola, glow hover
  // delle card): centralizzato in core/spell-level-theme, non più una mappa locale.
  spellLevelTheme(level: number): SpellLevelTheme {
    return getSpellLevelTheme(level);
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
    if (this.isSkillLocked(key)) return;
    const current = new Set(this.skillProficiencies);
    if (current.has(key)) {
      current.delete(key);
      // Senza competenza non ha senso restare Maestria: la toglie insieme.
      if (this.skillMastery.has(key)) {
        const mastery = new Set(this.skillMastery);
        mastery.delete(key);
        this.skillMastery = mastery;
      }
    } else {
      current.add(key);
    }
    this.skillProficiencies = current;
  }

  isSkillChecked(key: string): boolean {
    return this.isSkillLocked(key) || this.skillProficiencies.has(key);
  }

  // Maestria (Expertise 5e): raddoppia il bonus competenza, al massimo su 2 competenze tra
  // quelle in cui si è già competenti (qualunque sia la fonte: libera, background, classe).
  // Non esclusiva del Ladro nelle regole 5e (Bardo e alcune sottoclassi la hanno), quindi
  // disponibile per qualunque personaggio invece che ristretta a una classe specifica.
  static readonly MAX_SKILL_MASTERY = 2;

  toggleSkillMastery(key: string) {
    if (!this.isSkillChecked(key)) return;
    const current = new Set(this.skillMastery);
    if (current.has(key)) {
      current.delete(key);
    } else {
      if (current.size >= CharacterSheet.MAX_SKILL_MASTERY) return;
      current.add(key);
    }
    this.skillMastery = current;
  }

  // Richiede comunque la competenza: se il personaggio perde la fonte della competenza
  // (es. viene rimosso il background che la garantiva) la Maestria salvata sparisce con lei
  // invece di restare "orfana" su una competenza non più spuntata.
  isSkillMastered(key: string): boolean {
    return this.isSkillChecked(key) && this.skillMastery.has(key);
  }

  skillMasteryLimitReached(): boolean {
    return this.skillMastery.size >= CharacterSheet.MAX_SKILL_MASTERY;
  }

  // Le competenze arrivano come stringhe piatte (homebrew), oggetti SRD con index tipo
  // "skill-insight", o oggetti homebrew più vecchi con solo il nome inglese (stessa logica
  // di background-create.ts).
  private toSkillKey(p: any): string {
    if (typeof p === 'string') return p;
    if (p.index) return p.index.replace(/^skill-/, '');
    return (p.name ?? '').toLowerCase().replace(/\s+/g, '_');
  }

  // Competenze concesse da razza, sottorazza o background: automatiche e bloccate (vedi
  // toggleSkill/isSkillChecked sopra). Calcolate al volo dalla razza/sottorazza/background
  // correnti invece che salvate in skill_proficiencies, così cambiandoli si sbloccano/
  // spariscono da sole, senza lasciare competenze "orfane" salvate.
  raceSkillKeys(): Set<string> {
    const race = this.races().find((r: any) => r.id === this.identityRaceId);
    const proficiencies = race?.raw?.skill_proficiencies ?? [];
    return new Set(proficiencies.map((p: any) => this.toSkillKey(p)));
  }

  subraceSkillKeys(): Set<string> {
    if (!this.identitySubraceId) return new Set();
    const subrace = this.allSubraces().find((s: any) => s.id === this.identitySubraceId);
    const proficiencies = subrace?.raw?.skill_proficiencies ?? [];
    return new Set(proficiencies.map((p: any) => this.toSkillKey(p)));
  }

  backgroundSkillKeys(): Set<string> {
    const background = this.backgroundsContent().find((b: any) => b.id === this.identityBackgroundId);
    const proficiencies = background?.raw?.skill_proficiencies ?? [];
    return new Set(proficiencies.map((p: any) => this.toSkillKey(p)));
  }

  isSkillLocked(key: string): boolean {
    return this.raceSkillKeys().has(key) || this.subraceSkillKeys().has(key) || this.backgroundSkillKeys().has(key);
  }

  // Per la scritta "(Razza)"/"(Sottorazza)"/"(Background)" accanto al nome della competenza
  // bloccata nel template: stessa priorità di isSkillLocked sopra.
  skillLockSourceLabel(key: string): string {
    if (this.raceSkillKeys().has(key)) return this.localeService.t('race_label');
    if (this.subraceSkillKeys().has(key)) return this.localeService.t('subrace_label');
    if (this.backgroundSkillKeys().has(key)) return this.localeService.t('background_label');
    return '';
  }

  // Modificatore totale di una competenza: modificatore dell'abilità collegata, più il
  // bonus competenza se la casella è spuntata (raddoppiato in caso di Maestria), altrimenti
  // solo il modificatore base.
  skillModifier(ability: string, skillKey: string, level: number): number {
    const abilityMod = this.abilityModifier(this.abilityScores[ability]);
    if (!this.isSkillChecked(skillKey)) return abilityMod;
    const multiplier = this.isSkillMastered(skillKey) ? 2 : 1;
    return abilityMod + this.proficiencyBonus(level) * multiplier;
  }

  toggleResistance(key: string) {
    const current = new Set(this.resistanceProficiencies);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.resistanceProficiencies = current;
  }

  isResistanceChecked(key: string): boolean {
    return this.resistanceProficiencies.has(key);
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

  getSubraceDescription(): string | null {
    return this.allSubraces().find((s: any) => s.id === this.identitySubraceId)?.description ?? null;
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

  // La sottorazza è sempre homebrew (niente content_translations), il nome grezzo è già quello finale.
  getTranslatedSubraceName(rawName: string | null | undefined): string {
    return rawName ?? '';
  }

  // Traduce il nome grezzo inglese del background al nome tradotto dal catalogo.
  getTranslatedBackgroundName(rawName: string | null | undefined): string {
    if (!rawName) return '';
    const bg = this.backgroundsContent().find((b: any) => b.raw.name === rawName);
    return bg?.name ?? rawName;
  }

  // Le proficienze arrivano come abbreviazione inglese (es. "STR", "dex", a seconda
  // che la classe sia dall'SRD o homebrew): le traduce nel nome esteso in italiano. "con"
  // (Constitution, SRD) va normalizzato a "cos" (Costituzione): è l'unica delle sei sigle
  // a non coincidere tra inglese e italiano, le altre cinque sono uguali per coincidenza.
  savingThrowNames(proficiencies: string[]): string {
    return proficiencies
      .map((p) => {
        const key = p.toLowerCase();
        return this.localeService.t('ability_' + (key === 'con' ? 'cos' : key));
      })
      .join(', ');
  }

  // Bonus razziale: fisso, definito dalla razza scelta (gestito in Gestione > Razze).
  getRaceBonus(key: keyof typeof this.abilityScores): number {
    const race = this.races().find((r: any) => r.id === this.identityRaceId);
    return normalizeAbilityBonuses(race?.raw?.ability_bonuses)[key] ?? 0;
  }

  // Bonus di sottorazza: SOSTITUISCE quello della razza madre (non regole 5e standard, scelta
  // di design del progetto: la sottorazza scelta è l'unica fonte di bonus caratteristica).
  getSubraceBonus(key: keyof typeof this.abilityScores): number {
    const subrace = this.allSubraces().find((s: any) => s.id === this.identitySubraceId);
    return normalizeAbilityBonuses(subrace?.raw?.ability_bonuses)[key] ?? 0;
  }

  // Bonus caratteristica effettivo: se è selezionata una sottorazza, conta solo il suo bonus;
  // altrimenti quello della razza. Non si sommano mai i due.
  getRaceOrSubraceBonus(key: keyof typeof this.abilityScores): number {
    return this.identitySubraceId ? this.getSubraceBonus(key) : this.getRaceBonus(key);
  }

  // Riepilogo compatto del bonus razziale per il pannello informazioni (es. "+2 DES, +1 CAR"),
  // per non dover ripetere l'intera griglia caratteristica per caratteristica fuori dalla modale.
  racialBonusSummary(): string {
    const parts = this.abilityKeys
      .filter((k) => this.getRaceOrSubraceBonus(k) > 0)
      .map((k) => `+${this.getRaceOrSubraceBonus(k)} ${this.localeService.t('ability_' + k)}`);
    return parts.join(', ') || '—';
  }

  // Scurovisione: tratto della razza, sostituito da quello della sottorazza se selezionata
  // (stessa logica "non cumulativa" di getRaceOrSubraceBonus). Si imposta in Gestione >
  // Razze/Sottorazze, qui è di sola lettura.
  hasDarkvision(): boolean {
    if (this.identitySubraceId) {
      return this.allSubraces().find((s: any) => s.id === this.identitySubraceId)?.raw?.darkvision ?? false;
    }
    return this.races().find((r: any) => r.id === this.identityRaceId)?.raw?.darkvision ?? false;
  }

  // Velocità: tratto della razza (le sottorazze non la sovrascrivono, a differenza di
  // bonus caratteristica e scurovisione).
  raceSpeed(): number {
    return this.races().find((r: any) => r.id === this.identityRaceId)?.raw?.speed ?? 0;
  }

  // Movimento Senza Armatura (Monaco): bonus per livello configurato per classe in Gestione >
  // Classi (classes.unarmored_movement, stesso motivo di unarmoredDefenseAbility più sotto:
  // il nome della classe non è un identificatore stabile), attivo solo senza armatura e
  // senza scudo, sommato alla velocità base della razza.
  totalSpeed(): number {
    const c = this.character();
    if (!c) return this.raceSpeed();
    const hasUnarmoredMovement =
      this.classesContent().find((cls: any) => cls.id === c.class_id)?.raw?.unarmored_movement ?? false;
    const armor = this.allEquipment().find((e: any) => e.id === this.selectedArmorId);
    if (!hasUnarmoredMovement || armor || this.shieldEquipped) return this.raceSpeed();
    return this.raceSpeed() + unarmoredMovementBonus(c.level);
  }

  // Privilegi e Tratti (tab Generale): a differenza di ability_bonuses/darkvision, i tratti
  // di sottorazza si SOMMANO a quelli della razza invece di sostituirli (sono voci distinte
  // con nome proprio, non un singolo valore) — per questo restano due liste separate invece
  // di un'unica getRaceOrSubraceX().
  raceTraits(): TraitBlock[] {
    return this.races().find((r: any) => r.id === this.identityRaceId)?.raw?.traits ?? [];
  }

  subraceTraits(): TraitBlock[] {
    if (!this.identitySubraceId) return [];
    return this.allSubraces().find((s: any) => s.id === this.identitySubraceId)?.raw?.traits ?? [];
  }

  backgroundTraits(): TraitBlock[] {
    return this.backgroundsContent().find((b: any) => b.id === this.identityBackgroundId)?.raw?.traits ?? [];
  }

  subclassTraits(): TraitBlock[] {
    if (!this.identitySubclassId) return [];
    return this.allSubclasses().find((s: any) => s.id === this.identitySubclassId)?.raw?.traits ?? [];
  }

  // Monte punti "a scelta libera": della sottorazza se selezionata, altrimenti della razza
  // (mai sommati, stessa logica di getRaceOrSubraceBonus). Stesso pattern metodo (non computed)
  // di availableSubraces(): identityRaceId/identitySubraceId sono ngModel.
  freeBonusPoints(): number {
    const race = this.races().find((r: any) => r.id === this.identityRaceId);
    const subrace = this.allSubraces().find((s: any) => s.id === this.identitySubraceId);
    return this.identitySubraceId
      ? (subrace?.raw?.free_bonus_points ?? 0)
      : (race?.raw?.free_bonus_points ?? 0);
  }

  freeBonusPerAbilityMax(): number {
    const race = this.races().find((r: any) => r.id === this.identityRaceId);
    const subrace = this.allSubraces().find((s: any) => s.id === this.identitySubraceId);
    return this.identitySubraceId
      ? (subrace?.raw?.free_bonus_max_per_ability ?? 0)
      : (race?.raw?.free_bonus_max_per_ability ?? 0);
  }

  freeBonusTotal(): number {
    return this.abilityKeys.reduce((sum, k) => sum + this.freeBonuses[k], 0);
  }

  freeBonusRemaining(): number {
    return this.freeBonusPoints() - this.freeBonusTotal();
  }

  maxFreeBonus(key: keyof typeof this.abilityScores): number {
    return Math.min(this.freeBonusPerAbilityMax(), this.freeBonuses[key] + this.freeBonusRemaining());
  }

  setFreeBonus(key: keyof typeof this.abilityScores, value: number) {
    let next = Math.max(0, Math.min(this.freeBonusPerAbilityMax(), Math.floor(value) || 0));
    const othersSum = this.abilityKeys
      .filter((k) => k !== key)
      .reduce((sum, k) => sum + this.freeBonuses[k], 0);
    if (othersSum + next > this.freeBonusPoints()) {
      next = Math.max(0, this.freeBonusPoints() - othersSum);
    }
    this.freeBonuses[key] = next;
  }

  // Bonus caratteristica: sempre e solo da razza/sottorazza (più l'eventuale quota "a scelta
  // libera"). Il background non concede più bonus caratteristica.
  getAppliedBonus(key: keyof typeof this.abilityScores): number {
    return this.getRaceOrSubraceBonus(key) + this.freeBonuses[key];
  }

  async saveIdentity() {
    const c = this.character();
    if (!c || this.readOnly()) return;

    // Rimuove dagli ability_scores il bonus applicato in precedenza e vi somma
    // quello nuovo (razza/sottorazza): così le statistiche restano coerenti
    // quando razza o sottorazza cambiano.
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
      subraceId: this.identitySubraceId || null,
      classId: this.identityClassId,
      subclassId: this.identitySubclassId || null,
      backgroundId: this.identityBackgroundId || null,
      alignment: this.identityAlignment,
      experiencePoints: this.identityXp,
      abilityScores: newAbilityScores,
      appliedBonus: newAppliedBonus,
      sex: this.identitySex,
    });

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.identityModalOpen.set(false);
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
      skillMastery: Array.from(this.skillMastery),
      damageResistances: Array.from(this.resistanceProficiencies),
      damageImmunities: this.splitList(this.damageImmunitiesText),
      conditionImmunities: this.splitList(this.conditionImmunitiesText),
    });

    this.armorModalOpen.set(false);
    this.showSaved();
  }

  async saveMount() {
    const c = this.character();
    if (!c || this.readOnly()) return;

    const { error } = await this.characterStore.updateMount(c.id, this.selectedMountId || null);
    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.mountModalOpen.set(false);
    this.showSaved();
  }

  async saveBackstory() {
    const c = this.character();
    if (!c || this.readOnly()) return;
    await this.characterStore.updateNotes(c.id, this.backstory);
    this.showSaved();
  }

  // Taccuino: ogni riga è una pagina a sé con la propria data (entry_date), modificabile
  // in fase di scrittura invece che dedotta automaticamente da created_at — così si può
  // annotare oggi un evento datato qualche sessione fa. characterStore.diaryEntries arriva
  // già ordinato per entry_date desc dalla query (vedi loadDiaryEntries).
  private todayDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  newDiaryEntryText = '';
  newDiaryEntryDate = this.todayDateString();
  newDiaryEntryTitle = '';
  // Non null mentre si modifica una pagina già scritta (vedi startEditDiaryEntry): in
  // quel caso submitDiaryEntry() aggiorna quella riga invece di crearne una nuova.
  editingDiaryEntryId: string | null = null;

  protected diaryPages = computed(() => {
    const locale = this.localeService.locale() === 'it' ? 'it-IT' : 'en-US';
    return this.characterStore.diaryEntries().map((entry) => {
      // Parsing manuale (non new Date(entry.entry_date) diretto) per evitare che la data
      // "YYYY-MM-DD" venga letta come UTC e scali di un giorno nei fusi orari negativi.
      const [y, m, d] = entry.entry_date.split('-').map(Number);
      const dateLabel = new Date(y, m - 1, d).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return { id: entry.id, content: entry.content, title: entry.title, dateLabel, rawDate: entry.entry_date };
    });
  });

  async submitDiaryEntry() {
    const c = this.character();
    const text = this.newDiaryEntryText.trim();
    if (!c || this.readOnly() || !text || !this.newDiaryEntryDate) return;

    const title = this.newDiaryEntryTitle.trim() || null;
    const { error } = this.editingDiaryEntryId
      ? await this.characterStore.updateDiaryEntry(c.id, this.editingDiaryEntryId, text, this.newDiaryEntryDate, title)
      : await this.characterStore.addDiaryEntry(c.id, text, this.newDiaryEntryDate, title);

    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.newDiaryEntryText = '';
    this.newDiaryEntryDate = this.todayDateString();
    this.newDiaryEntryTitle = '';
    this.editingDiaryEntryId = null;
  }

  startEditDiaryEntry(page: { id: string; content: string; title: string | null; rawDate: string }) {
    if (this.readOnly()) return;
    this.editingDiaryEntryId = page.id;
    this.newDiaryEntryDate = page.rawDate;
    this.newDiaryEntryTitle = page.title ?? '';
    this.newDiaryEntryText = page.content;
  }

  cancelEditDiaryEntry() {
    this.editingDiaryEntryId = null;
    this.newDiaryEntryDate = this.todayDateString();
    this.newDiaryEntryTitle = '';
    this.newDiaryEntryText = '';
  }

  async deleteDiaryEntry(entryId: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;

    const confirmed = await this.modal.confirm(this.localeService.t('confirm_delete_diary_entry'));
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteDiaryEntry(c.id, entryId);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    // Se si stava modificando proprio la pagina appena eliminata, il form torna pulito.
    if (this.editingDiaryEntryId === entryId) this.cancelEditDiaryEntry();
  }

  async saveCurrency() {
    const c = this.character();
    if (!c || this.readOnly()) return;
    await this.characterStore.updateCurrency(c.id, {
      copper: this.copper,
      silver: this.silver,
      electrum: this.electrum,
      gold: this.gold,
      platinum: this.platinum,
    });
    this.showSaved();
  }

  private splitList(text: string): string[] {
    return text.split(',').map((s) => s.trim()).filter(Boolean);
  }

  private showSaved() {
    this.modal.success(this.localeService.t('saved_message'));
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const c = this.character();
    const userId = this.auth.user()?.id;
    if (!file || !c || !userId || this.readOnly()) return;

    this.avatarUploading.set(true);

    const { error } = await this.characterStore.uploadAvatar(c.id, userId, file);

    if (error) {
      this.modal.error(error.message);
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

  async addItem() {
    const c = this.character();
    if (!c || !this.selectedEquipmentId || this.readOnly()) return;
    const { error } = await this.characterStore.addInventoryItem(c.id, this.selectedEquipmentId, this.addQuantity);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.selectedEquipmentId = '';
    this.addQuantity = 1;
  }

  removeQty(rowId: string): number {
    return this.removeQuantities[rowId] ?? 1;
  }

  setRemoveQty(rowId: string, value: number) {
    this.removeQuantities[rowId] = Math.max(1, Math.floor(value) || 1);
  }

  async removeItem(rowId: string, currentQuantity: number, name: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_remove_item')} "${name}"?`);
    if (!confirmed) return;
    const quantityToRemove = Math.min(this.removeQty(rowId), currentQuantity);
    const { error } = await this.characterStore.removeInventoryItem(c.id, rowId, quantityToRemove, currentQuantity);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    delete this.removeQuantities[rowId];
  }

  async toggleEquip(rowId: string, currentlyEquipped: boolean) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    const { error } = await this.characterStore.toggleEquipped(c.id, rowId, !currentlyEquipped);
    if (error) this.modal.error(error.message);
  }

  private allWeaponsCatalog = this.contentStore.getContent('weapons');
  availableWeaponsCatalog = computed(() => this.allWeaponsCatalog());

  selectedWeaponId = '';
  weaponQuantity = 1;

  async addWeapon() {
    const c = this.character();
    if (!c || !this.selectedWeaponId || this.readOnly()) return;

    const { error } = await this.characterStore.addWeapon(c.id, {
      weaponId: this.selectedWeaponId,
      quantity: this.weaponQuantity,
    });

    if (error) {
      this.modal.error(error.message);
      return;
    }

    this.selectedWeaponId = '';
    this.weaponQuantity = 1;
  }

  attackAbilityNames(abilities: string[]): string {
    return abilities.map((a) => this.localeService.t('ability_' + a)).join(' ' + this.localeService.t('or_label') + ' ');
  }

  async removeWeapon(rowId: string, name: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    const confirmed = await this.modal.confirm(`${this.localeService.t('confirm_remove_weapon')} "${name}"?`);
    if (!confirmed) return;
    const { error } = await this.characterStore.removeWeapon(c.id, rowId);
    if (error) this.modal.error(error.message);
  }

  // Riga arma selezionata nel tab Armi: un click la apre nel "libro" sotto la tabella
  // (immagine a sinistra, dettagli a destra), un secondo click sulla stessa riga la chiude.
  selectedWeaponRowId = signal<string | null>(null);

  toggleWeaponSelection(rowId: string) {
    this.selectedWeaponRowId.update((current) => (current === rowId ? null : rowId));
  }

  selectedWeaponDetail = computed(() => {
    const c = this.character();
    if (!c) return null;
    return c.weapons.find((w) => w.rowId === this.selectedWeaponRowId()) ?? null;
  });

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

    // Applica il limite di trucchetti/incantesimi conosciuti calcolato da classe+livello
    // (nessun limite se la classe non è tra quelle riconosciute in spellcasting.ts).
    const info = this.spellcastingInfo();
    if (info) {
      const spell = this.allSpells().find((s: any) => s.id === this.selectedSpellIdToAdd);
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

    const { error } = await this.characterStore.addSpellToCharacter(c.id, this.selectedSpellIdToAdd);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.selectedSpellIdToAdd = '';
  }

  async removeSpell(rowId: string) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    const { error } = await this.characterStore.removeSpellFromCharacter(c.id, rowId);
    if (error) this.modal.error(error.message);
  }

  async toggleSpellPrepared(rowId: string, currentlyPrepared: boolean) {
    const c = this.character();
    if (!c || this.readOnly()) return;
    const { error } = await this.characterStore.togglePrepared(c.id, rowId, !currentlyPrepared);
    if (error) this.modal.error(error.message);
  }
}
