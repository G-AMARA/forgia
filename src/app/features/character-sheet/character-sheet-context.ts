import { Injectable, computed, inject, signal } from '@angular/core';
import { CharacterFull, CharacterStore } from '../../core/character-store';
import { Auth } from '../../core/auth';
import { Modal } from '../../core/modal';

// Stato radice della scheda: quale personaggio è aperto (il proprio o uno scelto dal
// roster via rotta /scheda-personaggio/:id) e se l'utente loggato può modificarlo.
// Fornito nel sotto-albero di CharacterSheet: tutti gli altri servizi/componenti della
// scheda leggono `character`/`readOnly` da qui invece di ricalcolarli.
@Injectable()
export class CharacterSheetContext {
  private characterStore = inject(CharacterStore);
  private auth = inject(Auth);
  private modal = inject(Modal);

  private characterId = signal<string | undefined>(undefined);

  readonly avatarUploading = signal(false);

  readonly character = computed<CharacterFull | null>(() =>
    this.characterId() ? this.characterStore.selectedCharacter() : this.characterStore.myCharacter()
  );

  // Vero se l'utente loggato non è il proprietario né un admin: blocca ogni modifica
  // quando la scheda si apre dal roster della campagna (vista di un altro personaggio).
  // Gli admin possono editare le schede di chiunque (vedi profiles.is_admin).
  readonly readOnly = computed(
    () => this.character()?.owner_id !== this.auth.user()?.id && !this.auth.isAdmin()
  );

  load(characterId: string | undefined) {
    this.characterId.set(characterId);
    if (characterId) {
      this.characterStore.loadCharacterById(characterId);
    } else {
      this.characterStore.loadMyCharacter();
    }
  }

  async uploadAvatar(file: File) {
    const c = this.character();
    const userId = this.auth.user()?.id;
    if (!file || !c || !userId || this.readOnly()) return;

    this.avatarUploading.set(true);
    const { error } = await this.characterStore.uploadAvatar(c.id, userId, file);
    if (error) this.modal.error(error.message);
    this.avatarUploading.set(false);
  }
}
