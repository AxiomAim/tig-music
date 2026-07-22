// ============================================================
// Tig Music — command-bar launcher state (US-7.4).
//
// Decouples "open the ⌘K bar" from the component that renders it, so any surface (a section's
// inline ✨, a future ⌘K on a chord, etc.) can open Hermes pre-scoped to a target section. The
// CommandBar component owns the overlay + proposals; this owns only the open intent + target.
// ============================================================

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommandBarService {
  readonly isOpen = signal(false);
  /** The section the launcher targets (which section an accepted line/chord lands in). */
  readonly sectionId = signal<string>('');
  /** Optional text to prefill the ask input. */
  readonly query = signal<string>('');

  /** Open the launcher, optionally scoped to a section and/or with a prefilled query. */
  open(opts?: { sectionId?: string; query?: string }): void {
    if (opts?.sectionId) this.sectionId.set(opts.sectionId);
    if (opts?.query !== undefined) this.query.set(opts.query);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
