import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';
import { SpellSchoolIcon } from '../../shared/spell-school-icon/spell-school-icon';
import { translateSpellSchool } from '../../core/spell-schools';

// Stesse 8 scuole gestite da SpellSchoolIcon (core/spell-schools.ts per le traduzioni):
// determina l'icona mostrata sulle card incantesimo in scheda personaggio.
export const SPELL_SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
] as const;

interface HomebrewSpell {
  id: string;
  name: string; // tradotto nella lingua corrente: solo per la visualizzazione in lista
  rawName: string; // canonico, quello realmente salvato in spells.name
  level: number;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  duration: string | null;
  damage_effect: string | null;
  classes: { name: string }[] | null;
  description: string | null; // tradotta
  rawDescription: string | null; // canonica, quella realmente salvata in spells.description
  sourcebook_code: string;
}

@Component({
  selector: 'app-spell-create',
  standalone: true,
  imports: [FormsModule, SpellSchoolIcon],
  templateUrl: './spell-create.html',
})
export class SpellCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected schools = SPELL_SCHOOLS;

  schoolLabel(school: string | null): string {
    return school ? translateSpellSchool(school, this.localeService.locale()) : '—';
  }

  protected classesCatalog = this.contentStore.getContent('classes');
  private spellsCatalog = this.contentStore.getContent('spells');

  // Stessa fonte del catalogo incantesimi (spell-list): nome e descrizione arrivano
  // già tradotti nella lingua corrente via content_translations. Gli altri campi
  // (tempi, gittata, ecc.) non hanno una traduzione separata e restano il dato grezzo,
  // come nel resto dell'app (es. scheda personaggio).
  protected allSpells = computed<HomebrewSpell[]>(() =>
    this.spellsCatalog().map((s: any) => ({
      id: s.id,
      name: s.name,
      rawName: s.raw.name,
      level: s.raw.level ?? 0,
      school: s.raw.school ?? null,
      casting_time: s.raw.casting_time ?? null,
      range: s.raw.range ?? null,
      duration: s.raw.duration ?? null,
      damage_effect: s.raw.damage_effect ?? null,
      classes: s.raw.classes ?? null,
      description: s.description ?? null,
      rawDescription: s.raw.description ?? null,
      sourcebook_code: s.raw.sourcebook_code,
    }))
  );

  levels = Array.from({ length: 10 }, (_, i) => i);

  level = 0;
  name = '';
  school = '';
  castingTime = '';
  range = '';
  duration = '';
  damageEffect = '';
  description = '';
  selectedClassIds = new Set<string>();

  editingId: string | null = null;
  // sourcebook_code dell'incantesimo in modifica: preservato al salvataggio così
  // modificare uno SRD non lo "adotta" silenziosamente come homebrew.
  private editingSourcebookCode: string | null = null;

  loading = signal(false);

  listSearchTerm = signal('');
  private expandedLevels = signal<Set<number>>(new Set());

  // Raggruppa gli homebrew per livello (solo i livelli con almeno un incantesimo
  // che passa il filtro nome), ordinati crescenti: base per gli accordion in lista.
  protected groupedSpells = computed(() => {
    const term = this.listSearchTerm().trim().toLowerCase();
    const filtered = term
      ? this.allSpells().filter((s) => s.name.toLowerCase().includes(term))
      : this.allSpells();

    const byLevel = new Map<number, HomebrewSpell[]>();
    for (const spell of filtered) {
      const bucket = byLevel.get(spell.level);
      if (bucket) {
        bucket.push(spell);
      } else {
        byLevel.set(spell.level, [spell]);
      }
    }

    return Array.from(byLevel.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, spells]) => ({ level, spells }));
  });

  // Con una ricerca attiva le sezioni si aprono da sole sui livelli con match: altrimenti
  // l'utente dovrebbe aprire ogni accordion a mano per scoprire dove sono i risultati.
  isLevelExpanded(level: number): boolean {
    if (this.listSearchTerm().trim()) return true;
    return this.expandedLevels().has(level);
  }

  toggleLevel(level: number) {
    const current = new Set(this.expandedLevels());
    if (current.has(level)) {
      current.delete(level);
    } else {
      current.add(level);
    }
    this.expandedLevels.set(current);
  }

  toggleClass(id: string) {
    const current = new Set(this.selectedClassIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedClassIds = current;
  }

  isClassSelected(id: string): boolean {
    return this.selectedClassIds.has(id);
  }

  // spell.classes conserva sempre il nome canonico (inglese) della classe, come
  // salvato in submit(): qui lo si traduce cercando la classe corrispondente nel
  // catalogo classi già localizzato, con fallback al nome grezzo se non trovata.
  classNames(spell: HomebrewSpell): string {
    const translatedByRawName = new Map(
      this.classesCatalog().map((c: any) => [c.raw.name, c.name])
    );
    return (spell.classes ?? []).map((c) => translatedByRawName.get(c.name) ?? c.name).join(', ');
  }

  private resetForm() {
    this.editingId = null;
    this.editingSourcebookCode = null;
    this.name = '';
    this.level = 0;
    this.school = '';
    this.castingTime = '';
    this.range = '';
    this.duration = '';
    this.damageEffect = '';
    this.description = '';
    this.selectedClassIds = new Set();
  }

  startEdit(spell: HomebrewSpell) {
    this.editingId = spell.id;
    this.editingSourcebookCode = spell.sourcebook_code;
    // In inglese si modifica il dato canonico. Nelle altre lingue si modifica invece
    // la traduzione mostrata in lista (submit() la salva su content_translations,
    // senza toccare la riga base): così l'admin corregge esattamente quello che vede.
    const isEnglish = this.localeService.locale() === 'en';
    this.name = isEnglish ? spell.rawName : spell.name;
    this.level = spell.level;
    this.school = spell.school ?? '';
    this.castingTime = spell.casting_time ?? '';
    this.range = spell.range ?? '';
    this.duration = spell.duration ?? '';
    this.damageEffect = spell.damage_effect ?? '';
    this.description = isEnglish ? (spell.rawDescription ?? '') : (spell.description ?? '');
    const classNames = new Set((spell.classes ?? []).map((c) => c.name));
    const matchingIds = this.classesCatalog()
      .filter((c: any) => classNames.has(c.raw.name))
      .map((c: any) => c.id);
    this.selectedClassIds = new Set(matchingIds);

    if (!this.isLevelExpanded(spell.level)) {
      this.toggleLevel(spell.level);
    }
  }

  cancelEdit() {
    this.resetForm();
  }

  async submit() {
    this.loading.set(true);

    const chosenClasses = this.classesCatalog()
      .filter((c: any) => this.selectedClassIds.has(c.id))
      .map((c: any) => ({ name: c.raw.name }));

    // Campi senza traduzione separata: valgono per tutte le lingue, vanno sempre
    // sulla riga base a prescindere dalla lingua corrente.
    const basePayload = {
      level: this.level,
      school: this.school || null,
      sourcebook_code: this.editingId ? (this.editingSourcebookCode ?? 'homebrew') : 'homebrew',
      classes: chosenClasses,
      casting_time: this.castingTime || null,
      range: this.range || null,
      duration: this.duration || null,
      damage_effect: this.damageEffect || null,
    };

    const locale = this.localeService.locale();

    if (this.editingId && locale !== 'en') {
      // Si sta modificando un incantesimo esistente in una lingua diversa
      // dall'inglese: nome/descrizione vanno nella traduzione, mai sulla riga
      // canonica (altrimenti si sovrascriverebbe il testo inglese di riferimento).
      const { error: baseError } = await this.supabase.client
        .from('spells')
        .update(basePayload)
        .eq('id', this.editingId);

      const { error: translationError } = baseError
        ? { error: baseError }
        : await this.supabase.client.from('content_translations').upsert(
            {
              content_table: 'spells',
              content_id: this.editingId,
              locale,
              name: this.name,
              description: this.description || null,
            },
            { onConflict: 'content_table,content_id,locale' }
          );

      const error = baseError ?? translationError;
      if (error) {
        this.modal.error(error.message);
      } else {
        this.resetForm();
        await this.contentStore.refresh('spells');
        this.modal.success(this.localeService.t('well_created_spell'));
      }

      this.loading.set(false);
      return;
    }

    // Creazione di un nuovo homebrew, oppure modifica mentre si è in inglese:
    // nome e descrizione vanno direttamente sulla riga canonica, come prima.
    const payload = { ...basePayload, name: this.name, description: this.description || null };

    const { error } = this.editingId
      ? await this.supabase.client.from('spells').update(payload).eq('id', this.editingId)
      : await this.supabase.client.from('spells').insert(payload);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.resetForm();
      await this.contentStore.refresh('spells');
      this.modal.success(this.localeService.t('saved_message'));
    }

    this.loading.set(false);
  }

  async deleteSpell(id: string, name: string) {
    const confirmed = await this.modal.confirm(
      `${this.localeService.t('confirm_delete_spell')} "${name}"?`, 
      {
       cancelLabel: this.localeService.t('cancel_button'), 
       confirmLabel: this.localeService.t('confirm_delete_spell_title')
      }
    );
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('spells').delete().eq('id', id);
    if (error) {
      this.modal.error(error.message);
    } else {
      let confirmed = await this.modal.success(
        `${this.localeService.t('spell_deleted_msg_1')} "${name}" ${this.localeService.t('spell_deleted_msg_2')}`
      );
      if(!confirmed) return;
      // Ripulisce eventuali traduzioni orfane rimaste agganciate a questo incantesimo.
      await this.supabase.client
        .from('content_translations')
        .delete()
        .eq('content_table', 'spells')
        .eq('content_id', id);
      await this.contentStore.refresh('spells');
    }
  }
}
