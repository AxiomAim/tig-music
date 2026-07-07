import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { TheoryService } from '../../core/services/theory.service';
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
        <button type="button" class="btn-primary" (click)="newSong()">+ New song</button>
      </div>

      <!-- Filters -->
      <div class="mt-6 flex flex-wrap items-center gap-2">
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
      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  `,
})
export class Catalog {
  readonly store = inject(SongStore);
  readonly theory = inject(TheoryService);
  private readonly router = inject(Router);

  readonly statuses = SONG_STATUSES;
  readonly query = signal('');
  readonly status = signal<SongStatus | 'all'>('all');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const st = this.status();
    return this.store.songs().filter((s) => {
      if (st !== 'all' && s.status !== st) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    });
  });

  async newSong(): Promise<void> {
    const song = await this.store.create();
    await this.router.navigate(['/songs', song.id]);
  }
}
