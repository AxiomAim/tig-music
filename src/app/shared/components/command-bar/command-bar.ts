// ============================================================
// Tig Music — the ⌘K command bar (US-7.4). Help one gesture away.
//
// A song-scoped launcher for Hermes: press ⌘K (Ctrl+K) anywhere in the workbench, or click a
// section's inline ✨, to open it pre-scoped — type a request (Enter) or pick a skill — and get
// the same editable, grounded proposal cards the Hermes panel shows. Accept routes through the
// shared ProposalService, so propose-never-act + provenance are intact. Open state + target
// section live in CommandBarService so any surface can launch it.
// ============================================================

import { Component, HostListener, inject, input, signal } from '@angular/core';
import { HermesService } from '../../../core/services/hermes.service';
import { ProposalService } from '../../../core/services/proposal.service';
import { CommandBarService } from '../../../core/services/command-bar.service';
import { HermesSkill, Proposal } from '../../../core/models/hermes.model';
import { Song } from '../../../core/models/song.model';

@Component({
  selector: 'app-command-bar',
  template: `
    <!-- Discoverable trigger (also shows the shortcut) -->
    <button
      type="button"
      class="btn-ghost fixed bottom-5 right-5 z-40 gap-2 py-2 text-sm shadow-lg"
      (click)="openBar()"
      aria-label="Ask Hermes (Command K)"
    >
      ✨ Ask Hermes
      <kbd class="rounded border border-slate-300 px-1 text-[10px] dark:border-slate-600">⌘K</kbd>
    </button>

    @if (bar.isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-24 backdrop-blur-sm"
        (click)="bar.close()"
      >
        <!-- Palette -->
        <div
          class="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
            <span class="text-lg">✨</span>
            <input
              autofocus
              class="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
              placeholder="Ask Hermes for a line, image, or idea…  (Enter to ask)"
              [value]="bar.query()"
              (input)="bar.query.set($any($event.target).value)"
              (keydown.enter)="ask()"
            />
            @if (song().sections.length > 1) {
              <select
                class="input shrink-0 py-1 text-xs"
                [value]="bar.sectionId()"
                (change)="bar.sectionId.set($any($event.target).value)"
                aria-label="Target section"
              >
                @for (s of song().sections; track s.id) {
                  <option [value]="s.id" [selected]="s.id === bar.sectionId()">{{ s.label }}</option>
                }
              </select>
            }
          </div>

          <!-- Skill quick-actions -->
          <div class="flex flex-wrap gap-1.5 px-3 py-2">
            <button type="button" class="chip chip-active py-0.5 text-xs" (click)="ask()">
              ✦ Ask
            </button>
            @for (s of skills; track s.key) {
              <button type="button" class="chip py-0.5 text-xs" (click)="run(s.key)">
                {{ s.label }}
              </button>
            }
          </div>

          <!-- Results -->
          <div class="max-h-80 space-y-2 overflow-y-auto px-3 pb-3">
            @if (loading()) {
              <p class="py-2 text-xs text-slate-400">Thinking…</p>
            }
            @for (p of proposals(); track p.id) {
              <div class="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <div class="flex items-center gap-2">
                  <span
                    class="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    >{{ p.skill }}</span
                  >
                  <span class="truncate text-[11px] text-slate-400">{{ p.target }}</span>
                </div>
                @if (p.kind === 'note') {
                  <p class="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{{ p.proposed }}</p>
                } @else {
                  <input
                    class="input mt-1.5 w-full py-1 text-sm"
                    [value]="p.proposed"
                    (input)="edit(p, $any($event.target).value)"
                  />
                }
                <p class="mt-1 text-[11px] text-slate-400">{{ p.rationale }}</p>
                <div class="mt-2 flex items-center gap-2">
                  @if (p.apply) {
                    <button
                      type="button"
                      class="btn-primary px-2.5 py-1 text-xs"
                      (click)="accept(p)"
                    >
                      Accept
                    </button>
                  }
                  <button
                    type="button"
                    class="text-xs text-slate-400 hover:text-slate-700"
                    (click)="discard(p)"
                  >
                    {{ p.apply ? 'Discard' : 'Dismiss' }}
                  </button>
                </div>
              </div>
            } @empty {
              @if (!loading()) {
                <p class="px-1 pb-2 text-xs text-slate-400">
                  Type a request and press Enter, or pick a skill. You stay the author — nothing
                  changes until you Accept. <kbd class="text-[10px]">Esc</kbd> to close.
                </p>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandBar {
  readonly song = input.required<Song>();

  readonly bar = inject(CommandBarService);
  private readonly hermes = inject(HermesService);
  private readonly proposalSvc = inject(ProposalService);

  readonly skills: { key: HermesSkill; label: string }[] = [
    { key: 'rhyme', label: 'Rhymes' },
    { key: 'scripture', label: 'Scripture' },
    { key: 'chord', label: 'Chords' },
    { key: 'title', label: 'Title' },
    { key: 'structure', label: 'Structure' },
  ];

  readonly loading = signal(false);
  readonly proposals = signal<Proposal[]>([]);

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.bar.isOpen() ? this.bar.close() : this.openBar();
    } else if (e.key === 'Escape' && this.bar.isOpen()) {
      this.bar.close();
    }
  }

  /** Open from ⌘K or the floating button — default the target to the first section. */
  openBar(): void {
    if (!this.bar.sectionId()) this.bar.sectionId.set(this.song().sections[0]?.id ?? '');
    this.bar.open();
  }

  ask(): void {
    void this.run('ask');
  }

  async run(skill: HermesSkill): Promise<void> {
    this.loading.set(true);
    const sectionId = this.bar.sectionId() || this.song().sections[0]?.id;
    try {
      this.proposals.set(
        await this.hermes.propose(this.song(), { skill, sectionId, input: this.bar.query() }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  edit(p: Proposal, text: string): void {
    this.proposals.update((list) =>
      list.map((x) => (x.id === p.id ? { ...x, proposed: text } : x)),
    );
  }

  accept(p: Proposal): void {
    const current = this.proposals().find((x) => x.id === p.id) ?? p;
    this.proposalSvc.accept(this.song(), current);
    this.discard(current);
  }

  discard(p: Proposal): void {
    this.proposals.update((list) => list.filter((x) => x.id !== p.id));
  }
}
