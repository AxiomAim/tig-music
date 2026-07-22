import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { LyricLine, SECTION_TYPES, Section, SectionType } from '../../../core/models/song.model';
import { RhymeService, RhymeResults } from '../../../core/services/rhyme.service';
import { ScriptureService } from '../../../core/services/scripture.service';
import { CommandBarService } from '../../../core/services/command-bar.service';
import { Verse } from '../../../core/data/scripture-web';
import { syllablesInLine } from '../../../core/util/syllables';

@Component({
  selector: 'app-section-editor',
  template: `
    <section class="card">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-2">
        <select
          class="input py-1 text-sm capitalize"
          [value]="section().type"
          (change)="setType($any($event.target).value)"
        >
          @for (t of types; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        <input
          class="input flex-1 py-1 text-sm font-semibold"
          [value]="section().label"
          (change)="setLabel($any($event.target).value)"
        />
        <div class="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            class="icon-btn hover:text-brand-500"
            title="Ask Hermes for this section (⌘K)"
            (click)="askHermes()"
          >
            ✨
          </button>
          <button type="button" class="icon-btn" title="Move up" (click)="moveUp.emit()">↑</button>
          <button type="button" class="icon-btn" title="Move down" (click)="moveDown.emit()">
            ↓
          </button>
          <button type="button" class="icon-btn" title="Duplicate" (click)="duplicate.emit()">
            ⧉
          </button>
          <button
            type="button"
            class="icon-btn hover:text-red-500"
            title="Delete"
            (click)="remove.emit()"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Lyrics -->
      <textarea
        class="input mt-3 w-full font-sans leading-7"
        rows="4"
        placeholder="Write the {{ section().type }}…"
        [value]="lyricText()"
        (input)="lyricText.set($any($event.target).value)"
        (change)="commitLyrics()"
      ></textarea>

      <!-- Per-line syllable readout -->
      @if (lines().length) {
        <div class="mt-1 space-y-0.5 text-xs text-slate-400">
          @for (l of lines(); track $index) {
            <div class="flex justify-between gap-2">
              <span class="truncate">{{ l.text || '·' }}</span>
              <span [class.text-amber-500]="l.off">{{ l.syll }}</span>
            </div>
          }
        </div>
      }

      <!-- Craft tools -->
      <div class="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          class="chip"
          [class.chip-active]="tool() === 'rhyme'"
          (click)="toggle('rhyme')"
        >
          Rhymes
        </button>
        <button
          type="button"
          class="chip"
          [class.chip-active]="tool() === 'scripture'"
          (click)="toggle('scripture')"
        >
          Scripture
        </button>
      </div>

      @if (tool() === 'rhyme') {
        <div class="mt-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <input
            class="input w-full py-1 text-sm"
            placeholder="Rhyme a word…"
            (change)="findRhymes($any($event.target).value)"
          />
          @if (rhymes(); as r) {
            @if (r.rhymes.length || r.near.length || r.synonyms.length) {
              @for (
                group of [
                  ['Rhymes', r.rhymes],
                  ['Near', r.near],
                  ['Like', r.synonyms],
                ];
                track group[0]
              ) {
                @if ($any(group[1]).length) {
                  <p class="mt-2 text-xs font-semibold text-slate-500">{{ group[0] }}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    @for (w of $any(group[1]); track w) {
                      <button type="button" class="chip py-0.5 text-xs" (click)="appendWord(w)">
                        {{ w }}
                      </button>
                    }
                  </div>
                }
              }
            } @else {
              <p class="mt-2 text-xs text-slate-400">No matches (or offline).</p>
            }
          }
        </div>
      }

      @if (tool() === 'scripture') {
        <div class="mt-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <input
            class="input w-full py-1 text-sm"
            placeholder="Search WEB scripture (theme or reference)…"
            (input)="searchScripture($any($event.target).value)"
          />
          <div class="mt-2 space-y-2">
            @for (v of verses(); track v.ref) {
              <button
                type="button"
                class="block w-full rounded-md p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                (click)="insertVerse(v)"
              >
                <span class="text-xs font-semibold text-brand-600 dark:text-brand-400">{{
                  v.ref
                }}</span>
                <span class="block text-xs text-slate-600 dark:text-slate-300">{{ v.text }}</span>
              </button>
            } @empty {
              <p class="text-xs text-slate-400">
                Type a theme like “grace” or a reference like “Psalm 23”.
              </p>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .icon-btn {
        display: grid;
        place-items: center;
        height: 1.75rem;
        width: 1.75rem;
        border-radius: 0.375rem;
      }
      .icon-btn:hover {
        background: rgb(241 245 249 / 1);
      }
      :host-context(.dark) .icon-btn:hover {
        background: rgb(30 41 59 / 0.7);
      }
    `,
  ],
})
export class SectionEditor {
  readonly section = input.required<Section>();

  readonly change = output<Section>();
  readonly remove = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly duplicate = output<void>();

  private readonly rhyme = inject(RhymeService);
  private readonly scripture = inject(ScriptureService);
  private readonly commandBar = inject(CommandBarService);

  readonly types = SECTION_TYPES;
  readonly tool = signal<'rhyme' | 'scripture' | null>(null);
  readonly rhymes = signal<RhymeResults | null>(null);
  readonly verses = signal<Verse[]>([]);

  // Editable lyric text, reset whenever the bound section changes.
  readonly lyricText = linkedSignal(() =>
    this.section()
      .lines.map((l) => l.text)
      .join('\n'),
  );

  /** Per-line text + syllable count, flagging lines that break the modal meter. */
  readonly lines = () => {
    const raw = this.lyricText().split('\n');
    const counts = raw.map(syllablesInLine);
    const nonzero = counts.filter((c) => c > 0);
    const modal = this.mode(nonzero);
    return raw.map((text, i) => ({
      text,
      syll: counts[i],
      off: counts[i] > 0 && modal > 0 && Math.abs(counts[i] - modal) > 2,
    }));
  };

  /** Open the ⌘K command bar pre-scoped to this section (inline entry point, US-7.4). */
  askHermes(): void {
    this.commandBar.open({ sectionId: this.section().id });
  }

  setType(type: SectionType): void {
    this.change.emit({ ...this.section(), type });
  }

  setLabel(label: string): void {
    this.change.emit({ ...this.section(), label });
  }

  commitLyrics(): void {
    const lines: LyricLine[] = this.lyricText()
      .split('\n')
      .map((text) => ({ text, chordAnchors: [] }));
    this.change.emit({ ...this.section(), lines });
  }

  toggle(tool: 'rhyme' | 'scripture'): void {
    this.tool.set(this.tool() === tool ? null : tool);
  }

  async findRhymes(word: string): Promise<void> {
    this.rhymes.set(await this.rhyme.lookup(word));
  }

  appendWord(word: string): void {
    this.lyricText.set((this.lyricText() + ' ' + word).trim());
    this.commitLyrics();
  }

  searchScripture(query: string): void {
    this.verses.set(this.scripture.search(query));
  }

  insertVerse(v: Verse): void {
    const text = this.lyricText();
    this.lyricText.set((text ? text + '\n' : '') + v.text);
    this.commitLyrics();
  }

  private mode(nums: number[]): number {
    if (!nums.length) return 0;
    const freq = new Map<number, number>();
    let best = nums[0];
    for (const n of nums) {
      const f = (freq.get(n) ?? 0) + 1;
      freq.set(n, f);
      if (f > (freq.get(best) ?? 0)) best = n;
    }
    return best;
  }
}
