import { Injectable, inject, signal } from '@angular/core';
import { TransposeService } from './transpose.service';

interface PlayChord {
  symbol: string; // concrete chord name in the key to sound, e.g. "G", "Em", "D7"
  beats: number;
}

/**
 * Minimal Web Audio playback for progressions — a light triad synth, zero asset weight
 * (docs §4, "synth-first"). Good enough to hear changes while writing; sampled instruments
 * are a later swap behind this service. Browser-only; no-ops under SSR / without WebAudio.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly transpose = inject(TransposeService);
  private ctx: AudioContext | null = null;
  private stopAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private metroTimer: ReturnType<typeof setInterval> | null = null;
  private metroBeat = 0;
  private metroNext = 0;

  readonly playing = signal(false);
  readonly metronomeOn = signal(false);

  /** Play a sequence of chords at the given tempo. Restarts if already playing. */
  playProgression(chords: PlayChord[], tempo: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !chords.length) return;
    this.stop();

    const secPerBeat = 60 / Math.max(20, tempo);
    let t = ctx.currentTime + 0.05;
    for (const chord of chords) {
      const dur = Math.max(1, chord.beats) * secPerBeat;
      this.scheduleChord(ctx, chord.symbol, t, dur);
      t += dur;
    }

    this.stopAt = t;
    this.playing.set(true);
    this.timer = setTimeout(() => this.playing.set(false), (t - ctx.currentTime) * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.playing.set(false);
  }

  /** Toggle a click track at the given tempo (accented downbeat every `beatsPerBar`). */
  toggleMetronome(tempo: number, beatsPerBar = 4): void {
    if (this.metronomeOn()) {
      this.stopMetronome();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    const interval = 60 / Math.max(20, tempo);
    this.metroBeat = 0;
    this.metroNext = ctx.currentTime + 0.1;
    // Look-ahead scheduler: enqueue any clicks due in the next 200 ms every 25 ms.
    this.metroTimer = setInterval(() => {
      while (this.metroNext < ctx.currentTime + 0.2) {
        this.click(ctx, this.metroNext, this.metroBeat % beatsPerBar === 0);
        this.metroNext += interval;
        this.metroBeat++;
      }
    }, 25);
    this.metronomeOn.set(true);
  }

  stopMetronome(): void {
    if (this.metroTimer) {
      clearInterval(this.metroTimer);
      this.metroTimer = null;
    }
    this.metroBeat = 0;
    this.metronomeOn.set(false);
  }

  private click(ctx: AudioContext, time: number, accent: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.18, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private scheduleChord(ctx: AudioContext, symbol: string, start: number, dur: number): void {
    for (const freq of this.chordFrequencies(symbol)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      // Short attack, gentle release — a plucked/keys feel.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.95);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    }
  }

  /** Concrete chord symbol → triad frequencies (root position, octave 4). */
  private chordFrequencies(symbol: string): number[] {
    const p = this.transpose.parse(symbol);
    if (!p) return [];
    const s = p.suffix;
    let intervals = [0, 4, 7]; // major
    if (/^dim|^°|^m?7?b5/.test(s)) intervals = [0, 3, 6];
    else if (/^m(?!aj)/.test(s)) intervals = [0, 3, 7];
    if (/7/.test(s)) intervals = [...intervals, intervals[2] + (/(maj7|M7)/.test(s) ? 4 : 3)];
    return intervals.map((iv) => this.midiFreq(60 + p.rootIndex + iv));
  }

  private midiFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx ??= new Ctor();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }
}
