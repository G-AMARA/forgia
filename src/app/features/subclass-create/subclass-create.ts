import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStore } from '../../core/content-store';
import { Supabase } from '../../core/supabase';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-subclass-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './subclass-create.html',
})
export class SubclassCreate {
  private supabase = inject(Supabase);
  private contentStore = inject(ContentStore);
  protected localeService = inject(LocaleService);

  protected classes = this.contentStore.getContent('classes');
  protected subclasses = this.contentStore.getContent('subclasses');

  name = '';
  classId = '';
  unlockedAtLevel = 3;
  description = '';

  errorMsg = signal<string | null>(null);
  loading = signal(false);

  private refreshSubclasses() {
    this.contentStore.invalidate('subclasses');
    this.subclasses = this.contentStore.getContent('subclasses');
  }

  // Nome della classe genitrice, per mostrarlo nella lista del catalogo.
  className(sub: any): string {
    const cls = this.classes().find((c: any) => c.id === sub.raw.class_id);
    return cls?.name ?? '—';
  }

  async submit() {
    this.errorMsg.set(null);
    this.loading.set(true);

    const { error } = await this.supabase.client.from('subclasses').insert({
      name: this.name,
      class_id: this.classId,
      unlocked_at_level: this.unlockedAtLevel,
      description: this.description || null,
    });

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.name = '';
      this.classId = '';
      this.unlockedAtLevel = 3;
      this.description = '';
      this.refreshSubclasses();
    }

    this.loading.set(false);
  }

  async deleteSubclass(id: string, name: string) {
    const confirmed = window.confirm(`${this.localeService.t('confirm_delete_subclass')} "${name}"?`);
    if (!confirmed) return;

    const { error } = await this.supabase.client.from('subclasses').delete().eq('id', id);
    if (!error) {
      this.refreshSubclasses();
    }
  }
}
