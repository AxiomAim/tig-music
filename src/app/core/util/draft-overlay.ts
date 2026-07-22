// Draft overlay — a synchronous, locally-authoritative view of the songs the writer is editing.
//
// Every write records its result here BEFORE Firestore echoes it back, so a read-modify-write
// (the store rewrites the whole song document on each edit) never rebuilds a song from a stale
// snapshot and clobbers a change that hasn't round-tripped yet — e.g. a debounced lyric autosave
// landing right after a section-type change. Once the server confirms an update at least as new,
// the draft is dropped so the server is the source of truth again (version restores, other
// devices) — see reconcileDrafts.

interface HasIdAndUpdatedAt {
  id: string;
  updatedAt: number;
}

/** Draft ids the server snapshot has caught up on (its `updatedAt` ≥ the draft's), i.e. drafts
 *  that are safe to drop. */
export function supersededDraftIds<T extends HasIdAndUpdatedAt>(
  server: T[],
  drafts: Record<string, T>,
): string[] {
  return server
    .filter((s) => {
      const draft = drafts[s.id];
      return draft !== undefined && s.updatedAt >= draft.updatedAt;
    })
    .map((s) => s.id);
}

/** Drafts with the superseded ids removed. Returns the SAME reference when nothing changed, so
 *  a signal set can be skipped. */
export function reconcileDrafts<T extends HasIdAndUpdatedAt>(
  server: T[],
  drafts: Record<string, T>,
): Record<string, T> {
  const stale = supersededDraftIds(server, drafts);
  if (stale.length === 0) return drafts;
  const next = { ...drafts };
  for (const id of stale) delete next[id];
  return next;
}
