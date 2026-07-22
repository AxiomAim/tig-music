import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RecordingService } from '../../../core/services/recording.service';
import { AudioService } from '../../../core/services/audio.service';
import { Take } from '../../../core/models/song.model';
import { KEY_NAMES } from '../../../core/services/theory.service';

@Component({
  selector: 'app-takes-strip',
  template: `
    <div class="card">
      <div class="flex items-center justify-between">
        <h2 class="font-heading font-semibold text-slate-900 dark:text-white">Demo takes</h2>
        <button
          type="button"
          class="chip py-0.5 text-xs"
          [class.chip-active]="audio.metronomeOn()"
          (click)="audio.toggleMetronome(tempo(), beatsPerBar())"
        >
          {{ audio.metronomeOn() ? '■ Click' : '♩ Click' }}
        </button>
      </div>

      @if (rec.supported) {
        <button
          type="button"
          class="btn-primary mt-3 w-full"
          [class.!bg-red-600]="rec.recording()"
          (click)="toggleRecord()"
        >
          {{ rec.recording() ? '■ Stop & save' : '● Record a take' }}
        </button>
      } @else {
        <p class="mt-3 text-xs text-slate-400">Recording needs a browser with microphone access.</p>
      }

      @if (rec.lastError(); as err) {
        <p class="mt-2 text-xs font-medium text-red-500" role="alert">{{ err }}</p>
      }

      <ul class="mt-3 space-y-2">
        @for (t of takes(); track t.id) {
          <li class="flex items-center gap-2 text-sm">
            <button type="button" class="icon-btn text-brand-600" title="Play" (click)="play(t)">
              ▶
            </button>
            <span class="flex-1 truncate text-slate-700 dark:text-slate-200">{{ t.label }}</span>
            <span class="text-xs text-slate-400">{{ fmt(t.durationSec) }}</span>
            <button
              type="button"
              class="icon-btn text-slate-400 hover:text-red-500"
              title="Delete"
              (click)="rec.removeTake(songId(), t)"
            >
              ✕
            </button>
          </li>
        } @empty {
          <li class="text-xs text-slate-400">No takes yet. Hum the idea before you lose it.</li>
        }
      </ul>
    </div>
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
    `,
  ],
})
export class TakesStrip {
  readonly songId = input.required<string>();
  readonly tempo = input<number>(80);
  readonly songKey = input<number>(0);
  readonly beatsPerBar = input<number>(4);

  readonly rec = inject(RecordingService);
  readonly audio = inject(AudioService);

  readonly takes = toSignal(
    toObservable(this.songId).pipe(switchMap((id) => this.rec.watchTakes(id))),
    {
      initialValue: [] as Take[],
    },
  );

  async toggleRecord(): Promise<void> {
    if (this.rec.recording()) {
      const result = await this.rec.stopAndGet();
      if (result) {
        const label = `Take ${this.takes().length + 1}`;
        await this.rec.saveTake(this.songId(), result.blob, {
          label,
          durationSec: result.durationSec,
          tempo: this.tempo(),
          key: KEY_NAMES[this.songKey()],
        });
      }
    } else {
      await this.rec.start();
    }
  }

  async play(take: Take): Promise<void> {
    if (typeof Audio === 'undefined') return;
    const url = await this.rec.url(take);
    void new Audio(url).play();
  }

  fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
