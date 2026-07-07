// ============================================================
// Tig music suite — shared write contract.  (drop-in copy)
//
// Canonical source: tig-powell/src/lib/suite/sync.ts. Keep this file in sync with it.
// Framework-agnostic: plain TypeScript over the Firebase modular SDK, so the Vue hub
// and this Angular app produce identical shapes that the hub dashboard reads verbatim.
// See tig-powell/docs/00-architecture/03-suite-data-contract.md.
// ============================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

export type SuiteAppId = 'guitar' | 'banjo' | 'music';

/** A logged practice session — the unit the dashboard derives streak + minutes from. */
export interface SessionInput {
  appId: SuiteAppId;
  durationSec: number;
  itemsPracticed?: number;
  /** Override the local day; defaults to today. Format: 'YYYY-MM-DD'. */
  day?: string;
}

/** Cached per-app rollups shown on the dashboard. Send what you have. */
export interface ProgressPatch {
  streakDays?: number;
  longestStreak?: number;
  totalMinutes?: number;
  masteryCount?: number;
  level?: number;
  resumePath?: string;
  resumeLabel?: string;
}

/** A cross-app saved item. */
export interface SavedItemInput {
  appId: SuiteAppId;
  type: 'chord' | 'roll' | 'tab' | 'tuning' | 'lesson' | 'progression' | 'song' | 'chart' | 'lyric';
  title: string;
  deepLink?: string;
  payload?: Record<string, unknown>;
}

/** Local-day key, 'YYYY-MM-DD'. */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Log a practice session and roll its minutes into the per-app progress doc. */
export async function recordSession(
  db: Firestore,
  uid: string,
  input: SessionInput,
): Promise<void> {
  const minutes = Math.round(input.durationSec / 60);
  await addDoc(collection(db, 'users', uid, 'sessions'), {
    appId: input.appId,
    day: input.day ?? dayKey(),
    durationSec: input.durationSec,
    itemsPracticed: input.itemsPracticed ?? 0,
    startedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, 'users', uid, 'progress', input.appId),
    {
      appId: input.appId,
      totalMinutes: increment(minutes),
      lastPracticedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() }, { merge: true });
}

/** Upsert the cached rollups for one app. */
export async function updateProgress(
  db: Firestore,
  uid: string,
  appId: SuiteAppId,
  patch: ProgressPatch,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'progress', appId),
    { appId, ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Convenience: set just the resume point shown on the Continue card. */
export async function setResumePoint(
  db: Firestore,
  uid: string,
  appId: SuiteAppId,
  resume: { resumePath?: string; resumeLabel?: string },
): Promise<void> {
  await updateProgress(db, uid, appId, resume);
}

/** Save a cross-app item; returns its generated id. */
export async function saveItem(db: Firestore, uid: string, item: SavedItemInput): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'saved'), {
    ...item,
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Remove a previously saved item by id. */
export async function removeSavedItem(db: Firestore, uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'saved', itemId));
}
