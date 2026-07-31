import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => {
  return inject(Auth).isLoggedIn();
};
