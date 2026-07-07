import { RhymeService } from './rhyme.service';

describe('RhymeService', () => {
  let svc: RhymeService;
  let calls: string[];

  beforeEach(() => {
    svc = new RhymeService();
    calls = [];
    globalThis.fetch = ((url: string) => {
      calls.push(url);
      const body = url.includes('rel_rhy')
        ? [{ word: 'weary' }, { word: 'dreary' }]
        : url.includes('rel_nry')
          ? [{ word: 'early' }]
          : [{ word: 'tired' }];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }) as unknown as typeof fetch;
  });

  it('returns rhymes, near-rhymes, and synonyms', async () => {
    const r = await svc.lookup('teary');
    expect(r.rhymes).toEqual(['weary', 'dreary']);
    expect(r.near).toEqual(['early']);
    expect(r.synonyms).toEqual(['tired']);
  });

  it('caches by word (no second round of fetches)', async () => {
    await svc.lookup('teary');
    const countAfterFirst = calls.length;
    await svc.lookup('teary');
    expect(calls.length).toBe(countAfterFirst);
  });

  it('degrades gracefully on network error', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const r = await svc.lookup('unreachable');
    expect(r).toEqual({ rhymes: [], near: [], synonyms: [] });
  });

  it('returns empty for a blank word without fetching', async () => {
    const r = await svc.lookup('   ');
    expect(r).toEqual({ rhymes: [], near: [], synonyms: [] });
    expect(calls.length).toBe(0);
  });
});
