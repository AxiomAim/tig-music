// ============================================================
// Tig Music — remote Hermes client.
// Calls the `hermesPropose` Cloud Function, which proxies to the Hermes agent on the Mac mini
// (through the aim.aimos.it.com tunnel) and returns editable Proposal cards. The browser never
// holds the Hermes key or Cloudflare Access token, and never talks to the tunnel directly —
// so it sidesteps the Host/Origin restriction that breaks the chat WebSocket.
// See functions/src/index.ts and docs/05-tig-music-update.md.
// ============================================================

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Proposal } from '../models/hermes.model';
import { Section, Song } from '../models/song.model';
import { KEY_NAMES } from './theory.service';

interface ProposeResponse {
  proposals: Proposal[];
  source: 'hermes';
}

@Injectable({ providedIn: 'root' })
export class HermesRemoteService {
  // Optional so the app (and unit tests) run without a Functions provider configured.
  private readonly fns = inject(Functions, { optional: true });

  /** Ask the real Hermes agent (via the Cloud Function) for suggestions. Returns [] if the
   *  agent/function is unreachable, so the caller can fall back to the local proposer. */
  async ask(song: Song, sectionId: string | undefined, input: string): Promise<Proposal[]> {
    if (!this.fns) return [];
    const section = sectionId ? song.sections.find((s) => s.id === sectionId) : undefined;
    const call = httpsCallable<unknown, ProposeResponse>(this.fns, 'hermesPropose');
    try {
      const res = await call({
        skill: 'ask',
        sectionId,
        input,
        song: {
          title: song.title,
          keyName: KEY_NAMES[song.key],
          tempo: song.tempo,
          sectionLabel: section?.label,
          sectionLyrics: this.lyrics(section),
        },
      });
      return res.data?.proposals ?? [];
    } catch {
      return []; // unreachable / not configured → graceful fallback
    }
  }

  private lyrics(section?: Section): string | undefined {
    const text = section?.lines
      .map((l) => l.text)
      .filter(Boolean)
      .join('\n');
    return text || undefined;
  }
}
