import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Auth, PublicProfile, Role } from '../../../core/auth';
import { CharacterStore } from '../../../core/character-store';
import { ActiveCampaign } from '../../../core/active-campaign';
import { LocaleService } from '../../../core/locale';
import { getRankProgress, secondsToExp } from '../../../core/ranks';

// Scheda profilo di UN ALTRO utente (click su un nome nella modale Avventurieri): stesso
// layout di ProfilePlayerCard ma in sola lettura, dati letti via Auth.getPublicProfile
// invece che dai signal dell'utente loggato. Niente upload avatar né form di modifica.
@Component({
  selector: 'app-public-profile-card',
  standalone: true,
  templateUrl: './public-profile-card.html',
})
export class PublicProfileCard {
  private auth = inject(Auth);
  private characterStore = inject(CharacterStore);
  private activeCampaign = inject(ActiveCampaign);
  protected localeService = inject(LocaleService);

  readonly userId = input.required<string>();

  protected readonly secondsToExp = secondsToExp;

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly forgedHeroesCount = signal(0);
  protected readonly campaignsInProgress = signal(0);
  protected readonly campaignsCompleted = signal(0);

  protected readonly role = computed<Role>(() => {
    const p = this.profile();
    return p?.is_admin ? 'admin' : p?.is_master ? 'master' : 'player';
  });

  protected readonly rankProgress = computed(() => {
    const p = this.profile();
    return getRankProgress(p?.navigation_seconds ?? 0, p?.is_admin ?? false);
  });

  constructor() {
    effect(() => {
      this.loadProfile(this.userId());
    });
  }

  private async loadProfile(userId: string) {
    const [{ data: profile }, forgedHeroes, campaignCounts] = await Promise.all([
      this.auth.getPublicProfile(userId),
      this.characterStore.countForgedHeroes(userId),
      this.activeCampaign.countCampaignsByStatus(userId),
    ]);

    this.profile.set(profile);
    this.forgedHeroesCount.set(forgedHeroes);
    this.campaignsInProgress.set(campaignCounts.inProgress);
    this.campaignsCompleted.set(campaignCounts.completed);
  }
}
