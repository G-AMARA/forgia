import { Component, inject, signal, Input } from '@angular/core';
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

  @Input() variant: 'header' | 'landing' = 'header';

  email = '';
  nickname = '';
  password = '';
  isMaster = false; // scelta del ruolo in fase di registrazione
  mode = signal<'login' | 'signup'>('login');
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  loading = signal(false);

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.errorMsg.set(null);
    this.infoMsg.set(null);
  }

  async submit() {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.loading.set(true);

    if (this.mode() === 'signup') {
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
