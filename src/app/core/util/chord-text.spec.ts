import { isChordLine, parseLyricsBlock, serializeLyricsBlock, chordRow } from './chord-text';

describe('chord-text (chart-style chord ⇄ anchor model)', () => {
  it('recognizes chord lines and rejects lyric lines', () => {
    expect(isChordLine('C#m')).toBe(true);
    expect(isChordLine('C#m   A    E')).toBe(true);
    expect(isChordLine('G/B  Dsus4 Em7 F#m7b5 Cmaj7 Cadd9')).toBe(true);
    expect(isChordLine('A')).toBe(true); // single chord token — chart convention wins
    expect(isChordLine('Am I the only one')).toBe(false); // "I" breaks it
    expect(isChordLine('Dom-dom-dom do-do-do')).toBe(false);
    expect(isChordLine('')).toBe(false);
  });

  it('attaches a chord line to the lyric below at column offsets', () => {
    const lines = parseLyricsBlock('C#m       A\nDom-dom-dom um-da-dah');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Dom-dom-dom um-da-dah');
    expect(lines[0].chordAnchors).toEqual([
      { symbol: 'C#m', charOffset: 0 },
      { symbol: 'A', charOffset: 10 },
    ]);
  });

  it('keeps a chord line with no lyric below as a chord-only line', () => {
    const lines = parseLyricsBlock('E\n\nDom-dom-dom');
    expect(lines[0]).toEqual({ text: '', chordAnchors: [{ symbol: 'E', charOffset: 0 }] });
    expect(lines[1].text).toBe('');
    expect(lines[2].text).toBe('Dom-dom-dom');
  });

  it('parses inline ChordPro brackets', () => {
    const [line] = parseLyricsBlock('Dom-[C#m]dom-dom [A]um-da-dah');
    expect(line.text).toBe('Dom-dom-dom um-da-dah');
    expect(line.chordAnchors).toEqual([
      { symbol: 'C#m', charOffset: 4 },
      { symbol: 'A', charOffset: 12 },
    ]);
  });

  it('round-trips serialize → parse losslessly', () => {
    const original = parseLyricsBlock('C#m       A\nDom-dom-dom um-da-dah\nno chords here');
    const text = serializeLyricsBlock(original);
    expect(parseLyricsBlock(text)).toEqual(original);
  });

  it('chordRow pads symbols to their columns and can transform symbols', () => {
    const line = {
      text: 'Dom-dom-dom um-da-dah',
      chordAnchors: [
        { symbol: 'C#m', charOffset: 0 },
        { symbol: 'A', charOffset: 12 },
      ],
    };
    expect(chordRow(line)).toBe('C#m         A');
    expect(chordRow(line, (s) => s + '7')).toBe('C#m7        A7');
  });

  it("the user's real verse parses into anchored lines", () => {
    const text = [
      'E',
      'Dom-dom-dom do-do-do',
      'C#m',
      'Dom-dom-dom um-da-dah',
      'A',
      'Dom-dom-dom give Him golden praise',
    ].join('\n');
    const lines = parseLyricsBlock(text);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.chordAnchors[0].symbol)).toEqual(['E', 'C#m', 'A']);
    expect(lines.every((l) => l.text.startsWith('Dom-dom-dom'))).toBe(true);
  });
});
