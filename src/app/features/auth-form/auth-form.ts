import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';
import { AppNav } from '../../core/app-nav';
import { Modal } from '../../core/modal';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-form.html',
})
export class AuthForm {
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);
  protected authService = this.auth;
  private appNav = inject(AppNav);
  private modal = inject(Modal);

  protected userMenuOpen = signal(false);

  toggleUserMenu() {
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  goToSettings() {
    this.userMenuOpen.set(false);
    this.appNav.setTab('profile');
  }

  @Input() variant: 'header' | 'landing' = 'header';

  email = '';
  nickname = '';
  password = '';
  repeat_password = '';
  isMaster = false; // scelta del ruolo in fase di registrazione
  protected readonly passwordPattern = '^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  protected readonly emailPattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
  mode = signal<'login' | 'signup' | 'recover'>('login');
  infoMsg = signal<string | null>(null);
  loading = signal(false);
  showPassword = false;
  show_repeat_Password = false;

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.infoMsg.set(null);
  }

  goToRecover() {
    this.mode.set('recover');
    this.infoMsg.set(null);
  }

  private isPasswordStrong(password: string): boolean {
    return new RegExp(this.passwordPattern).test(password);
  }

  private isEmailValid(email: string): boolean {
    return new RegExp(this.emailPattern).test(email);
  }

  protected canSubmit(): boolean {
    if (this.loading()) {
      return false;
    }

    if (this.mode() === 'signup') {
      return !!(
        this.email.trim() &&
        this.isEmailValid(this.email) &&
        this.nickname.trim() &&
        this.password &&
        this.repeat_password &&
        this.isPasswordStrong(this.password) &&
        this.password === this.repeat_password
      );
    }

    if (this.mode() === 'recover') {
      return !!this.nickname.trim();
    }

    return !!(this.nickname.trim() && this.password);
  }

  async submit() {
    this.infoMsg.set(null);
    this.loading.set(true);

    if (this.mode() === 'recover') {
      const { error } = await this.auth.recoverPassword(this.nickname);
      if (error) {
        this.modal.error(error.message);
      } else {
        this.infoMsg.set(this.localeService.t('recover_check_email'));
      }
      this.loading.set(false);
      return;
    }

    if (this.mode() === 'signup') {
      if (!this.isEmailValid(this.email)) {
        this.modal.error('Inserisci un indirizzo email valido.');
        this.loading.set(false);
        return;
      }

      if (!this.isPasswordStrong(this.password)) {
        this.modal.error('La password deve avere almeno 8 caratteri, una maiuscola, un numero e un simbolo.');
        this.loading.set(false);
        return;
      }

      if (this.password !== this.repeat_password) {
        this.modal.error('Le password non coincidono.');
        this.loading.set(false);
        return;
      }

      const { error } = await this.auth.signUp(
        this.email,
        this.password,
        this.nickname,
        this.isMaster
      );
      if (error) {
        this.modal.error(error.message);
      } else {
        this.infoMsg.set(this.localeService.t('signup_check_email'));
      }
    } else {
      const { error } = await this.auth.signInWithNickname(this.nickname, this.password);
      if (error) {
        this.modal.error(error.message);
      }
    }

    this.loading.set(false);
  }

  async logout() {
    await this.auth.signOut();
  }
}
