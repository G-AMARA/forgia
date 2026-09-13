import { Component, inject } from '@angular/core';
import { AppNav } from '../../core/app-nav';
import { LocaleService } from '../../core/locale';
import { ProfilePlayerCard } from './player-card/player-card';
import { ProfileAccountSettings } from './account-settings/account-settings';
import { PublicProfileCard } from './public-profile-card/public-profile-card';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ProfilePlayerCard, ProfileAccountSettings, PublicProfileCard],
  templateUrl: './profile.html',
})
export class Profile {
  protected localeService = inject(LocaleService);
  protected appNav = inject(AppNav);
}
