import { Injectable, signal } from '@angular/core';

/** Light/dark theme, persisted to localStorage and applied as a class on <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);

  init(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('tig-music-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.isDark.set(stored ? stored === 'dark' : prefersDark);
    this.apply();
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
    this.apply();
    if (typeof window !== 'undefined') {
      localStorage.setItem('tig-music-theme', this.isDark() ? 'dark' : 'light');
    }
  }

  private apply(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', this.isDark());
  }
}
