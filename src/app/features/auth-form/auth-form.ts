import { Component, inject, signal, computed, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';

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

  // Icona del ruolo: admin.png (dado d20) / gameMaster.png (libro) / giocatore.png (spada).
  protected roleIcon = computed(() => {
    if (this.auth.isAdmin()) return '/themes/admin.png';
    if (this.auth.isMaster()) return '/themes/gameMaster.png';
    return '/themes/giocatore.png';
  });

  protected roleLabel = computed(() => {
    if (this.auth.isAdmin()) return this.localeService.t('role_admin');
    if (this.auth.isMaster()) return this.localeService.t('role_master');
    return this.localeService.t('role_player');
  });

  @Input() variant: 'header' | 'landing' = 'header';

  email = '';
  nickname = '';
  password = '';
  repeat_password = '';
  isMaster = false; // scelta del ruolo in fase di registrazione
  protected readonly passwordPattern = '^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  protected readonly emailPattern = '^[^\s@]+@[^\s@]+\\.[^\s@]+$';
  mode = signal<'login' | 'signup'>('login');
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  loading = signal(false);
  showPassword = false;
  show_repeat_Password = false;

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.errorMsg.set(null);
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

    return !!(this.nickname.trim() && this.password);
  }

  async submit() {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.loading.set(true);

    if (this.mode() === 'signup') {
      if (!this.isEmailValid(this.email)) {
        this.errorMsg.set('Inserisci un indirizzo email valido.');
        this.loading.set(false);
        return;
      }

      if (!this.isPasswordStrong(this.password)) {
        this.errorMsg.set('La password deve avere almeno 8 caratteri, una maiuscola, un numero e un simbolo.');
        this.loading.set(false);
        return;
      }

      if (this.password !== this.repeat_password) {
        this.errorMsg.set('Le password non coincidono.');
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
        this.errorMsg.set(error.message);
      } else {
        this.infoMsg.set(this.localeService.t('signup_check_email'));
      }
    } else {
      const { error } = await this.auth.signInWithNickname(this.nickname, this.password);
      if (error) {
        this.errorMsg.set(error.message);
      }
    }

    this.loading.set(false);
  }

  async logout() {
    await this.auth.signOut();
  }
}
