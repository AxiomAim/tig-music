// ============================================================
// Tig Music — chord-over-lyric text ⇄ ChordAnchor model.
//
// Writers write charts the way charts look:
//
//     C#m              A
//     Dom-dom-dom um-da-dah
//
// A line made only of chord symbols is a CHORD LINE; its chords attach to the lyric line
// below as ChordAnchors, keyed by column position (the classic chart convention). Inline
// ChordPro brackets ("Dom [C#m]dom") are parsed too. Serialization reproduces the same
// two-row layout, so the lyrics textarea round-trips what the writer typed and the Chart
// view / ChordPro / MusicXML exports all see real anchors.
// ============================================================

import { ChordAnchor, LyricLine } from '../models/song.model';

/** One chord token: root + optional quality/extensions + optional slash bass.
 *  Matches C, C#m, Bb, Em7, Dsus4, Cmaj7, F#m7b5, G/B, A7sus4, Cadd9, Bdim, Eaug… */
const CHORD_TOKEN_RE =
  /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|\+|°|ø)?[0-9]*(?:(?:sus|add|maj|b|#)[0-9]+)*(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/;

/** True when the (non-empty) line consists solely of chord symbols. */
export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/);
  return tokens.length > 0 && tokens[0] !== '' && tokens.every((t) => CHORD_TOKEN_RE.test(t));
}

/** The chord tokens of a chord line, with their starting column as the anchor offset. */
function chordTokens(line: string): ChordAnchor[] {
  const anchors: ChordAnchor[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) anchors.push({ symbol: m[0], charOffset: m.index });
  return anchors;
}

/** Parse one lyric line's inline ChordPro brackets: "Dom [C#m]dom" → text + anchors. */
function parseInline(line: string): LyricLine {
  const anchors: ChordAnchor[] = [];
  let text = '';
  const re = /\[([^\]]+)\]|([^[]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1] !== undefined) anchors.push({ symbol: m[1], charOffset: text.length });
    else text += m[2];
  }
  return { text, chordAnchors: anchors };
}

/**
 * Parse a lyrics block (the textarea contents) into LyricLines.
 * - chord line + lyric line below → one LyricLine with column-aligned anchors
 * - chord line with no lyric below → a chord-only LyricLine (text '', anchors kept)
 * - inline [Chord] brackets work on any lyric line
 */
export function parseLyricsBlock(text: string): LyricLine[] {
  const raw = text.split('\n');
  const out: LyricLine[] = [];
  let i = 0;
  while (i < raw.length) {
    const line = raw[i];
    if (isChordLine(line)) {
      const anchors = chordTokens(line);
      const next = raw[i + 1];
      if (next !== undefined && next.trim() !== '' && !isChordLine(next)) {
        const lyric = parseInline(next);
        const merged = [
          ...anchors.map((a) => ({ ...a, charOffset: Math.min(a.charOffset, lyric.text.length) })),
          ...lyric.chordAnchors,
        ].sort((a, b) => a.charOffset - b.charOffset);
        out.push({ text: lyric.text, chordAnchors: merged });
        i += 2;
        continue;
      }
      out.push({ text: '', chordAnchors: anchors });
      i++;
      continue;
    }
    out.push(parseInline(line));
    i++;
  }
  return out;
}

/** Build the chord row for a line: symbols padded out to their anchor columns.
 *  `renderSymbol` lets callers transpose / Nashville-ize each symbol. */
export function chordRow(line: LyricLine, renderSymbol: (s: string) => string = (s) => s): string {
  let row = '';
  for (const a of [...line.chordAnchors].sort((x, y) => x.charOffset - y.charOffset)) {
    row = row.length < a.charOffset ? row.padEnd(a.charOffset) : row + (row ? ' ' : '');
    row += renderSymbol(a.symbol);
  }
  return row;
}

/** Serialize LyricLines back into chord-over-lyric text (the textarea round-trip). */
export function serializeLyricsBlock(lines: LyricLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.chordAnchors.length) out.push(chordRow(line));
    if (line.text !== '' || !line.chordAnchors.length) out.push(line.text);
  }
  return out.join('\n');
}
