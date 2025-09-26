import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  if (token && token.trim().length > 0) {
    return true;
  }

  // not logged in: redirect to login and preserve the attempted URL
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
