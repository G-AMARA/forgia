import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { CharacterSheetPage } from './features/character-sheet-page/character-sheet-page';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'scheda-personaggio/:id', component: CharacterSheetPage, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
