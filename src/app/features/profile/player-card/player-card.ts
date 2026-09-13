import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Auth } from '../../../core/auth';
import { CharacterStore } from '../../../core/character-store';
import { ActiveCampaign } from '../../../core/active-campaign';
import { LocaleService } from '../../../core/locale';
import { Modal } from '../../../core/modal';
import { getRankProgress, secondsToExp } from '../../../core/ranks';

@Component({
  selector: 'app-profile-player-card',
  standalone: true,
  templateUrl: './player-card.html',
})
export class ProfilePlayerCard implements OnInit {
  protected auth = inject(Auth);
  protected localeService = inject(LocaleService);
  private characterStore = inject(CharacterStore);
  private activeCampaign = inject(ActiveCampaign);
  private modal = inject(Modal);

  protected readonly secondsToExp = secondsToExp;

  avatarUploading = signal(false);

  protected readonly rankProgress = computed(() =>
    getRankProgress(this.auth.navigationSeconds(), this.auth.isAdmin())
  );

  protected readonly forgedHeroesCount = computed(() => this.characterStore.myCharacterCount());
  protected readonly campaignsInProgress = computed(
    () => this.activeCampaign.campaigns().filter((c) => c.status !== 'completed').length
  );
  protected readonly campaignsCompleted = computed(
    () => this.activeCampaign.campaigns().filter((c) => c.status === 'completed').length
  );

  ngOnInit() {
    this.characterStore.loadMyRoster();
    this.activeCampaign.loadCampaigns();
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
}
