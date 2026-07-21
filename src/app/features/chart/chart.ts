import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { TransposeService } from '../../core/services/transpose.service';
import { ChartService } from '../../core/services/chart.service';
import { KEY_NAMES } from '../../core/services/theory.service';
import { Song } from '../../core/models/song.model';

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
        <div class="flex flex-wrap items-center gap-3 print:hidden">
          <a [routerLink]="['/songs', song.id]" class="text-sm text-slate-500 hover:text-brand-600"
            >← Workbench</a
          >
          <h1 class="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            {{ song.title }}
          </h1>

          <div class="ml-auto flex flex-wrap items-center gap-2">
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

        <!-- Export toolbar -->
        <div class="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" class="btn-ghost py-1.5 text-sm" (click)="exportChordPro(song)">
            Export ChordPro
          </button>
          <button type="button" class="btn-ghost py-1.5 text-sm" (click)="exportMusicXml(song)">
            Export MusicXML
          </button>
          <button type="button" class="btn-ghost py-1.5 text-sm" (click)="print()">
            Print / PDF
          </button>
        </div>

        <!-- Chart -->
        <div
          id="chart-print"
          class="card mt-6 font-mono text-sm leading-relaxed print:border-0 print:shadow-none"
        >
          <h2 class="mb-4 hidden font-sans text-xl font-bold print:block">{{ song.title }}</h2>
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
      </div>
    }
  `,
  styles: [
    `
      @media print {
        :host {
          display: block;
        }
      }
    `,
  ],
})
export class ChartView {
  readonly id = input.required<string>();
  private readonly store = inject(SongStore);
  private readonly transpose = inject(TransposeService);
  private readonly chart = inject(ChartService);

  readonly keyNames = KEY_NAMES;
  readonly mode = signal<ChartMode>('chords');
  readonly toKey = signal<number | null>(null);
  readonly current = computed(() => this.store.get(this.id()));

  constructor() {
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

  exportChordPro(song: Song): void {
    this.download(
      `${this.slug(song.title)}.cho`,
      this.chart.toChordPro(song, this.toKey() ?? song.key),
      'text/plain',
    );
  }

  exportMusicXml(song: Song): void {
    this.download(
      `${this.slug(song.title)}.musicxml`,
      this.chart.toMusicXML(song, this.toKey() ?? song.key),
      'application/vnd.recordare.musicxml+xml',
    );
  }

  print(): void {
    if (typeof window !== 'undefined') window.print();
  }

  private download(filename: string, content: string, type: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private slug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'song'
    );
  }
}
