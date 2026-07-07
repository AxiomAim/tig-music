import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { SuiteAccountButton } from './shared/components/suite-account-button/suite-account-button';
import { SuiteSyncService } from './core/services/suite-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SuiteAccountButton],
  template: `
    <a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>

    <!-- Navbar -->
    <header
      class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
    >
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a routerLink="/" class="flex items-center gap-2.5">
          <img src="/images/tigpowell.svg" alt="Tig Music logo" class="h-9 w-9 shrink-0" />
          <span class="font-heading text-base font-bold text-slate-900 dark:text-white"
            >Tig&nbsp;Music</span
          >
        </a>

        <div class="hidden items-center gap-1 md:flex">
          @for (l of visibleLinks(); track l.path) {
            <a
              [routerLink]="l.path"
              routerLinkActive="bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              [routerLinkActiveOptions]="{ exact: l.path === '/' }"
              class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            >
              {{ l.label }}
            </a>
          }
        </div>

        <div class="flex items-center gap-2">
          <app-suite-account></app-suite-account>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            aria-label="Toggle theme"
            (click)="theme.toggle()"
          >
            {{ theme.isDark() ? '☀️' : '🌙' }}
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-300"
            aria-label="Toggle menu"
            (click)="menuOpen.set(!menuOpen())"
          >
            {{ menuOpen() ? '✕' : '☰' }}
          </button>
        </div>
      </nav>

      @if (menuOpen()) {
        <div
          class="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          @for (l of visibleLinks(); track l.path) {
            <a
              [routerLink]="l.path"
              (click)="menuOpen.set(false)"
              class="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {{ l.label }}
            </a>
          }
        </div>
      }
    </header>

    <main id="main">
      <router-outlet />
    </main>

    <!-- Footer -->
    <footer
      class="mt-12 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div
        class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"
      >
        <span
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
          ><img src="/images/tigpowell.svg" alt="" class="h-5 w-5" />Tig Music</span
        >
        <nav class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          @for (l of visibleLinks(); track l.path) {
            <a
              [routerLink]="l.path"
              class="text-slate-500 hover:text-brand-600 dark:text-slate-400"
              >{{ l.label }}</a
            >
          }
          <a
            href="https://tigpowell.com"
            target="_blank"
            rel="noopener"
            class="text-slate-500 hover:text-brand-600 dark:text-slate-400"
            >tigpowell.com</a
          >
        </nav>
      </div>
      <div class="border-t border-slate-200 dark:border-slate-800">
        <p class="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8">
          © {{ year }} Tig Powell · A songwriting studio.
        </p>
      </div>
    </footer>
  `,
})
export class App {
  theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  // Injecting the sync service constructs it, starting the auth→Firestore mirror.
  private readonly suiteSync = inject(SuiteSyncService);
  readonly menuOpen = signal(false);
  readonly year = new Date().getFullYear();

  private readonly links: { path: string; label: string; authOnly?: boolean }[] = [
    { path: '/', label: 'Home' },
    { path: '/songs', label: 'Songs', authOnly: true },
    { path: '/about', label: 'About' },
  ];

  /** Hide the Songs link when signed out (it's auth-guarded). */
  readonly visibleLinks = computed(() =>
    this.links.filter((l) => !l.authOnly || this.auth.isSignedIn()),
  );

  constructor() {
    this.theme.init();
  }
}
