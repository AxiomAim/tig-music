import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SongStore } from '../../core/services/song-store.service';
import { SongContextService } from '../../core/services/song-context.service';
import { KEY_NAMES } from '../../core/services/theory.service';
import { TransposeService } from '../../core/services/transpose.service';
import {
  SECTION_TYPES,
  Section,
  SONG_STATUSES,
  SongStatus,
  SectionType,
  VersionSnapshot,
} from '../../core/models/song.model';
import { SectionEditor } from '../../shared/components/section-editor/section-editor';
import { ChordLane } from '../../shared/components/chord-lane/chord-lane';
import { TakesStrip } from '../../shared/components/takes-strip/takes-strip';
import { HermesPanel } from '../../shared/components/hermes-panel/hermes-panel';
import { CommandBar } from '../../shared/components/command-bar/command-bar';

@Component({
  selector: 'app-workbench',
  imports: [RouterLink, SectionEditor, ChordLane, TakesStrip, HermesPanel, CommandBar],
  template: `
    @let song = current();
    @if (!song) {
      <div class="mx-auto max-w-3xl px-4 py-20 text-center">
        <p class="text-slate-500 dark:text-slate-400">Song not found.</p>
        <a routerLink="/songs" class="btn-ghost mt-4">← Back to your songs</a>
      </div>
    } @else {
      <!-- Context bar (the spine) -->
      <div
        class="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
      >
        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a routerLink="/songs" class="text-sm text-slate-500 hover:text-brand-600">← Songs</a>
          <input
            class="input min-w-40 flex-1 py-1 font-heading text-lg font-bold"
            [value]="song.title"
            (change)="setTitle(song.id, $any($event.target).value)"
          />

          <label class="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            Key
            <select
              class="input py-1"
              [value]="song.key"
              (change)="changeKey(+$any($event.target).value)"
            >
              @for (k of keyNames; track $index) {
                <option [value]="$index" [selected]="$index === song.key">{{ k }}</option>
              }
            </select>
          </label>

          <label class="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            Tempo
            <input
              class="input w-20 py-1"
              type="number"
              [value]="song.tempo"
              (change)="setTempo(song.id, +$any($event.target).value)"
            />
          </label>

          <label class="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              [checked]="ctx.showNashville()"
              (change)="ctx.toggleNashville()"
            />
            Nashville
          </label>

          <select
            class="input py-1 text-sm capitalize"
            [value]="song.status"
            (change)="setStatus(song.id, $any($event.target).value)"
          >
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="s === song.status">{{ s }}</option>
            }
          </select>

          <!-- Save state — every edit autosaves; this is the receipt. -->
          <span class="min-w-16 text-xs" aria-live="polite">
            @switch (store.saveState()) {
              @case ('saving') {
                <span class="text-slate-400">Saving…</span>
              }
              @case ('saved') {
                <span class="text-emerald-600 dark:text-emerald-400">Saved ✓</span>
              }
              @case ('error') {
                <span
                  class="font-medium text-red-500"
                  title="Check your connection — your latest edit did not reach the server. It will retry on your next change."
                  >⚠ Not saved</span
                >
              }
              @default {}
            }
          </span>

          <a [routerLink]="['/songs', song.id, 'chart']" class="btn-ghost py-1.5 text-sm"
            >Chart →</a
          >
          <a [routerLink]="['/songs', song.id, 'release']" class="btn-ghost py-1.5 text-sm"
            >Release →</a
          >
        </div>
      </div>

      <div class="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-8">
        <!-- Sections -->
        <div class="space-y-6">
          @for (sec of song.sections; track sec.id) {
            <div>
              <app-section-editor
                [section]="sec"
                (change)="onSection(song.id, sec.id, $event)"
                (changeType)="store.changeSectionType(song.id, sec.id, $event)"
                (remove)="store.removeSection(song.id, sec.id)"
                (moveUp)="store.moveSection(song.id, sec.id, -1)"
                (moveDown)="store.moveSection(song.id, sec.id, 1)"
                (duplicate)="store.duplicateSection(song.id, sec.id)"
              />
              <div class="mt-2 px-1">
                <app-chord-lane
                  [section]="sec"
                  [songKey]="song.key"
                  [tempo]="song.tempo"
                  [showNashville]="ctx.showNashville()"
                  (change)="onSection(song.id, sec.id, $event)"
                />
              </div>
            </div>
          }

          <!-- Add section -->
          <div
            class="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700"
          >
            <span class="text-sm text-slate-500">Add a section:</span>
            @for (t of addable; track t) {
              <button type="button" class="chip capitalize" (click)="store.addSection(song.id, t)">
                + {{ t }}
              </button>
            }
          </div>
        </div>

        <div class="space-y-6 lg:sticky lg:top-32 lg:self-start">
          <!-- Capture & Demo (E5) -->
          <app-takes-strip
            [songId]="song.id"
            [tempo]="song.tempo"
            [songKey]="song.key"
            [beatsPerBar]="ctx.beatsPerBar()"
          />

          <!-- Version history (US-3.3) -->
          <aside class="card">
            <h2 class="font-heading font-semibold text-slate-900 dark:text-white">Versions</h2>
            <div class="mt-2 flex gap-2">
              <input
                class="input flex-1 py-1 text-sm"
                placeholder="Name this version…"
                [value]="versionLabel()"
                (input)="versionLabel.set($any($event.target).value)"
              />
              <button type="button" class="btn-ghost py-1 text-sm" (click)="saveVersion(song.id)">
                Save
              </button>
            </div>
            <ul class="mt-3 space-y-1.5">
              @for (v of versions(); track v.id) {
                <li class="flex items-center justify-between gap-2 text-sm">
                  <span class="truncate text-slate-600 dark:text-slate-300">{{ v.label }}</span>
                  <button
                    type="button"
                    class="text-xs text-brand-600 hover:underline"
                    (click)="store.restore(song.id, v)"
                  >
                    Restore
                  </button>
                </li>
              } @empty {
                <li class="text-xs text-slate-400">
                  Save a version before a big change; restore it anytime.
                </li>
              }
            </ul>
          </aside>

          <!-- Hermes — the AI co-writer (E7) -->
          <app-hermes-panel [song]="song" />
        </div>
      </div>

      <!-- ⌘K command bar — Hermes one gesture away (US-7.4) -->
      <app-command-bar [song]="song" />
    }
  `,
})
export class Workbench {
  readonly id = input.required<string>();
  readonly store = inject(SongStore);
  readonly ctx = inject(SongContextService);
  private readonly transpose = inject(TransposeService);

  readonly keyNames = KEY_NAMES;
  readonly statuses = SONG_STATUSES;
  readonly addable: SectionType[] = SECTION_TYPES;
  readonly current = computed(() => this.store.get(this.id()));

  readonly versionLabel = signal('');
  readonly versions = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.store.watchVersions(id))),
    { initialValue: [] as VersionSnapshot[] },
  );

  constructor() {
    // Mirror the open song's key/tempo into the shared context — the live spine.
    effect(() => {
      const song = this.current();
      if (song) this.ctx.load(song.id, song.key, song.tempo, song.timeSignature);
    });
  }

  async saveVersion(songId: string): Promise<void> {
    await this.store.snapshot(songId, this.versionLabel());
    this.versionLabel.set('');
  }

  onSection(songId: string, sectionId: string, patch: Partial<Section>): void {
    this.store.patchSection(songId, sectionId, patch);
  }

  setTitle(songId: string, title: string): void {
    this.store.updateMeta(songId, { title });
  }

  setTempo(songId: string, tempo: number): void {
    this.store.updateMeta(songId, { tempo });
  }

  setStatus(songId: string, status: SongStatus): void {
    this.store.updateMeta(songId, { status });
  }

  /** Change key: re-spell every chord — progression AND inline lyric anchors — to the new key
   *  so the song stays musically the same. */
  changeKey(newKey: number): void {
    const song = this.current();
    if (!song) return;
    const from = song.key;
    const sections = song.sections.map((sec) => ({
      ...sec,
      progression: sec.progression.map((ch) => ({
        ...ch,
        symbol: this.transpose.transposeChord(ch.symbol, from, newKey),
      })),
      lines: sec.lines.map((l) => ({
        ...l,
        chordAnchors: l.chordAnchors.map((a) => ({
          ...a,
          symbol: this.transpose.transposeChord(a.symbol, from, newKey),
        })),
      })),
    }));
    this.store.updateMeta(song.id, { key: newKey, sections });
  }
}
