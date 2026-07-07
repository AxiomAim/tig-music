import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { TheoryService } from '../../core/services/theory.service';
import { ChartService } from '../../core/services/chart.service';
import { SONG_STATUSES, SongStatus } from '../../core/models/song.model';

@Component({
  selector: 'app-catalog',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
            Your songs
          </h1>
          <p class="mt-1 text-slate-600 dark:text-slate-300">
            {{ filtered().length }} of {{ store.songs().length }} songs
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-ghost" (click)="fileInput.click()">
            Import ChordPro
          </button>
          <input
            #fileInput
            type="file"
            accept=".cho,.crd,.chopro,.chordpro,.txt"
            class="hidden"
            (change)="importChordPro($event)"
          />
          <button type="button" class="btn-primary" (click)="newSong()">+ New song</button>
        </div>
      </div>

      <!-- View toggle -->
      <div class="mt-6 flex items-center gap-2">
        <button
          type="button"
          class="chip"
          [class.chip-active]="view() === 'list'"
          (click)="view.set('list')"
        >
          List
        </button>
        <button
          type="button"
          class="chip"
          [class.chip-active]="view() === 'board'"
          (click)="view.set('board')"
        >
          Board
        </button>
      </div>

      <!-- Filters -->
      <div class="mt-4 flex flex-wrap items-center gap-2" [class.hidden]="view() === 'board'">
        <input
          class="input w-56"
          type="search"
          placeholder="Search titles & tags…"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <button
          type="button"
          class="chip"
          [class.chip-active]="status() === 'all'"
          (click)="status.set('all')"
        >
          All
        </button>
        @for (s of statuses; track s) {
          <button
            type="button"
            class="chip capitalize"
            [class.chip-active]="status() === s"
            (click)="status.set(s)"
          >
            {{ s }}
          </button>
        }
      </div>

      <!-- List -->
      <div
        class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        [class.hidden]="view() === 'board'"
      >
        @for (song of filtered(); track song.id) {
          <a
            [routerLink]="['/songs', song.id]"
            class="card block transition hover:border-brand-300 hover:shadow-md"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-heading text-lg font-semibold text-slate-900 dark:text-white">
                {{ song.title }}
              </h3>
              <span
                class="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                >{{ song.status }}</span
              >
            </div>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Key of {{ theory.keyName(song.key) }} · {{ song.tempo }} bpm ·
              {{ song.timeSignature }}
            </p>
            @if (song.tags.length) {
              <div class="mt-3 flex flex-wrap gap-1.5">
                @for (t of song.tags; track t) {
                  <span
                    class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >{{ t }}</span
                  >
                }
              </div>
            }
          </a>
        } @empty {
          <p class="text-slate-500 dark:text-slate-400">No songs match. Try a different filter.</p>
        }
      </div>

      <!-- Board (US-6.2) -->
      @if (view() === 'board') {
        <div class="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          @for (col of board(); track col.status) {
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
              <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 capitalize">
                {{ col.status }} · {{ col.songs.length }}
              </h3>
              <div class="space-y-2">
                @for (song of col.songs; track song.id) {
                  <div class="card p-3">
                    <div class="flex items-start justify-between gap-2">
                      <a
                        [routerLink]="['/songs', song.id]"
                        class="font-semibold text-slate-900 hover:text-brand-600 dark:text-white"
                        >{{ song.title }}</a
                      >
                    </div>
                    <p class="mt-1 text-xs text-slate-400">
                      {{ theory.keyName(song.key) }} · {{ song.tempo }} bpm
                    </p>
                    <div class="mt-2 flex justify-between text-slate-400">
                      <button
                        type="button"
                        class="text-xs hover:text-brand-600 disabled:opacity-30"
                        [disabled]="col.index === 0"
                        (click)="moveStatus(song, -1)"
                      >
                        ‹ back
                      </button>
                      <button
                        type="button"
                        class="text-xs hover:text-brand-600 disabled:opacity-30"
                        [disabled]="col.index === statuses.length - 1"
                        (click)="moveStatus(song, 1)"
                      >
                        next ›
                      </button>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-300 dark:text-slate-600">—</p>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Catalog {
  readonly store = inject(SongStore);
  readonly theory = inject(TheoryService);
  private readonly chart = inject(ChartService);
  private readonly router = inject(Router);

  readonly statuses = SONG_STATUSES;
  readonly query = signal('');
  readonly status = signal<SongStatus | 'all'>('all');
  readonly view = signal<'list' | 'board'>('list');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const st = this.status();
    return this.store.songs().filter((s) => {
      if (st !== 'all' && s.status !== st) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    });
  });

  /** Songs grouped into one column per status, for the board view. */
  readonly board = computed(() =>
    this.statuses.map((status, index) => ({
      status,
      index,
      songs: this.store.songs().filter((s) => s.status === status),
    })),
  );

  /** Advance/retreat a song along the pipeline (board arrows). */
  moveStatus(song: { id: string; status: SongStatus }, dir: -1 | 1): void {
    const i = this.statuses.indexOf(song.status);
    const next = this.statuses[i + dir];
    if (next) this.store.updateMeta(song.id, { status: next });
  }

  async newSong(): Promise<void> {
    const song = await this.store.create();
    await this.router.navigate(['/songs', song.id]);
  }

  /** Import a ChordPro file as a new song, then open it (US-4.6). */
  async importChordPro(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    input.value = '';
    const parsed = this.chart.fromChordPro(text);
    const song = await this.store.create(parsed.title ?? file.name.replace(/\.[^.]+$/, ''));
    this.store.updateMeta(song.id, {
      title: parsed.title ?? song.title,
      key: parsed.key ?? song.key,
      tempo: parsed.tempo ?? song.tempo,
      timeSignature: parsed.timeSignature ?? song.timeSignature,
      sections: parsed.sections.length ? parsed.sections : song.sections,
    });
    await this.router.navigate(['/songs', song.id]);
  }
}
