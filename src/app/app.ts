import { Component, inject, signal, effect } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthForm } from './features/auth-form/auth-form';
import { CampaignHub } from './features/campaign-hub/campaign-hub';
import { CampaignEdit } from './features/campaign-edit/campaign-edit';
import { CampaignCreate } from './features/campaign-create/campaign-create';
import { CharacterCreate } from './features/character-create/character-create';
import { RaceList } from './features/race-list/race-list';
import { ClassList } from './features/class-list/class-list';
import { SubclassList } from './features/subclass-list/subclass-list';
import { BackgroundList } from './features/background-list/background-list';
import { SpellList } from './features/spell-list/spell-list';
import { EquipmentList } from './features/equipment-list/equipment-list';
import { WeaponList } from './features/weapon-list/weapon-list';
import { Manage } from './features/manage/manage';
import { Profile } from './features/profile/profile';
import { Araldica } from './features/araldica/araldica';
import { AppModal } from './features/app-modal/app-modal';
import { LocaleService, Locale } from './core/locale';
import { Auth } from './core/auth';
import { AppNav } from './core/app-nav';
import { ActiveCampaign } from './core/active-campaign';
import { NavigationTracker } from './core/navigation-tracker';
import { DiceRoller } from './shared/dice-roller/dice-roller';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AuthForm,
    CampaignHub,
    CampaignEdit,
    CampaignCreate,
    CharacterCreate,
    RaceList,
    ClassList,
    SubclassList,
    BackgroundList,
    SpellList,
    EquipmentList,
    WeaponList,
    Manage,
    Profile,
    Araldica,
    AppModal,
    DiceRoller,
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
  private router = inject(Router);
  // Mai referenziato altrove: injectarlo qui basta a istanziare il service (providedIn:
  // 'root') e avviare il suo effect() che segue auth.isLoggedIn() per far partire il tracker.
  private navigationTracker = inject(NavigationTracker);
  protected diceRollerOpen = signal(false);

  constructor() {
    // URL richiesto dal browser al caricamento (prima che il redirect '' -> 'dashboard'
    // o la guardia di autenticazione possano intervenire). Serve a distinguere un
    // refresh/link diretto su una pagina specifica da un vero login.
    const initialPath = window.location.pathname + window.location.search;
    let hasHandledInitialAuth = false;

    // Master e Giocatori atterrano sempre sulla Dashboard dopo il login
    // (sia login esplicito che ripristino di una sessione già attiva) —
    // TRANNE al primo caricamento, se l'utente aveva aperto un link diretto
    // a una scheda personaggio: in quel caso va rispettato quel link,
    // altrimenti un semplice refresh sulla pagina la renderebbe inutilizzabile.
    effect(() => {
      if (!this.auth.isLoggedIn()) return;

      if (!hasHandledInitialAuth && initialPath.startsWith('/scheda-personaggio/')) {
        this.appNav.setTab('character-sheet');
        this.router.navigateByUrl(initialPath);
      } else if (!hasHandledInitialAuth && initialPath.startsWith('/reset-password')) {
        // Il link di recupero password nell'email autentica automaticamente l'utente
        // (Supabase rileva il token nell'URL) mentre si trova ancora su /reset-password:
        // senza questo caso speciale verrebbe dirottato sulla dashboard prima di poter
        // impostare la nuova password, rendendo il link di recupero inutilizzabile.
      } else {
        // appNav.activeTab() sopravvive al logout: senza questo reset,
        // al login successivo lo switch mostrerebbe ancora l'ultima
        // scheda visitata invece della Dashboard.
        this.appNav.setTab('board');
        this.router.navigate(['/dashboard']);
      }

      hasHandledInitialAuth = true;
    });
  }

  setLocale(locale: Locale) {
    this.localeService.setLocale(locale);
  }

  // 'board' e 'character-sheet' condividono lo stesso <router-outlet />: cambiare
  // solo il tab non basta, serve rinavigare l'URL o il router resta ancorato
  // alla scheda personaggio precedentemente aperta.
  goToBoard() {
    this.appNav.setTab('board');
    this.router.navigate(['/dashboard']);
  }

  openDiceRollerModal() {
    this.diceRollerOpen.set(true);
  }

  closeDiceRoller() {
    this.diceRollerOpen.set(false);
  }
}
