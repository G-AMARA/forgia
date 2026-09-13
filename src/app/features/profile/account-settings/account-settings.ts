import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth, Role } from '../../../core/auth';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';

@Component({
  selector: 'app-profile-account-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-settings.html',
})
export class ProfileAccountSettings {
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  identitySaving = signal(false);

  // linkedSignal invece di uno snapshot statico: auth.role() si popola in modo asincrono
  // dopo il login (round-trip a profiles), quindi un campo plain catturato al costruttore
  // può restare errato per sempre se il componente si monta prima che la risposta arrivi.
  // linkedSignal si aggiorna quando la fonte cambia, ma resta comunque scrivibile
  // dall'utente (ngModel) come un normale stato locale.
  protected readonly role = linkedSignal<Role>(() => this.auth.role());

  // Vero admin su DB: decide se mostrare l'opzione "Admin" nel selettore. Per un vero admin
  // il ruolo qui è solo modalità di visualizzazione (Auth.setViewRole, non scrive mai
  // profiles.is_admin), quindi può cambiare ruolo quante volte vuole, anche dopo un reload,
  // senza mai perdere l'opzione Admin.
  protected readonly canBeAdmin = computed(() => this.auth.realIsAdmin());

  newPassword = '';
  repeatPassword = '';
  showPassword = false;
  protected readonly passwordPattern = '^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  passwordSaving = signal(false);
  passwordError = signal<string | null>(null);

  protected registrationDate(): string | null {
    const createdAt = this.auth.user()?.created_at;
    if (!createdAt) return null;
    const locale = this.localeService.locale() === 'it' ? 'it-IT' : 'en-US';
    return new Date(createdAt).toLocaleDateString(locale);
  }

  async saveIdentity() {
    this.identitySaving.set(true);

    // Il nickname non è più modificabile da UI: qui si salva solo il ruolo scelto. Per un
    // vero admin il selettore è solo "visualizza come" (locale, non tocca il DB); per
    // chiunque altro resta un vero cambio di ruolo Master/Player su profiles.
    let error: { message: string } | null = null;
    if (this.canBeAdmin()) {
      this.auth.setViewRole(this.role());
    } else {
      ({ error } = await this.auth.updateProfile(this.auth.nickname() ?? '', this.role() !== 'player'));
    }

    this.identitySaving.set(false);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.modal.success(this.localeService.t('saved_message'));
    }
  }

  private isPasswordStrong(password: string): boolean {
    return new RegExp(this.passwordPattern).test(password);
  }

  async savePassword() {
    this.passwordError.set(null);

    if (!this.isPasswordStrong(this.newPassword)) {
      this.passwordError.set(this.localeService.t('password_pattern_hint') + '.');
      return;
    }

    if (this.newPassword !== this.repeatPassword) {
      this.passwordError.set(this.localeService.t('no_matching_passwords') + '.');
      return;
    }

    this.passwordSaving.set(true);
    const { error } = await this.auth.updatePassword(this.newPassword);
    this.passwordSaving.set(false);

    if (error) {
      this.modal.error(error.message);
    } else {
      this.modal.success(this.localeService.t('saved_password'));
      this.newPassword = '';
      this.repeatPassword = '';
    }
  }
}
