import { TestBed } from '@angular/core/testing';
import { ChartService } from './chart.service';
import { Song } from '../models/song.model';

function song(): Song {
  return {
    id: 's1',
    title: 'Grace Enough',
    key: 7, // G
    tempo: 72,
    timeSignature: '4/4',
    status: 'draft',
    tags: [],
    sections: [
      {
        id: 'v1',
        type: 'verse',
        label: 'Verse 1',
        order: 0,
        lines: [
          {
            text: 'When the morning finds me weary',
            chordAnchors: [{ symbol: 'G', charOffset: 0 }],
          },
        ],
        progression: [
          { symbol: 'G', nashville: '1', bar: 1, beat: 1, durationBeats: 4 },
          { symbol: 'C', nashville: '4', bar: 2, beat: 1, durationBeats: 4 },
        ],
      },
    ],
    release: { writers: [] },
    provenance: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('ChartService', () => {
  let svc: ChartService;
  beforeEach(() => {
    svc = TestBed.inject(ChartService);
  });

  it('exports ChordPro with directives, a chord line, and inline chords', () => {
    const cho = svc.toChordPro(song());
    expect(cho).toContain('{title: Grace Enough}');
    expect(cho).toContain('{key: G}');
    expect(cho).toContain('{comment: Verse 1}');
    expect(cho).toContain('[G] [C]');
    expect(cho).toContain('[G]When the morning finds me weary');
  });

  it('round-trips ChordPro (labels, lyrics, anchors, progression)', () => {
    const parsed = svc.fromChordPro(svc.toChordPro(song()));
    expect(parsed.title).toBe('Grace Enough');
    expect(parsed.key).toBe(7);
    expect(parsed.sections).toHaveLength(1);
    const sec = parsed.sections[0];
    expect(sec.label).toBe('Verse 1');
    expect(sec.type).toBe('verse');
    expect(sec.progression.map((c) => c.symbol)).toEqual(['G', 'C']);
    expect(sec.lines[0].text).toBe('When the morning finds me weary');
    expect(sec.lines[0].chordAnchors[0]).toEqual({ symbol: 'G', charOffset: 0 });
  });

  it('transposes on export', () => {
    const cho = svc.toChordPro(song(), 9); // to A
    expect(cho).toContain('{key: A}');
    expect(cho).toContain('[A] [D]');
  });

  it('emits well-formed MusicXML with a harmony root', () => {
    const xml = svc.toMusicXML(song());
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain('<root-step>G</root-step>');
    expect(xml).toContain('<text>When</text>');
  });
});
