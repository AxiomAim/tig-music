import { TestBed } from '@angular/core/testing';
import { TheoryService, KEY_NAMES } from './theory.service';

describe('TheoryService (key-correct chord spelling)', () => {
  let theory: TheoryService;
  beforeEach(() => {
    theory = TestBed.inject(TheoryService);
  });

  const names = (keyIndex: number) => theory.diatonicChords(keyIndex).map((c) => c.name);

  it('spells E major with sharps (G#m, C#m, D#°) — not flats', () => {
    // The reported bug: the palette showed Abm / Dbm / Eb° for key E.
    expect(names(KEY_NAMES.indexOf('E'))).toEqual(['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#°']);
  });

  it('spells sharp keys with sharps', () => {
    expect(names(KEY_NAMES.indexOf('A'))).toEqual(['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#°']);
    expect(names(KEY_NAMES.indexOf('G'))).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°']);
  });

  it('spells flat keys (and C/F) with flats', () => {
    expect(names(KEY_NAMES.indexOf('F'))).toEqual(['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'E°']);
    expect(names(KEY_NAMES.indexOf('Eb'))).toEqual(['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'D°']);
    expect(names(KEY_NAMES.indexOf('C'))).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  });

  it('spells borrowed colors of E with sharps where appropriate (III=G#, VI=C#)', () => {
    const borrowed = theory.borrowedChords(KEY_NAMES.indexOf('E')).map((c) => c.name);
    expect(borrowed).toContain('G#'); // III (was Ab)
    expect(borrowed).toContain('C#'); // VI (was Db)
    expect(borrowed).toContain('B7'); // V7
  });
});
