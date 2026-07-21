import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { ReleaseInfo, Song, Writer } from '../../core/models/song.model';

@Component({
  selector: 'app-release',
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
        <div class="flex items-center gap-3">
          <a [routerLink]="['/songs', song.id]" class="text-sm text-slate-500 hover:text-brand-600"
            >← Workbench</a
          >
          <h1 class="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">
            Release · {{ song.title }}
          </h1>
          <span
            class="ml-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
            >{{ song.status }}</span
          >
        </div>

        <!-- Writers & splits -->
        <section class="card mt-6">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-semibold text-slate-900 dark:text-white">
              Writers &amp; splits
            </h2>
            <span class="text-sm" [class.text-red-500]="splitTotal(song) !== 100"
              >{{ splitTotal(song) }}%</span
            >
          </div>
          <div class="mt-3 space-y-2">
            @for (w of song.release.writers; track $index) {
              <div class="flex items-center gap-2">
                <input
                  class="input flex-1 py-1 text-sm"
                  [value]="w.name"
                  (change)="setWriter(song, $index, { name: $any($event.target).value })"
                  placeholder="Writer name"
                />
                <input
                  class="input w-20 py-1 text-sm"
                  type="number"
                  [value]="w.splitPct"
                  (change)="setWriter(song, $index, { splitPct: +$any($event.target).value })"
                />
                <span class="text-sm text-slate-400">%</span>
                <button
                  type="button"
                  class="text-slate-400 hover:text-red-500"
                  (click)="removeWriter(song, $index)"
                >
                  ✕
                </button>
              </div>
            } @empty {
              <p class="text-sm text-slate-400">Add the song's writers to prepare a split sheet.</p>
            }
          </div>
          <button type="button" class="btn-ghost mt-3 py-1 text-sm" (click)="addWriter(song)">
            + Add writer
          </button>
        </section>

        <!-- Metadata -->
        <section class="card mt-6 grid gap-4 sm:grid-cols-2">
          <label class="text-sm"
            >Release date
            <input
              class="input mt-1 w-full py-1"
              type="date"
              [value]="song.release.releaseDate ?? ''"
              (change)="patch(song, { releaseDate: $any($event.target).value })"
            />
          </label>
          <label class="text-sm"
            >Distributor
            <select
              class="input mt-1 w-full py-1"
              [value]="song.release.distributor ?? ''"
              (change)="patch(song, { distributor: $any($event.target).value || undefined })"
            >
              <option value="">—</option>
              <option value="DistroKid">DistroKid</option>
              <option value="RouteNote">RouteNote</option>
            </select>
          </label>
          <label class="text-sm"
            >ISWC
            <input
              class="input mt-1 w-full py-1"
              [value]="song.release.iswc ?? ''"
              (change)="patch(song, { iswc: $any($event.target).value })"
              placeholder="T-000.000.000-0"
            />
          </label>
          <label class="text-sm"
            >CCLI #
            <input
              class="input mt-1 w-full py-1"
              [value]="song.release.ccli ?? ''"
              (change)="patch(song, { ccli: $any($event.target).value })"
            />
          </label>
          <label class="text-sm sm:col-span-2"
            >Spotify track URL
            <input
              class="input mt-1 w-full py-1"
              [value]="song.release.spotifyTrackUrl ?? ''"
              (change)="patch(song, { spotifyTrackUrl: $any($event.target).value })"
              placeholder="https://open.spotify.com/track/…"
            />
          </label>
        </section>

        <!-- Provenance / human-authorship log (US-6.4) -->
        <section class="card mt-6">
          <h2 class="font-heading font-semibold text-slate-900 dark:text-white">
            Authorship &amp; provenance
          </h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Every AI-assisted edit you accepted is logged here, so this song has a clean,
            human-authored record for release.
          </p>
          <ul class="mt-3 space-y-1.5 text-sm">
            @for (p of song.provenance; track $index) {
              <li class="flex items-start gap-2">
                <span
                  class="mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold"
                  [class]="
                    p.kind === 'ai-suggested'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  "
                >
                  {{ p.kind === 'ai-suggested' ? 'AI-assisted' : 'Human' }}
                </span>
                <span class="text-slate-600 dark:text-slate-300">{{ p.summary || p.target }}</span>
              </li>
            } @empty {
              <li class="text-sm text-emerald-600 dark:text-emerald-400">
                Fully human-authored — no AI suggestions accepted.
              </li>
            }
          </ul>
        </section>
      </div>
    }
  `,
})
export class Release {
  readonly id = input.required<string>();
  private readonly store = inject(SongStore);
  readonly current = computed(() => this.store.get(this.id()));

  splitTotal(song: Song): number {
    return song.release.writers.reduce((sum, w) => sum + (w.splitPct || 0), 0);
  }

  patch(song: Song, partial: Partial<ReleaseInfo>): void {
    this.store.updateMeta(song.id, { release: { ...song.release, ...partial } });
  }

  addWriter(song: Song): void {
    this.patch(song, { writers: [...song.release.writers, { name: '', splitPct: 0 }] });
  }

  removeWriter(song: Song, index: number): void {
    this.patch(song, { writers: song.release.writers.filter((_, i) => i !== index) });
  }

  setWriter(song: Song, index: number, partial: Partial<Writer>): void {
    const writers = song.release.writers.map((w, i) => (i === index ? { ...w, ...partial } : w));
    this.patch(song, { writers });
  }
}
