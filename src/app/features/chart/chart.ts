import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { TransposeService } from '../../core/services/transpose.service';
import { KEY_NAMES } from '../../core/services/theory.service';

type ChartMode = 'chords' | 'nashville';

@Component({
  selector: 'app-chart',
  imports: [RouterLink],
  template: `
    @let song = current();
    @if (!song) {
      <div class="mx-auto max-w-3xl px-4 py-20 text-center">
        <p class="text-slate-500 dark:text-slate-400">Song not found.</p>
        <a routerLink="/songs" class="btn-ghost mt-4">← Back to your songs</a>
      </div>
    } @else {
      <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-center gap-3">
          <a [routerLink]="['/songs', song.id]" class="text-sm text-slate-500 hover:text-brand-600"
            >← Workbench</a
          >
          <h1 class="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            {{ song.title }}
          </h1>

          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="chip"
              [class.chip-active]="mode() === 'chords'"
              (click)="mode.set('chords')"
            >
              Chords
            </button>
            <button
              type="button"
              class="chip"
              [class.chip-active]="mode() === 'nashville'"
              (click)="mode.set('nashville')"
            >
              Nashville
            </button>
            @if (mode() === 'chords') {
              <label class="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                Key
                <select
                  class="input py-1"
                  [value]="toKey() ?? song.key"
                  (change)="toKey.set(+$any($event.target).value)"
                >
                  @for (k of keyNames; track $index) {
                    <option [value]="$index">{{ k }}</option>
                  }
                </select>
              </label>
            }
          </div>
        </div>

        <!-- Chart -->
        <div class="card mt-6 font-mono text-sm leading-relaxed">
          @for (sec of song.sections; track sec.id) {
            <div class="mb-6 last:mb-0">
              <div
                class="mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400"
              >
                {{ sec.label }}
              </div>
              @if (sec.progression.length) {
                <div class="text-slate-800 dark:text-slate-100">
                  @for (ch of sec.progression; track $index) {
                    <span class="mr-3">{{ render(ch.symbol, song.key) }}</span>
                  }
                </div>
              }
              @for (line of sec.lines; track $index) {
                <div class="text-slate-600 dark:text-slate-300">{{ line.text }}</div>
              }
            </div>
          }
        </div>

        <p class="mt-4 text-xs text-slate-400">
          ChordPro / PDF / MusicXML export arrives with the Chart pillar (M2) — see
          docs/01-features-and-specifications.md.
        </p>
      </div>
    }
  `,
})
export class ChartView {
  readonly id = input.required<string>();
  private readonly store = inject(SongStore);
  private readonly transpose = inject(TransposeService);

  readonly keyNames = KEY_NAMES;
  readonly mode = signal<ChartMode>('chords');
  readonly toKey = signal<number | null>(null);
  readonly current = computed(() => this.store.get(this.id()));

  constructor() {
    // Default the target key to the song's own key once the input resolves.
    effect(() => {
      const song = this.current();
      if (song && this.toKey() === null) this.toKey.set(song.key);
    });
  }

  render(symbol: string, songKey: number): string {
    return this.mode() === 'nashville'
      ? this.transpose.chordToNashville(symbol, songKey)
      : this.transpose.transposeChord(symbol, songKey, this.toKey() ?? songKey);
  }
}
