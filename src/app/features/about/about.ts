import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 class="font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
        About Tig Music
      </h1>
      <div class="mt-6 space-y-4 text-slate-600 dark:text-slate-300">
        <p>
          Tig Music is a songwriting studio — the full pipeline from a first lyric fragment to a
          lead sheet ready for the band and a track ready for Spotify. Where the other tig apps
          teach an instrument, Tig Music supports the craft of writing the song: lyrics, harmony in
          Nashville numbers, charts, demos, and a catalog, with a song kept as one object.
        </p>
        <p>
          Its co-writer, <strong>Hermes</strong>, proposes options — rhymes, scripture ties, chord
          colors, structure notes, titles — and never acts. You accept, edit, or discard, and every
          acceptance is logged, so a released song keeps a clean, human-authored provenance trail.
        </p>
        <p>
          It's part of the
          <a
            class="font-semibold text-brand-600 hover:underline dark:text-brand-400"
            href="https://tigpowell.com"
            target="_blank"
            rel="noopener"
            >tigpowell.com</a
          >
          family, alongside
          <a
            class="font-semibold text-brand-600 hover:underline dark:text-brand-400"
            href="https://guitar.tigpowell.com"
            target="_blank"
            rel="noopener"
            >Tig Guitar</a
          >, Tig Banjo, and Tig Worship — where a finished song can flow on to a worship team.
        </p>
        <p>
          This is an early build: the foundation is in place (the Song Workbench, live key/tempo
          context, Nashville numbers, and transpose). The rest of the seven pillars and Hermes are
          on the way — the full plan is in the project docs.
        </p>
      </div>
      <div class="mt-8 flex gap-3">
        <a routerLink="/songs" class="btn-primary">Open your songs</a>
        <a routerLink="/" class="btn-ghost">← Back home</a>
      </div>
    </div>
  `,
})
export class About {}
