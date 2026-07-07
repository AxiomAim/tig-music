import { ScriptureService } from './scripture.service';

describe('ScriptureService', () => {
  const svc = new ScriptureService();

  it('finds verses by theme keyword', () => {
    const hits = svc.search('grace');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((v) => v.ref === 'Ephesians 2:8')).toBe(true);
  });

  it('ranks reference matches highly', () => {
    const hits = svc.search('Psalm 23');
    expect(hits[0].ref.startsWith('Psalm 23')).toBe(true);
  });

  it('only ever returns real verses (no invented text)', () => {
    for (const v of svc.search('weary')) {
      expect(svc.byReference(v.ref)).toBeDefined();
    }
  });

  it('returns nothing for a blank query', () => {
    expect(svc.search('')).toEqual([]);
  });

  it('looks up an exact reference', () => {
    expect(svc.byReference('John 3:16')?.text).toContain('loved the world');
  });
});
