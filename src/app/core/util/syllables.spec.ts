import { syllablesInLine, syllablesInWord } from './syllables';

describe('syllables', () => {
  it('counts single-syllable words as 1', () => {
    for (const w of ['grace', 'song', 'long', 'me', 'the', 'road']) {
      expect(syllablesInWord(w)).toBe(1);
    }
  });

  it('counts common multi-syllable words', () => {
    expect(syllablesInWord('morning')).toBe(2);
    expect(syllablesInWord('weary')).toBe(2);
    expect(syllablesInWord('surrender')).toBe(3);
  });

  it('sums a line', () => {
    // "When the morning finds me weary" → 1+1+2+1+1+2 = 8
    expect(syllablesInLine('When the morning finds me weary')).toBe(8);
  });

  it('handles empty and punctuation', () => {
    expect(syllablesInLine('')).toBe(0);
    expect(syllablesInWord('grace,')).toBe(1);
  });
});
