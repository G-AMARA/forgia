import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth, AdminProfile } from '../../../core/auth';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';

type Role = 'player' | 'master' | 'admin';

function roleOf(p: AdminProfile): Role {
  return p.is_admin ? 'admin' : p.is_master ? 'master' : 'player';
}

@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-manage.html',
})
export class UserManage implements OnInit {
  private auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private modal = inject(Modal);

  protected roleOf = roleOf;
  profiles = signal<AdminProfile[]>([]);
  loading = signal(true);
  savingId = signal<string | null>(null);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);
    const { data, error } = await this.auth.listProfiles();
    if (error) {
      this.modal.error(error.message);
    } else {
      // Il proprio ruolo si cambia dalla pagina Profilo (vedi profile.ts): qui l'admin
      // gestisce solo gli altri, per non rischiare di togliersi i permessi da sé.
      this.profiles.set(data.filter((p) => p.id !== this.auth.user()?.id));
    }
    this.loading.set(false);
  }

  async setRole(profile: AdminProfile, role: Role) {
    this.savingId.set(profile.id);
    const { error } = await this.auth.updateUserRole(profile.id, role !== 'player', role === 'admin');
    if (error) {
      this.modal.error(error.message);
    } else {
      this.profiles.update((list) =>
        list.map((p) =>
          p.id === profile.id ? { ...p, is_master: role !== 'player', is_admin: role === 'admin' } : p
        )
      );
    }
    this.savingId.set(null);
  }
}
