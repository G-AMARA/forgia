import { Component, computed, inject } from '@angular/core';
import { LocaleService } from '../../core/locale';
import { getClassImagePath } from '../../core/class-images';
import { getXpProgress } from '../../core/xp-progression';
import { CharacterSheetContext } from './character-sheet-context';
import { CharacterPrivilegesService } from './character-privileges';

// Banner in cima alla scheda: avatar (con upload), nome/razza/classe, barra esperienza.
@Component({
  selector: 'app-character-sheet-header',
  imports: [],
  // display:contents: l'host non deve introdurre un box nel space-y-4 di CharacterSheet
  // (era un <div> diretto nel markup originale, non un elemento wrappato).
  host: { class: 'contents' },
  templateUrl: './character-sheet-header.html',
})
export class CharacterSheetHeader {
  protected context = inject(CharacterSheetContext);
  protected privileges = inject(CharacterPrivilegesService);
  protected localeService = inject(LocaleService);

  protected classImagePath = computed(() =>
    getClassImagePath(this.context.character()?.class_name, this.context.character()?.sex)
  );

  // Progresso XP verso il prossimo livello, per la barra nel banner: ricalcolato da
  // level + experience_points del personaggio corrente (soglie standard SRD).
  protected xpProgress = computed(() => {
    const c = this.context.character();
    if (!c) return null;
    return getXpProgress(c.level, c.experience_points);
  });

  protected async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.context.uploadAvatar(file);
    input.value = '';
  }
}
