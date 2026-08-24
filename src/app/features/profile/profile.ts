import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth, Role } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  nickname = this.auth.nickname() ?? '';

  // Vero admin su DB: decide se mostrare l'opzione "Admin" nel selettore. Per un vero admin
  // il ruolo qui è solo modalità di visualizzazione (Auth.setViewRole, non scrive mai
  // profiles.is_admin), quindi a differenza di prima non serve più congelarla allo stato
  // d'ingresso: può cambiare ruolo quante volte vuole, anche dopo un reload, senza mai
  // perdere l'opzione Admin.
  protected readonly canBeAdmin = this.auth.realIsAdmin();

  role: Role = this.auth.role();

  avatarUploading = signal(false);

  identitySaving = signal(false);

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

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarUploading.set(true);
    const { error } = await this.auth.uploadAvatar(file);
    if (error) {
      this.modal.error(error.message);
    }
    this.avatarUploading.set(false);
    input.value = '';
  }

  async saveIdentity() {
    if (!this.nickname.trim()) {
      return;
    }

    this.identitySaving.set(true);

    // Per un vero admin il selettore ruolo è solo "visualizza come" (locale, non tocca il
    // DB): per chiunque altro resta un vero cambio di ruolo Master/Player su profiles.
    let error: { message: string } | null;
    if (this.canBeAdmin) {
      this.auth.setViewRole(this.role);
      ({ error } = await this.auth.updateNickname(this.nickname.trim()));
    } else {
      ({ error } = await this.auth.updateProfile(this.nickname.trim(), this.role !== 'player'));
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
