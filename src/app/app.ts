import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthForm } from './features/auth-form/auth-form';
import { CampaignBoard } from './features/campaign-board/campaign-board';
import { CampaignHub } from './features/campaign-hub/campaign-hub';
import { CampaignEdit } from './features/campaign-edit/campaign-edit';
import { CampaignCreate } from './features/campaign-create/campaign-create';
import { CharacterCreate } from './features/character-create/character-create';
import { CharacterList } from './features/character-list/character-list';
import { RaceList } from './features/race-list/race-list';
import { ClassList } from './features/class-list/class-list';
import { BackgroundList } from './features/background-list/background-list';
import { SpellList } from './features/spell-list/spell-list';
import { EquipmentList } from './features/equipment-list/equipment-list';
import { LocaleService, Locale } from './core/locale';
import { Auth } from './core/auth';
import { AppNav } from './core/app-nav';
import { ActiveCampaign } from './core/active-campaign';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AuthForm,
    CampaignBoard,
    CampaignHub,
    CampaignEdit,
    CampaignCreate,
    CharacterCreate,
    CharacterList,
    RaceList,
    ClassList,
    BackgroundList,
    SpellList,
    EquipmentList,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('fanta-project');
  protected localeService = inject(LocaleService);
  protected auth = inject(Auth);
  protected appNav = inject(AppNav);
  protected activeCampaign = inject(ActiveCampaign);

  setLocale(locale: Locale) {
    this.localeService.setLocale(locale);
  }
}
