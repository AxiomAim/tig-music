// ============================================================
// Tig Music — auth guard.
// The song surfaces (catalog, workbench, chart) require a signed-in writer: a signed-out
// visitor is redirected home. Waits for Firebase to resolve the persisted session first
// (authState emits once initialized), so a returning writer isn't bounced on reload.
// ============================================================

import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return authState(inject(Auth)).pipe(
    take(1),
    map((user) => (user ? true : router.createUrlTree(['/']))),
  );
};
