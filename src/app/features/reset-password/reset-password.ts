import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { LocaleService } from '../../core/locale';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private auth = inject(Auth);
  private router = inject(Router);
  protected localeService = inject(LocaleService);

  password = '';
  repeat_password = '';
  protected readonly passwordPattern = '^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  loading = signal(false);
  showPassword = false;

  private isPasswordStrong(password: string): boolean {
    return new RegExp(this.passwordPattern).test(password);
  }

  protected canSubmit(): boolean {
    return !this.loading() && !!this.password && this.password === this.repeat_password;
  }

  async submit() {
    this.errorMsg.set(null);

    if (!this.isPasswordStrong(this.password)) {
      this.errorMsg.set(this.localeService.t('password_pattern_hint') + '.');
      return;
    }

    if (this.password !== this.repeat_password) {
      this.errorMsg.set(this.localeService.t('no_matching_passwords') + '.');
      return;
    }

    this.loading.set(true);
    const { error } = await this.auth.updatePassword(this.password);
    this.loading.set(false);

    if (error) {
      this.errorMsg.set(error.message);
      return;
    }

    this.successMsg.set(this.localeService.t('reset_password_success'));
    setTimeout(() => this.router.navigateByUrl('/dashboard'), 2000);
  }
}
