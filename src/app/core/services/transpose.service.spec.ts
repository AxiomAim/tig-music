import { TransposeService } from './transpose.service';

describe('TransposeService', () => {
  const t = new TransposeService();

  // Key indices (pitch classes): C=0, G=7, A=9, Bb=10, Eb=3, D=2, F=5
  describe('transposeChord', () => {
    it('transposes a I–IV–V from G up to A with sharp spelling', () => {
      expect(t.transposeChord('G', 7, 9)).toBe('A');
      expect(t.transposeChord('C', 7, 9)).toBe('D');
      expect(t.transposeChord('D', 7, 9)).toBe('E');
    });

    it('spells flat keys with flats', () => {
      // G major up to Eb (index 3) — a flat key
      expect(t.transposeChord('G', 7, 3)).toBe('Eb');
      expect(t.transposeChord('C', 7, 3)).toBe('Ab');
      expect(t.transposeChord('D', 7, 3)).toBe('Bb');
    });

    it('preserves suffix and slash bass, respelling both', () => {
      expect(t.transposeChord('Gmaj7', 7, 9)).toBe('Amaj7');
      expect(t.transposeChord('D/F#', 7, 9)).toBe('E/G#');
      expect(t.transposeChord('Em', 7, 9)).toBe('F#m');
    });

    it('is identity when from-key equals to-key', () => {
      expect(t.transposeChord('D/F#', 7, 7)).toBe('D/F#');
    });
  });

  describe('chordToNashville', () => {
    it('maps diatonic chords in G to numbers', () => {
      expect(t.chordToNashville('G', 7)).toBe('1');
      expect(t.chordToNashville('C', 7)).toBe('4');
      expect(t.chordToNashville('D', 7)).toBe('5');
      expect(t.chordToNashville('Em', 7)).toBe('6m');
    });

    it('marks borrowed colors with accidentals and keeps the slash', () => {
      expect(t.chordToNashville('F', 7)).toBe('b7'); // bVII in G
      expect(t.chordToNashville('D/F#', 7)).toBe('5/7'); // F# is the major 7th of G
    });
  });

  describe('nashvilleToChord', () => {
    it('is the inverse of chordToNashville in a key', () => {
      expect(t.nashvilleToChord('1', 7)).toBe('G');
      expect(t.nashvilleToChord('4', 7)).toBe('C');
      expect(t.nashvilleToChord('6m', 7)).toBe('Em');
      expect(t.nashvilleToChord('5/7', 0)).toBe('G/B'); // in C: 5=G, 7=B
    });
  });
});
