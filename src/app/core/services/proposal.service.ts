// ============================================================
// Tig Music — the ONE place an accepted Hermes proposal mutates the song.
//
// Propose-never-act: a proposal changes nothing until the writer Accepts. Accept runs here —
// it applies the proposal's `apply` payload (the only mutation path) and logs a provenance entry
// so the change is auditable and the song stays cleanly human-authored. Shared by the Hermes
// panel and the ⌘K command bar so both go through the same guardrail.
// ============================================================

import { Injectable, inject } from '@angular/core';
import { SongStore } from './song-store.service';
import { Proposal } from '../models/hermes.model';
import { Song } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly store = inject(SongStore);

  /** Accept a proposal: apply its edit (if any) and log a provenance entry. Advisory notes
   *  (no `apply`) are still logged as considered, but mutate nothing. Pass the *current* proposal
   *  so any inline edit the writer made is what lands. */
  accept(song: Song, p: Proposal): void {
    if (p.apply) this.applyToSong(song, p);
    this.store.logProvenance(song.id, {
      target: p.target,
      kind: 'ai-suggested',
      acceptedAt: Date.now(),
      hermesToolCallId: p.id,
      summary: `${p.skill}: ${p.proposed}`,
    });
  }

  private applyToSong(song: Song, p: Proposal): void {
    const apply = p.apply!;
    if (apply.type === 'set-title') {
      this.store.updateMeta(song.id, { title: p.proposed });
      return;
    }
    const sec = song.sections.find((s) => s.id === apply.sectionId);
    if (!sec) return;
    if (apply.type === 'append-line') {
      this.store.updateSection(song.id, {
        ...sec,
        lines: [...sec.lines, { text: p.proposed, chordAnchors: [] }],
      });
    } else if (apply.type === 'add-chord') {
      this.store.updateSection(song.id, {
        ...sec,
        progression: [
          ...sec.progression,
          {
            symbol: apply.symbol,
            nashville: apply.nashville,
            bar: sec.progression.length + 1,
            beat: 1,
            durationBeats: 4,
          },
        ],
      });
    }
  }
}
