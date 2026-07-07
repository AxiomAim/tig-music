// ============================================================
// Tig Music — Suite account button (navbar).
// Signed out: a "Sign in" button (Google). Signed in: avatar + sign out. Signing in
// turns on cross-app sync to the hub (see SuiteSyncService).
// ============================================================

import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-suite-account',
  template: `
    @if (auth.isSignedIn()) {
      <div class="flex items-center gap-2">
        @if (photoURL()) {
          <img
            [src]="photoURL()"
            alt=""
            class="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
        } @else {
          <span
            class="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white"
          >
            {{ initials() }}
          </span>
        }
        <button
          type="button"
          class="text-sm font-semibold text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
          (click)="auth.signOut()"
        >
          Sign out
        </button>
      </div>
    } @else {
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        (click)="auth.signInWithGoogle()"
      >
        Sign in
      </button>
    }
  `,
})
export class SuiteAccountButton {
  protected readonly auth = inject(AuthService);

  protected readonly photoURL = computed(() => this.auth.user()?.photoURL ?? null);
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.displayName ?? 'P';
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });
}
