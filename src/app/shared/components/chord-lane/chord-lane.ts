import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ChordEvent, Section } from '../../../core/models/song.model';
import { DiatonicChord, TheoryService } from '../../../core/services/theory.service';
import { TransposeService } from '../../../core/services/transpose.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-chord-lane',
  template: `
    <div>
      <!-- Current progression -->
      <div class="flex flex-wrap items-center gap-2">
        @for (ch of section().progression; track $index) {
          <span
            class="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 font-mono text-sm text-brand-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-brand-300"
          >
            {{ label(ch) }}
            <span class="flex opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                class="px-1 text-slate-400 hover:text-slate-700"
                title="Move left"
                (click)="move($index, -1)"
              >
                ‹
              </button>
              <button
                type="button"
                class="px-1 text-slate-400 hover:text-slate-700"
                title="Move right"
                (click)="move($index, 1)"
              >
                ›
              </button>
              <button
                type="button"
                class="px-1 text-slate-400 hover:text-red-500"
                title="Remove"
                (click)="removeAt($index)"
              >
                ✕
              </button>
            </span>
          </span>
        } @empty {
          <span class="text-sm italic text-slate-400">No chords yet — add from the palette.</span>
        }

        @if (section().progression.length) {
          <button type="button" class="btn-ghost ml-1 py-1 text-xs" (click)="play()">
            {{ audio.playing() ? '■ Stop' : '▶ Play' }}
          </button>
        }
      </div>

      <!-- Palette -->
      <div class="mt-3">
        <button
          type="button"
          class="text-xs font-semibold text-slate-500 hover:text-brand-600"
          (click)="paletteOpen.set(!paletteOpen())"
        >
          {{ paletteOpen() ? '▾' : '▸' }} Add chord
        </button>
        @if (paletteOpen()) {
          <div class="mt-2 space-y-2">
            <div>
              <p class="text-xs font-semibold text-slate-400">In key</p>
              <div class="mt-1 flex flex-wrap gap-1">
                @for (c of diatonic(); track c.name) {
                  <button type="button" class="chip py-0.5 font-mono text-xs" (click)="add(c)">
                    {{ paletteLabel(c) }}
                  </button>
                }
              </div>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400">Colors</p>
              <div class="mt-1 flex flex-wrap gap-1">
                @for (c of borrowed(); track c.name) {
                  <button type="button" class="chip py-0.5 font-mono text-xs" (click)="add(c)">
                    {{ paletteLabel(c) }}
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ChordLane {
  readonly section = input.required<Section>();
  readonly songKey = input.required<number>();
  readonly tempo = input<number>(80);
  readonly showNashville = input<boolean>(false);
  readonly change = output<Partial<Section>>();

  private readonly theory = inject(TheoryService);
  private readonly transpose = inject(TransposeService);
  readonly audio = inject(AudioService);

  readonly paletteOpen = signal(false);
  readonly diatonic = computed(() => this.theory.diatonicChords(this.songKey()));
  readonly borrowed = computed(() => this.theory.borrowedChords(this.songKey()));

  /** How a chord in the progression renders (name in the song key, or Nashville). */
  label(ch: ChordEvent): string {
    return this.showNashville()
      ? this.transpose.chordToNashville(ch.symbol, this.songKey())
      : ch.symbol;
  }

  paletteLabel(c: DiatonicChord): string {
    return this.showNashville() ? c.numeral : c.name;
  }

  add(c: DiatonicChord): void {
    const prog = this.section().progression;
    const event: ChordEvent = {
      symbol: c.name,
      nashville: c.numeral,
      bar: prog.length + 1,
      beat: 1,
      durationBeats: 4,
    };
    this.change.emit({ progression: [...prog, event] });
  }

  removeAt(i: number): void {
    const prog = this.section().progression.filter((_, idx) => idx !== i);
    this.change.emit({ progression: prog });
  }

  move(i: number, dir: -1 | 1): void {
    const prog = [...this.section().progression];
    const target = i + dir;
    if (target < 0 || target >= prog.length) return;
    [prog[i], prog[target]] = [prog[target], prog[i]];
    this.change.emit({ progression: prog });
  }

  play(): void {
    if (this.audio.playing()) {
      this.audio.stop();
      return;
    }
    const chords = this.section().progression.map((ch) => ({
      symbol: ch.symbol,
      beats: ch.durationBeats,
    }));
    this.audio.playProgression(chords, this.tempo());
  }
}
