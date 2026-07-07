import { Injectable } from '@angular/core';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Display names for the 12 keys (mixing sharps/flats the way musicians write them). */
export const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_TO_INDEX: Record<string, number> = {
  Db: 1,
  Eb: 3,
  Gb: 6,
  Ab: 8,
  Bb: 10,
};

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const NASHVILLE = ['1', '2', '3', '4', '5', '6', '7'];

export interface DiatonicChord {
  numeral: string; // Nashville number, e.g. "1", "4", "5"
  roman: string; // I, ii, iii…
  name: string; // e.g. "G", "Am"
  rootIndex: number;
  quality: string; // "", "m", "dim"
}

/** Instrument-agnostic music theory: notes, keys, the major scale, diatonic chords,
 *  Nashville numbers, and the circle of fifths. Shared in spirit with Tig Guitar. */
@Injectable({ providedIn: 'root' })
export class TheoryService {
  /** Normalize a note/key name (sharp or flat) to a 0–11 pitch class. */
  noteIndex(name: string): number {
    if (name in FLAT_TO_INDEX) return FLAT_TO_INDEX[name];
    const i = NOTE_NAMES.indexOf(name);
    return i >= 0 ? i : 0;
  }

  /** Pitch-class index → sharp note name. */
  noteName(index: number): string {
    return NOTE_NAMES[((index % 12) + 12) % 12];
  }

  keyName(index: number): string {
    return KEY_NAMES[((index % 12) + 12) % 12];
  }

  /** The seven diatonic chords of a major key, with Nashville numbers. */
  diatonicChords(keyIndex: number): DiatonicChord[] {
    const romanBase = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    return MAJOR_SCALE.map((step, i) => {
      const rootIndex = (keyIndex + step) % 12;
      const quality = DIATONIC_QUALITIES[i];
      return {
        numeral: NASHVILLE[i] + (quality === 'dim' ? '°' : quality === 'm' ? 'm' : ''),
        roman: romanBase[i],
        name: this.keyName(rootIndex) + (quality === 'dim' ? '°' : quality),
        rootIndex,
        quality,
      };
    });
  }

  /** The notes of a major triad rooted at the given pitch class. */
  majorTriad(rootIndex: number): number[] {
    return [rootIndex % 12, (rootIndex + 4) % 12, (rootIndex + 7) % 12];
  }

  /** Circle of fifths, starting at C, as pitch-class indices. */
  circleOfFifths(): number[] {
    const out: number[] = [];
    for (let i = 0; i < 12; i++) out.push((i * 7) % 12);
    return out;
  }

  /** Common borrowed / colored chords for the blues-inflected worship palette: bVII, the
   *  secondary dominants (II, III, VI, VII of V), the parallel-minor iv and bVI/bIII, and
   *  the dominant-7 five. Curated, not exhaustive. */
  borrowedChords(keyIndex: number): DiatonicChord[] {
    const specs: { numeral: string; roman: string; semis: number; quality: string }[] = [
      { numeral: '57', roman: 'V7', semis: 7, quality: '7' },
      { numeral: 'b7', roman: '♭VII', semis: 10, quality: '' },
      { numeral: '2', roman: 'II', semis: 2, quality: '' },
      { numeral: '3', roman: 'III', semis: 4, quality: '' },
      { numeral: '6', roman: 'VI', semis: 9, quality: '' },
      { numeral: '4m', roman: 'iv', semis: 5, quality: 'm' },
      { numeral: 'b3', roman: '♭III', semis: 3, quality: '' },
      { numeral: 'b6', roman: '♭VI', semis: 8, quality: '' },
    ];
    return specs.map((s) => {
      const rootIndex = (keyIndex + s.semis) % 12;
      return {
        numeral: s.numeral,
        roman: s.roman,
        name: this.keyName(rootIndex) + s.quality,
        rootIndex,
        quality: s.quality,
      };
    });
  }
}
