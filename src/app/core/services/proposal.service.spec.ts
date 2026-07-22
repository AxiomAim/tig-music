import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ProposalService } from './proposal.service';
import { SongStore } from './song-store.service';
import { Proposal } from '../models/hermes.model';
import { Song } from '../models/song.model';

function song(): Song {
  return {
    id: 's1',
    title: 'Grace Enough',
    key: 7,
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

describe('ProposalService (propose-never-act: apply + provenance)', () => {
  let svc: ProposalService;
  let store: {
    updateSection: ReturnType<typeof vi.fn>;
    updateMeta: ReturnType<typeof vi.fn>;
    logProvenance: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    store = { updateSection: vi.fn(), updateMeta: vi.fn(), logProvenance: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: SongStore, useValue: store }] });
    svc = TestBed.inject(ProposalService);
  });

  it('append-line adds exactly one line and logs one provenance entry', () => {
    const p: Proposal = {
      id: 'p1',
      skill: 'rhyme',
      kind: 'line',
      target: 'Verse 1 — new line',
      proposed: 'Your mercy meets me in the morning light',
      rationale: 'rhyme',
      sources: ['rhyme:weary→light'],
      apply: { type: 'append-line', sectionId: 'v1', text: 'ignored — service uses proposed' },
    };
    svc.accept(song(), p);

    expect(store.updateSection).toHaveBeenCalledTimes(1);
    const updated = store.updateSection.mock.calls[0][1];
    expect(updated.lines).toHaveLength(2);
    expect(updated.lines[1].text).toBe(p.proposed); // the (possibly edited) proposed text lands
    expect(store.logProvenance).toHaveBeenCalledTimes(1);
    expect(store.logProvenance.mock.calls[0][1]).toMatchObject({
      kind: 'ai-suggested',
      target: p.target,
    });
  });

  it('set-title updates meta, not a section', () => {
    const p: Proposal = {
      id: 'p2',
      skill: 'title',
      kind: 'title',
      target: 'Song title',
      proposed: 'Grace Enough',
      rationale: 'from hook',
      sources: [],
      apply: { type: 'set-title', title: 'Grace Enough' },
    };
    svc.accept(song(), p);
    expect(store.updateMeta).toHaveBeenCalledWith('s1', { title: 'Grace Enough' });
    expect(store.updateSection).not.toHaveBeenCalled();
    expect(store.logProvenance).toHaveBeenCalledTimes(1);
  });

  it('an advisory note (no apply) mutates nothing but is still logged', () => {
    const p: Proposal = {
      id: 'p3',
      skill: 'structure',
      kind: 'note',
      target: 'Song structure',
      proposed: 'Consider adding a bridge.',
      rationale: 'advisory',
      sources: [],
    };
    svc.accept(song(), p);
    expect(store.updateSection).not.toHaveBeenCalled();
    expect(store.updateMeta).not.toHaveBeenCalled();
    expect(store.logProvenance).toHaveBeenCalledTimes(1);
  });

  it('add-chord appends a chord to the section progression', () => {
    const p: Proposal = {
      id: 'p4',
      skill: 'chord',
      kind: 'chord',
      target: 'Verse 1 — add Eb',
      proposed: 'Eb',
      rationale: 'borrowed color',
      sources: ['theory:G:b6'],
      apply: { type: 'add-chord', sectionId: 'v1', symbol: 'Eb', nashville: 'b6' },
    };
    svc.accept(song(), p);
    const updated = store.updateSection.mock.calls[0][1];
    expect(updated.progression).toHaveLength(1);
    expect(updated.progression[0]).toMatchObject({ symbol: 'Eb', nashville: 'b6', bar: 1 });
  });
});
