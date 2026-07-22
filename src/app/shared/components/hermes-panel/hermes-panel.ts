import { Component, inject, input, signal } from '@angular/core';
import { HermesService } from '../../../core/services/hermes.service';
import { ProposalService } from '../../../core/services/proposal.service';
import { HermesSkill, Proposal } from '../../../core/models/hermes.model';
import { Song } from '../../../core/models/song.model';

@Component({
  selector: 'app-hermes-panel',
  template: `
    <aside class="card">
      <div class="flex items-center gap-2">
        <span class="text-xl">✨</span>
        <h2 class="font-heading font-semibold text-slate-900 dark:text-white">Hermes</h2>
        <span class="ml-auto text-[10px] uppercase tracking-wide text-slate-400"
          >proposes · never acts</span
        >
      </div>

      <!-- Target section + skills -->
      <select
        class="input mt-3 w-full py-1 text-sm"
        [value]="sectionId()"
        (change)="sectionId.set($any($event.target).value)"
      >
        @for (s of song().sections; track s.id) {
          <option [value]="s.id" [selected]="s.id === sectionId()">{{ s.label }}</option>
        }
      </select>
      <div class="mt-2 flex flex-wrap gap-1.5">
        @for (s of skills; track s.key) {
          <button type="button" class="chip py-0.5 text-xs" (click)="run(s.key)">
            {{ s.label }}
          </button>
        }
      </div>
      <input
        class="input mt-2 w-full py-1 text-sm"
        placeholder="Optional: a word to rhyme, or a theme…"
        [value]="prompt()"
        (input)="prompt.set($any($event.target).value)"
      />

      @if (loading()) {
        <p class="mt-3 text-xs text-slate-400">Thinking…</p>
      }

      <!-- Proposals -->
      <div class="mt-3 space-y-2">
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
                <button type="button" class="btn-primary px-2.5 py-1 text-xs" (click)="accept(p)">
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
            <p class="text-xs text-slate-400">
              Pick a skill to get grounded, editable suggestions. You stay the author.
            </p>
          }
        }
      </div>
    </aside>
  `,
})
export class HermesPanel {
  readonly song = input.required<Song>();

  private readonly hermes = inject(HermesService);
  private readonly proposalSvc = inject(ProposalService);

  readonly skills: { key: HermesSkill; label: string }[] = [
    { key: 'ask', label: '✦ Ask Hermes' },
    { key: 'rhyme', label: 'Rhymes' },
    { key: 'scripture', label: 'Scripture' },
    { key: 'chord', label: 'Chords' },
    { key: 'title', label: 'Title' },
    { key: 'structure', label: 'Structure' },
  ];

  readonly sectionId = signal<string>('');
  readonly prompt = signal('');
  readonly loading = signal(false);
  readonly proposals = signal<Proposal[]>([]);

  async run(skill: HermesSkill): Promise<void> {
    this.loading.set(true);
    const sectionId = this.sectionId() || this.song().sections[0]?.id;
    try {
      this.proposals.set(
        await this.hermes.propose(this.song(), { skill, sectionId, input: this.prompt() }),
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

  /** Accept a proposal — routed through the shared ProposalService (the only mutation path). */
  accept(p: Proposal): void {
    const current = this.proposals().find((x) => x.id === p.id) ?? p;
    this.proposalSvc.accept(this.song(), current);
    this.discard(current);
  }

  discard(p: Proposal): void {
    this.proposals.update((list) => list.filter((x) => x.id !== p.id));
  }
}
