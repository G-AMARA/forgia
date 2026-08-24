import { Injectable, computed, inject, signal } from '@angular/core';
import { CharacterStore } from '../../core/character-store';
import { Modal } from '../../core/modal';
import { LocaleService } from '../../core/locale';
import { CharacterSheetContext } from './character-sheet-context';

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Taccuino: ogni riga è una pagina a sé con la propria data (entry_date), modificabile in
// fase di scrittura invece che dedotta automaticamente da created_at — così si può
// annotare oggi un evento datato qualche sessione fa. Caricato a parte (non nella query
// principale del personaggio) quando si apre il tab, vedi load().
@Injectable()
export class CharacterDiaryService {
  private characterStore = inject(CharacterStore);
  private modal = inject(Modal);
  private localeService = inject(LocaleService);
  private context = inject(CharacterSheetContext);

  readonly newEntryText = signal('');
  readonly newEntryDate = signal(todayDateString());
  readonly newEntryTitle = signal('');
  // Non null mentre si modifica una pagina già scritta (vedi startEdit): in quel caso
  // submit() aggiorna quella riga invece di crearne una nuova.
  readonly editingEntryId = signal<string | null>(null);

  readonly pages = computed(() => {
    const locale = this.localeService.locale() === 'it' ? 'it-IT' : 'en-US';
    return this.characterStore.diaryEntries().map((entry) => {
      // Parsing manuale (non new Date(entry.entry_date) diretto) per evitare che la data
      // "YYYY-MM-DD" venga letta come UTC e scali di un giorno nei fusi orari negativi.
      const [y, m, d] = entry.entry_date.split('-').map(Number);
      const dateLabel = new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      return { id: entry.id, content: entry.content, title: entry.title, dateLabel, rawDate: entry.entry_date };
    });
  });

  load(characterId: string) {
    this.characterStore.loadDiaryEntries(characterId);
  }

  async submit() {
    const c = this.context.character();
    const text = this.newEntryText().trim();
    if (!c || this.context.readOnly() || !text || !this.newEntryDate()) return;

    const title = this.newEntryTitle().trim() || null;
    const editingId = this.editingEntryId();
    const { error } = editingId
      ? await this.characterStore.updateDiaryEntry(c.id, editingId, text, this.newEntryDate(), title)
      : await this.characterStore.addDiaryEntry(c.id, text, this.newEntryDate(), title);

    if (error) {
      this.modal.error(error.message);
      return;
    }
    this.newEntryText.set('');
    this.newEntryDate.set(todayDateString());
    this.newEntryTitle.set('');
    this.editingEntryId.set(null);
  }

  startEdit(page: { id: string; content: string; title: string | null; rawDate: string }) {
    if (this.context.readOnly()) return;
    this.editingEntryId.set(page.id);
    this.newEntryDate.set(page.rawDate);
    this.newEntryTitle.set(page.title ?? '');
    this.newEntryText.set(page.content);
  }

  cancelEdit() {
    this.editingEntryId.set(null);
    this.newEntryDate.set(todayDateString());
    this.newEntryTitle.set('');
    this.newEntryText.set('');
  }

  async deleteEntry(entryId: string) {
    const c = this.context.character();
    if (!c || this.context.readOnly()) return;

    const confirmed = await this.modal.confirm(this.localeService.t('confirm_delete_diary_entry'));
    if (!confirmed) return;

    const { error } = await this.characterStore.deleteDiaryEntry(c.id, entryId);
    if (error) {
      this.modal.error(error.message);
      return;
    }
    // Se si stava modificando proprio la pagina appena eliminata, il form torna pulito.
    if (this.editingEntryId() === entryId) this.cancelEdit();
  }
}
