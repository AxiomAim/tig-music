// ============================================================
// Tig Music — Hermes (AI co-writer). See docs/05-hermes-agent-setup.md.
//
// Hermes PROPOSES and never acts. This service returns editable Proposal cards grounded in
// the deterministic engines (rhyme, scripture, theory, transpose) — it never invents a verse,
// chord, or key. Nothing mutates the song here; the panel applies a proposal only when the
// writer clicks Accept, and logs a provenance entry then.
//
// BACKEND: this ships a LOCAL grounded proposer (works offline, no keys) behind the async
// `propose()` interface. The Firebase AI Logic (Gemini) path slots in behind the same
// interface — the model composes phrasing over the SAME tool results — without changing the
// panel or the propose-never-act guarantee.
// ============================================================

import { Injectable, inject } from '@angular/core';
import { RhymeService } from './rhyme.service';
import { ScriptureService } from './scripture.service';
import { TheoryService } from './theory.service';
import { HermesRemoteService } from './hermes-remote.service';
import { HermesSkill, Proposal } from '../models/hermes.model';
import { Section, Song } from '../models/song.model';

export interface ProposeRequest {
  skill: HermesSkill;
  sectionId?: string;
  /** Free text: a word to rhyme, a theme to search, etc. */
  input?: string;
}

@Injectable({ providedIn: 'root' })
export class HermesService {
  private readonly rhyme = inject(RhymeService);
  private readonly scripture = inject(ScriptureService);
  private readonly theory = inject(TheoryService);
  private readonly remote = inject(HermesRemoteService);

  private seq = 0;

  /** Produce grounded, editable proposals for a skill. Never mutates the song.
   *  'ask' goes to the real Hermes agent (via the Cloud Function); the grounded skills
   *  (rhyme/scripture/chord/…) stay local so verses and chords are always exact. */
  async propose(song: Song, req: ProposeRequest): Promise<Proposal[]> {
    switch (req.skill) {
      case 'ask':
        return this.askHermes(song, req);
      case 'rhyme':
        return this.rhymeProposals(song, req);
      case 'scripture':
        return this.scriptureProposals(song, req);
      case 'chord':
        return this.chordProposals(song, req);
      case 'title':
        return this.titleProposals(song);
      case 'structure':
        return this.structureProposals(song);
      default:
        return [];
    }
  }

  // --- skills --------------------------------------------------------------

  /** Freeform co-write from the real Hermes agent; falls back to a note if unreachable. */
  private async askHermes(song: Song, req: ProposeRequest): Promise<Proposal[]> {
    const proposals = await this.remote.ask(song, req.sectionId, req.input ?? '');
    if (proposals.length) return proposals;
    return [
      this.make({
        skill: 'ask',
        kind: 'note',
        target: 'Hermes',
        proposed:
          'Hermes is unreachable right now — the grounded skills (rhymes, scripture, chords) still work offline.',
        rationale: 'The agent proxy returned nothing (not configured or the Mac mini is offline).',
        sources: [],
      }),
    ];
  }

  private async rhymeProposals(song: Song, req: ProposeRequest): Promise<Proposal[]> {
    const sec = this.section(song, req.sectionId);
    const word = (req.input || this.lastWord(sec) || '').trim();
    if (!word) return [];
    const r = await this.rhyme.lookup(word);
    const picks = [...r.rhymes.slice(0, 4), ...r.near.slice(0, 2)];
    return picks.map((w, i) =>
      this.make({
        skill: 'rhyme',
        kind: 'line',
        target: sec ? `${sec.label} — line ending on "${w}"` : 'lyrics',
        // The rhyming word IS the grounded suggestion (from Datamuse). Seed a new, editable line
        // ending on it; the writer fills the front (or hands it to Hermes via ✦ Ask) and Accepts.
        proposed: this.rhymeSeed(word, w, i < r.rhymes.length),
        rationale: `"${w}" ${i < r.rhymes.length ? 'rhymes' : 'near-rhymes'} with "${word}" — a line ending to try.`,
        sources: [`rhyme:${word}→${w}`],
        apply: sec
          ? {
              type: 'append-line',
              sectionId: sec.id,
              text: this.rhymeSeed(word, w, i < r.rhymes.length),
            }
          : undefined,
      }),
    );
  }

  private scriptureProposals(song: Song, req: ProposeRequest): Proposal[] {
    const theme = (req.input || song.tags[0] || song.title).trim();
    const sec = this.section(song, req.sectionId);
    return this.scripture.search(theme, 3).map((v) =>
      this.make({
        skill: 'scripture',
        kind: 'line',
        target: sec ? `${sec.label} — scripture-rooted line` : 'lyrics',
        proposed: v.text,
        rationale: `${v.ref} (WEB) speaks to "${theme}".`,
        sources: [v.ref],
        apply: sec ? { type: 'append-line', sectionId: sec.id, text: v.text } : undefined,
      }),
    );
  }

  private chordProposals(song: Song, req: ProposeRequest): Proposal[] {
    const sec = this.section(song, req.sectionId) ?? song.sections[0];
    if (!sec) return [];
    return this.theory
      .borrowedChords(song.key)
      .slice(0, 4)
      .map((c) =>
        this.make({
          skill: 'chord',
          kind: 'chord',
          target: `${sec.label} — add ${c.name}`,
          proposed: c.name,
          rationale: `${c.roman} (${c.numeral}) is a color that fits ${this.theory.keyName(song.key)} — common in blues-inflected worship.`,
          sources: [`theory:${this.theory.keyName(song.key)}:${c.numeral}`],
          apply: { type: 'add-chord', sectionId: sec.id, symbol: c.name, nashville: c.numeral },
        }),
      );
  }

  private titleProposals(song: Song): Proposal[] {
    const hook =
      song.sections.find((s) => s.type === 'chorus' || s.type === 'hook') ?? song.sections[0];
    const line = hook?.lines.find((l) => l.text.trim())?.text ?? '';
    const candidates = this.titleCandidates(line, song.tags);
    return candidates.map((t) =>
      this.make({
        skill: 'title',
        kind: 'title',
        target: 'Song title',
        proposed: t,
        rationale: line ? `Drawn from your hook line "${line}".` : 'Drawn from the song themes.',
        sources: line ? [`hook:${hook.label}`] : song.tags.map((t) => `tag:${t}`),
        apply: { type: 'set-title', title: t },
      }),
    );
  }

  private structureProposals(song: Song): Proposal[] {
    const notes: string[] = [];
    const types = song.sections.map((s) => s.type);
    if (!types.includes('chorus'))
      notes.push(
        'There is no chorus yet — a repeated chorus gives listeners something to hold onto.',
      );
    if (!types.includes('bridge') && types.filter((t) => t === 'verse').length >= 2)
      notes.push(
        'Two verses and no bridge — a bridge could lift the last section with a new idea.',
      );
    const empty = song.sections.filter((s) => !s.lines.some((l) => l.text.trim()));
    if (empty.length)
      notes.push(
        `${empty.length} section(s) have no lyrics yet: ${empty.map((s) => s.label).join(', ')}.`,
      );
    if (!notes.length) notes.push('Structure looks solid — verse/chorus contrast is clear.');
    return notes.map((n) =>
      this.make({
        skill: 'structure',
        kind: 'note',
        target: 'Song structure',
        proposed: n,
        rationale: 'A structural observation — advisory only; nothing is changed.',
        sources: [`structure:${types.join('-')}`],
      }),
    );
  }

  // --- helpers -------------------------------------------------------------

  private make(p: Omit<Proposal, 'id'>): Proposal {
    return { id: 'p' + this.seq++, ...p };
  }

  private section(song: Song, sectionId?: string): Section | undefined {
    return sectionId ? song.sections.find((s) => s.id === sectionId) : undefined;
  }

  private lastWord(sec?: Section): string {
    const text =
      sec?.lines
        .map((l) => l.text)
        .filter(Boolean)
        .at(-1) ?? '';
    return (
      text
        .trim()
        .split(/\s+/)
        .at(-1)
        ?.replace(/[^a-zA-Z]/g, '') ?? ''
    );
  }

  /** A seed for an editable new line ending on the rhyme word. Kept deterministic and honest:
   *  we don't fake-compose a lyric — we hand the writer the rhyming word in line-ending position
   *  to build on (or pass to Hermes via ✦ Ask). `_prev`/`_perfect` are here so the seed can grow
   *  smarter later without changing the call sites. */
  private rhymeSeed(_prev: string, word: string, _perfect: boolean): string {
    return word;
  }

  private titleCandidates(line: string, tags: string[]): string[] {
    const out = new Set<string>();
    const words = line
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) {
      out.add(this.titleCase(words.slice(0, 3).join(' ')));
      out.add(this.titleCase(words.slice(-3).join(' ')));
    }
    for (const t of tags) out.add(this.titleCase(t));
    return [...out].filter(Boolean).slice(0, 4);
  }

  private titleCase(s: string): string {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
