// ============================================================
// Tig Music — Auth (shared identity for the Tig Music suite).
// Per-app Google sign-in against the shared `tig-powell` Firebase project, so a
// signed-in writer gets the same uid here as on the hub and the other tig apps.
// ============================================================

import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  /** Current Firebase user (null when signed out). Driven by the auth state stream. */
  readonly user = toSignal(user(this.auth), { initialValue: null });
  readonly isSignedIn = computed(() => this.user() !== null);

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
