import { Injectable } from '@angular/core';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pitch classes of keys that are conventionally spelled with flats. */
const FLAT_KEYS = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb

const LETTER_TO_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Nashville degree (semitones from tonic) → number + accidental. Major-scale degrees are
 *  bare numbers; chromatic degrees carry a b/#. */
const SEMITONE_TO_DEGREE = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
const DEGREE_TO_SEMITONE: Record<string, number> = {
  '1': 0,
  '#1': 1,
  b2: 1,
  '2': 2,
  '#2': 3,
  b3: 3,
  '3': 4,
  b4: 4,
  '4': 5,
  '#4': 6,
  b5: 6,
  '5': 7,
  '#5': 8,
  b6: 8,
  '6': 9,
  '#6': 10,
  b7: 10,
  '7': 11,
  b1: 11,
};

interface ParsedChord {
  rootIndex: number;
  suffix: string; // quality/extensions, e.g. "m7", "maj7", "sus4"
  bassIndex: number | null;
}

/**
 * Key-aware chord transposition and chord ⟷ Nashville conversion.
 * Numbers are invariant under transposition; chord *names* re-spell correctly (sharp vs
 * flat) for the destination key. Ported in spirit from the Tig family chart engine.
 * See docs/03-design-and-architecture.md §3.
 */
@Injectable({ providedIn: 'root' })
export class TransposeService {
  /** Parse a chord symbol into root, suffix, and optional slash bass. */
  parse(symbol: string): ParsedChord | null {
    const m = /^([A-G])([#b]?)(.*)$/.exec(symbol.trim());
    if (!m) return null;
    const [, letter, accidental, rest] = m;
    let rootIndex = LETTER_TO_INDEX[letter];
    if (accidental === '#') rootIndex = (rootIndex + 1) % 12;
    if (accidental === 'b') rootIndex = (rootIndex + 11) % 12;

    let suffix = rest;
    let bassIndex: number | null = null;
    const slash = rest.indexOf('/');
    if (slash >= 0) {
      suffix = rest.slice(0, slash);
      const bass = this.parseNote(rest.slice(slash + 1));
      if (bass !== null) bassIndex = bass;
    }
    return { rootIndex, suffix, bassIndex };
  }

  /** Spell a pitch class as a note name, choosing sharps/flats to fit the destination key. */
  spell(index: number, keyIndex: number): string {
    const table = FLAT_KEYS.has(((keyIndex % 12) + 12) % 12) ? FLAT_NAMES : SHARP_NAMES;
    return table[((index % 12) + 12) % 12];
  }

  /** Transpose a chord symbol from one key to another, spelling for the destination key. */
  transposeChord(symbol: string, fromKey: number, toKey: number): string {
    const p = this.parse(symbol);
    if (!p) return symbol;
    const shift = (((toKey - fromKey) % 12) + 12) % 12;
    const root = this.spell(p.rootIndex + shift, toKey);
    const bass = p.bassIndex === null ? '' : '/' + this.spell(p.bassIndex + shift, toKey);
    return root + p.suffix + bass;
  }

  /** A concrete chord symbol → its Nashville representation in the given key. */
  chordToNashville(symbol: string, keyIndex: number): string {
    const p = this.parse(symbol);
    if (!p) return symbol;
    const degree = SEMITONE_TO_DEGREE[(((p.rootIndex - keyIndex) % 12) + 12) % 12];
    const bass =
      p.bassIndex === null
        ? ''
        : '/' + SEMITONE_TO_DEGREE[(((p.bassIndex - keyIndex) % 12) + 12) % 12];
    return degree + p.suffix + bass;
  }

  /** A Nashville symbol (e.g. "5/7", "b7", "6m") → a concrete chord in the given key. */
  nashvilleToChord(nashville: string, keyIndex: number): string {
    const m = /^([#b]?[1-7])(.*)$/.exec(nashville.trim());
    if (!m) return nashville;
    const [, degree, rest] = m;
    const semis = DEGREE_TO_SEMITONE[degree];
    if (semis === undefined) return nashville;

    let suffix = rest;
    let bass = '';
    const slash = rest.indexOf('/');
    if (slash >= 0) {
      suffix = rest.slice(0, slash);
      const bassDeg = DEGREE_TO_SEMITONE[rest.slice(slash + 1)];
      if (bassDeg !== undefined) bass = '/' + this.spell(keyIndex + bassDeg, keyIndex);
    }
    return this.spell(keyIndex + semis, keyIndex) + suffix + bass;
  }

  private parseNote(name: string): number | null {
    const m = /^([A-G])([#b]?)/.exec(name.trim());
    if (!m) return null;
    let idx = LETTER_TO_INDEX[m[1]];
    if (m[2] === '#') idx = (idx + 1) % 12;
    if (m[2] === 'b') idx = (idx + 11) % 12;
    return idx;
  }
}
