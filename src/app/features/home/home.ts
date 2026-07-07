import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface Pillar {
  icon: string;
  name: string;
  desc: string;
  featured?: boolean;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40"
      ></div>
      <div class="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <span class="chip chip-active">🎼 a songwriting studio</span>
        <h1
          class="mt-5 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white"
        >
          Write the song, <span class="text-brand-600 dark:text-brand-400">not the paperwork</span>.
        </h1>
        <p class="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          One place to take an idea from a hummed line to a released track — lyrics, harmony in
          Nashville numbers, a lead sheet, and a demo — with <strong>Hermes</strong>, an AI
          co-writer that proposes and never acts, so the authorship stays yours.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          @if (auth.isSignedIn()) {
            <a routerLink="/songs" class="btn-primary text-base">Open your songs →</a>
          } @else {
            <button type="button" class="btn-primary text-base" (click)="auth.signInWithGoogle()">
              Sign in to start writing →
            </button>
          }
          <a routerLink="/about" class="btn-ghost text-base">What is Tig Music?</a>
        </div>
        @if (!auth.isSignedIn()) {
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Your songs are private to your account — sign in to create and see them.
          </p>
        }
      </div>
    </section>

    <!-- Pillars -->
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 class="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        The seven pillars
      </h2>
      <p class="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        A song is one object — its words, chords, melody, demos, and release all travel together.
      </p>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of pillars; track p.name) {
          <div class="card" [class.ring-2]="p.featured" [class.ring-brand-400]="p.featured">
            <div class="text-2xl">{{ p.icon }}</div>
            <h3 class="mt-3 font-heading text-lg font-semibold text-slate-900 dark:text-white">
              {{ p.name }}
              @if (p.featured) {
                <span class="ml-1 text-brand-500">★</span>
              }
            </h3>
            <p class="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{{ p.desc }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);

  pillars: Pillar[] = [
    {
      icon: '✍️',
      name: 'Lyric Lab',
      desc: 'Section-based lyric editor with rhyme, meter, and inline scripture search.',
    },
    {
      icon: '🎹',
      name: 'Harmony Sketchpad',
      desc: 'Sketch chords and melody in-key, Nashville-native, with blues colors.',
    },
    {
      icon: '📄',
      name: 'Chart & Lead Sheet',
      desc: 'Chord, Nashville, and lead-sheet charts — transposed to any key.',
    },
    {
      icon: '🎙️',
      name: 'Capture & Demo',
      desc: 'Record demo takes and ideas straight onto the song, with a metronome.',
    },
    {
      icon: '🎛️',
      name: 'Song Workbench',
      desc: 'One home per song that ties it all together — with Hermes in the margin.',
      featured: true,
    },
    {
      icon: '🗂️',
      name: 'Catalog & Release',
      desc: 'Your catalog with a lifecycle and clean release + authorship records.',
    },
    {
      icon: '✨',
      name: 'Hermes',
      desc: 'An AI co-writer that proposes options and never acts — you stay the author.',
      featured: true,
    },
  ];
}
