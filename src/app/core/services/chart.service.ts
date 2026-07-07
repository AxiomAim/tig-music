import { Injectable, inject } from '@angular/core';
import { ChordAnchor, LyricLine, Section, SectionType, Song } from '../models/song.model';
import { TransposeService } from './transpose.service';
import { KEY_NAMES } from './theory.service';

/**
 * Serializes a Song to shareable chart formats — ChordPro and MusicXML (MuseScore-openable) —
 * and parses ChordPro back into sections. Pure string transforms over the Song model; the
 * chord-anchor model keeps chord-over-lyric alignment deterministic (docs §3, FR-C4/C5/C6).
 */
@Injectable({ providedIn: 'root' })
export class ChartService {
  private readonly transpose = inject(TransposeService);

  /** Export a song as ChordPro text, transposed to `toKey` (defaults to the song's key). */
  toChordPro(song: Song, toKey = song.key): string {
    const lines: string[] = [
      `{title: ${song.title}}`,
      `{key: ${KEY_NAMES[toKey]}}`,
      `{tempo: ${song.tempo}}`,
      `{time: ${song.timeSignature}}`,
      '',
    ];
    for (const sec of song.sections) {
      lines.push(`{comment: ${sec.label}}`);
      // A standalone chord line from the progression (transposed), when present.
      if (sec.progression.length) {
        lines.push(
          sec.progression
            .map((c) => `[${this.transpose.transposeChord(c.symbol, song.key, toKey)}]`)
            .join(' '),
        );
      }
      for (const line of sec.lines) {
        lines.push(this.lineToChordPro(line, song.key, toKey));
      }
      lines.push('');
    }
    return lines.join('\n').trimEnd() + '\n';
  }

  /** Parse ChordPro text into song sections (title/key/tempo/time are returned too). */
  fromChordPro(text: string): {
    title?: string;
    key?: number;
    tempo?: number;
    timeSignature?: string;
    sections: Section[];
  } {
    const out: {
      title?: string;
      key?: number;
      tempo?: number;
      timeSignature?: string;
      sections: Section[];
    } = { sections: [] };
    let current: Section | null = null;
    let order = 0;

    for (const raw of text.split('\n')) {
      const line = raw.replace(/\r$/, '');
      const directive = /^\{\s*([a-z_]+)\s*:\s*(.*?)\s*\}$/i.exec(line.trim());
      if (directive) {
        const [, name, value] = directive;
        const key = name.toLowerCase();
        if (key === 'title' || key === 't') out.title = value;
        else if (key === 'key') out.key = this.keyIndex(value);
        else if (key === 'tempo') out.tempo = parseInt(value, 10) || undefined;
        else if (key === 'time') out.timeSignature = value;
        else if (key === 'comment' || key === 'c' || key.startsWith('start_of_')) {
          current = this.newSection(value || key.replace('start_of_', ''), order++);
          out.sections.push(current);
        }
        continue;
      }
      if (!line.trim()) continue;
      if (!current) {
        current = this.newSection('Verse 1', order++);
        out.sections.push(current);
      }
      const parsed = this.parseChordProLine(line);
      // A pure chord line (no lyric text) seeds the progression; otherwise it's a lyric line.
      if (parsed.text.trim() === '' && parsed.chordAnchors.length) {
        current.progression = parsed.chordAnchors.map((a, i) => ({
          symbol: a.symbol,
          nashville: '',
          bar: i + 1,
          beat: 1,
          durationBeats: 4,
        }));
      } else {
        current.lines.push(parsed);
      }
    }
    return out;
  }

  /** A minimal MusicXML lead-sheet skeleton: one measure per chord, harmony + lyric. */
  toMusicXML(song: Song, toKey = song.key): string {
    const measures: string[] = [];
    let n = 1;
    for (const sec of song.sections) {
      const lyricWords = sec.lines.flatMap((l) => l.text.split(/\s+/)).filter(Boolean);
      const chords = sec.progression.length ? sec.progression : [{ symbol: 'C' }];
      chords.forEach((c, i) => {
        const sym = this.transpose.transposeChord(
          (c as { symbol: string }).symbol,
          song.key,
          toKey,
        );
        const word = lyricWords[i] ?? '';
        measures.push(this.measureXml(n++, sym, word, i === 0 ? sec.label : ''));
      });
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${this.xml(song.title)}</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead sheet</part-name></score-part></part-list>
  <part id="P1">
${measures.join('\n')}
  </part>
</score-partwise>
`;
  }

  private measureXml(num: number, chordSymbol: string, lyric: string, rehearsal: string): string {
    const p = this.transpose.parse(chordSymbol);
    const root = p ? this.mxmlRoot(chordSymbol) : '';
    const kind = /m(?!aj)/.test(p?.suffix ?? '') ? 'minor' : 'major';
    const harmony = root
      ? `      <harmony><root>${root}</root><kind text="${this.xml(chordSymbol)}">${kind}</kind></harmony>\n`
      : '';
    const attrs =
      num === 1
        ? `      <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n`
        : '';
    const rehearsalXml = rehearsal
      ? `      <direction placement="above"><direction-type><rehearsal>${this.xml(rehearsal)}</rehearsal></direction-type></direction>\n`
      : '';
    const lyricXml = lyric ? `        <lyric><text>${this.xml(lyric)}</text></lyric>\n` : '';
    return `    <measure number="${num}">
${attrs}${rehearsalXml}${harmony}      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type>
${lyricXml}      </note>
    </measure>`;
  }

  private mxmlRoot(symbol: string): string {
    const m = /^([A-G])([#b]?)/.exec(symbol);
    if (!m) return '';
    const alter =
      m[2] === '#'
        ? '<root-alter>1</root-alter>'
        : m[2] === 'b'
          ? '<root-alter>-1</root-alter>'
          : '';
    return `<root-step>${m[1]}</root-step>${alter}`;
  }

  private lineToChordPro(line: LyricLine, fromKey: number, toKey: number): string {
    if (!line.chordAnchors.length) return line.text;
    const anchors = [...line.chordAnchors].sort((a, b) => a.charOffset - b.charOffset);
    let out = '';
    let cursor = 0;
    for (const a of anchors) {
      const at = Math.min(Math.max(a.charOffset, 0), line.text.length);
      out += line.text.slice(cursor, at);
      out += `[${this.transpose.transposeChord(a.symbol, fromKey, toKey)}]`;
      cursor = at;
    }
    out += line.text.slice(cursor);
    return out;
  }

  private parseChordProLine(line: string): LyricLine {
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

  private newSection(label: string, order: number): Section {
    return {
      id: 'sec' + Math.random().toString(36).slice(2, 8),
      type: this.inferType(label),
      label: label || 'Section',
      order,
      lines: [],
      progression: [],
    };
  }

  private inferType(label: string): SectionType {
    const l = label.toLowerCase();
    if (l.includes('pre')) return 'prechorus';
    if (l.includes('chorus')) return 'chorus';
    if (l.includes('bridge')) return 'bridge';
    if (l.includes('intro')) return 'intro';
    if (l.includes('outro')) return 'outro';
    if (l.includes('tag')) return 'tag';
    if (l.includes('hook')) return 'hook';
    return 'verse';
  }

  private keyIndex(name: string): number {
    const i = KEY_NAMES.indexOf(name.trim());
    return i >= 0 ? i : 0;
  }

  private xml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
