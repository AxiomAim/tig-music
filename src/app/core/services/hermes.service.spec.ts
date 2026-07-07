import { TestBed } from '@angular/core/testing';
import { HermesService } from './hermes.service';
import { ScriptureService } from './scripture.service';
import { TheoryService } from './theory.service';
import { Song } from '../models/song.model';

function song(): Song {
  return {
    id: 's1',
    title: 'Grace Enough',
    key: 7, // G
    tempo: 72,
    timeSignature: '4/4',
    status: 'draft',
    tags: ['grace'],
    sections: [
      {
        id: 'v1',
        type: 'verse',
        label: 'Verse 1',
        order: 0,
        lines: [{ text: 'When the morning finds me weary', chordAnchors: [] }],
        progression: [],
      },
    ],
    release: { writers: [] },
    provenance: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('HermesService (grounding + propose-never-act)', () => {
  let hermes: HermesService;
  let scripture: ScriptureService;
  let theory: TheoryService;

  beforeEach(() => {
    hermes = TestBed.inject(HermesService);
    scripture = TestBed.inject(ScriptureService);
    theory = TestBed.inject(TheoryService);
  });

  it('only proposes scripture that exists in the WEB index', async () => {
    const proposals = await hermes.propose(song(), {
      skill: 'scripture',
      sectionId: 'v1',
      input: 'grace',
    });
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.sources.length).toBe(1);
      expect(scripture.byReference(p.sources[0])).toBeDefined(); // a real verse
      expect(scripture.byReference(p.sources[0])!.text).toBe(p.proposed); // verbatim, not invented
    }
  });

  it('only proposes chords that the theory engine produces for the key', async () => {
    const proposals = await hermes.propose(song(), { skill: 'chord', sectionId: 'v1' });
    const valid = new Set(theory.borrowedChords(7).map((c) => c.name));
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) expect(valid.has(p.proposed)).toBe(true);
  });

  it('structure notes are advisory only — they never carry an apply payload', async () => {
    const proposals = await hermes.propose(song(), { skill: 'structure' });
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.kind).toBe('note');
      expect(p.apply).toBeUndefined(); // cannot mutate the song
    }
  });

  it('mutating proposals carry an apply payload targeting a real section', async () => {
    const proposals = await hermes.propose(song(), { skill: 'chord', sectionId: 'v1' });
    for (const p of proposals) {
      expect(p.apply?.type).toBe('add-chord');
      if (p.apply && 'sectionId' in p.apply) expect(p.apply.sectionId).toBe('v1');
    }
  });
});
