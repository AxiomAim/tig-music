import { reconcileDrafts, supersededDraftIds } from './draft-overlay';

interface Row {
  id: string;
  updatedAt: number;
}
const row = (id: string, updatedAt: number): Row => ({ id, updatedAt });

describe('draft-overlay (keeps un-echoed writes authoritative)', () => {
  it('keeps a draft the server has not caught up to yet', () => {
    // We wrote at t=200; the server snapshot still shows t=100 (echo in flight).
    const server = [row('a', 100)];
    const drafts = { a: row('a', 200) };
    expect(supersededDraftIds(server, drafts)).toEqual([]);
    expect(reconcileDrafts(server, drafts)).toBe(drafts); // unchanged → same reference
  });

  it('drops a draft once the server confirms an equal-or-newer update', () => {
    const drafts = { a: row('a', 200), b: row('b', 500) };
    // server has caught up on `a` (same ts) but not `b`
    const server = [row('a', 200), row('b', 400)];
    expect(supersededDraftIds(server, drafts)).toEqual(['a']);
    const next = reconcileDrafts(server, drafts);
    expect(next).not.toBe(drafts);
    expect(Object.keys(next)).toEqual(['b']);
  });

  it('ignores server songs that have no draft', () => {
    const drafts = { a: row('a', 200) };
    const server = [row('a', 300), row('z', 999)];
    expect(reconcileDrafts(server, drafts)).toEqual({});
  });

  it('is a no-op when there are no drafts', () => {
    const drafts: Record<string, Row> = {};
    const server = [row('a', 300)];
    expect(reconcileDrafts(server, drafts)).toBe(drafts);
  });
});
