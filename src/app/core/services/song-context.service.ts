import { Injectable, computed, signal } from '@angular/core';

/**
 * The live "this song, in this key, at this tempo" context — the spine of the studio.
 * Every panel (lyrics, harmony, chart, playback, Hermes) reads it, so changing the key or
 * tempo once updates chord labels, the chart, playback, and the AI's context together.
 * See docs/03-design-and-architecture.md §3.
 */
@Injectable({ providedIn: 'root' })
export class SongContextService {
  /** The id of the song currently open in the Workbench (null on the catalog/home). */
  readonly songId = signal<string | null>(null);

  /** Current key as a pitch class 0–11. Defaults to C (0). */
  readonly key = signal<number>(0);

  /** Beats per minute. */
  readonly tempo = signal<number>(80);

  /** Time signature, e.g. "4/4", "6/8". */
  readonly timeSignature = signal<string>('4/4');

  /** Show chords as Nashville numbers (true) or chord names (false), app-wide. */
  readonly showNashville = signal<boolean>(false);

  /** Beats per bar, derived from the time signature's numerator. */
  readonly beatsPerBar = computed(() => {
    const n = parseInt(this.timeSignature().split('/')[0], 10);
    return Number.isFinite(n) && n > 0 ? n : 4;
  });

  /** Load a song's context (called when the Workbench opens a song). */
  load(songId: string, key: number, tempo: number, timeSignature: string): void {
    this.songId.set(songId);
    this.setKey(key);
    this.tempo.set(tempo);
    this.timeSignature.set(timeSignature);
  }

  setKey(index: number): void {
    this.key.set(((index % 12) + 12) % 12);
  }

  setTempo(bpm: number): void {
    this.tempo.set(Math.max(20, Math.min(320, Math.round(bpm))));
  }

  setTimeSignature(sig: string): void {
    this.timeSignature.set(sig);
  }

  toggleNashville(): void {
    this.showNashville.set(!this.showNashville());
  }

  /** Clear the context (leaving the Workbench). */
  clear(): void {
    this.songId.set(null);
  }
}
