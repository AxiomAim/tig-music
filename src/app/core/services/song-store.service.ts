// ============================================================
// Tig Music — Song store (Firestore-backed, per-writer).
// Songs live at users/{uid}/songs/{songId}, so a song is owned by the signed-in writer and is
// invisible to everyone else (enforced by the shared project's users/{uid}/** owner-only rules).
// Signed out → the catalog is empty and nothing can be created. Keeps the synchronous signal
// API the Catalog/Workbench/Chart already use; mutations persist to Firestore (live via
// collectionData). See docs/04-development-plan.md US-3.3.
// ============================================================

import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  orderBy,
  query,
  setDoc,
} from '@angular/fire/firestore';
import { type Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProvenanceEntry, Section, Song, VersionSnapshot } from '../models/song.model';
import { autoLabel, withSectionType } from '../util/section-label';

@Injectable({ providedIn: 'root' })
export class SongStore {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);

  /** The signed-in writer's uid, or null when signed out. */
  private readonly uid = computed(() => this.auth.user()?.uid ?? null);

  /**
   * The signed-in writer's songs (newest first). Empty when signed out — so no songs are ever
   * shown, and none can be created, without an account.
   */
  readonly songs = toSignal(
    toObservable(this.uid).pipe(
      switchMap((uid) =>
        uid
          ? (collectionData(query(this.col(uid), orderBy('updatedAt', 'desc')), {
              idField: 'id',
            }) as Observable<Song[]>)
          : of([] as Song[]),
      ),
    ),
    { initialValue: [] as Song[] },
  );

  get(id: string): Song | undefined {
    return this.songs().find((s) => s.id === id);
  }

  /** Create a song owned by the signed-in writer. Throws if signed out. Returns the new song. */
  async create(title = 'Untitled song'): Promise<Song> {
    const uid = this.requireUid();
    const ref = doc(this.col(uid));
    const now = Date.now();
    const song: Song = {
      id: ref.id,
      ownerUid: uid,
      title,
      key: 0,
      tempo: 80,
      timeSignature: '4/4',
      status: 'idea',
      tags: [],
      sections: [this.blankSection('verse', 'Verse 1', 0)],
      release: { writers: [] },
      provenance: [],
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, this.toDoc(song));
    return song;
  }

  /** Replace a song (used by the Workbench as edits happen). */
  update(song: Song): void {
    this.persist(song);
  }

  /** Patch a song's metadata (title, key, tempo, time signature, status, tags). */
  updateMeta(songId: string, patch: Partial<Song>): void {
    this.mutate(songId, (song) => ({ ...song, ...patch }));
  }

  /** Append a new blank section of the given type. */
  addSection(songId: string, type: Section['type'] = 'verse'): void {
    this.mutate(songId, (song) => {
      const label = autoLabel(song.sections, type);
      return {
        ...song,
        sections: [...song.sections, this.blankSection(type, label, song.sections.length)],
      };
    });
  }

  /** Change a section's type, auto-renaming its label when it's still a default
   *  (e.g. "Verse 1" → "Chorus"). A label the writer has hand-customized is kept. */
  changeSectionType(songId: string, sectionId: string, type: Section['type']): void {
    this.mutate(songId, (song) => ({
      ...song,
      sections: withSectionType(song.sections, sectionId, type),
    }));
  }

  /** Replace one section (by id) with an edited copy. */
  updateSection(songId: string, section: Section): void {
    this.mutate(songId, (song) => ({
      ...song,
      sections: song.sections.map((s) => (s.id === section.id ? section : s)),
    }));
  }

  removeSection(songId: string, sectionId: string): void {
    this.mutate(songId, (song) => ({
      ...song,
      sections: this.reindex(song.sections.filter((s) => s.id !== sectionId)),
    }));
  }

  duplicateSection(songId: string, sectionId: string): void {
    this.mutate(songId, (song) => {
      const idx = song.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return song;
      const original = song.sections[idx];
      const copy: Section = {
        ...structuredClone(original),
        id: 'sec' + Math.random().toString(36).slice(2, 8),
        label: original.label + ' (copy)',
      };
      const sections = [...song.sections];
      sections.splice(idx + 1, 0, copy);
      return { ...song, sections: this.reindex(sections) };
    });
  }

  /** Move a section one slot up (dir -1) or down (dir +1). */
  moveSection(songId: string, sectionId: string, dir: -1 | 1): void {
    this.mutate(songId, (song) => {
      const idx = song.sections.findIndex((s) => s.id === sectionId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= song.sections.length) return song;
      const sections = [...song.sections];
      [sections[idx], sections[target]] = [sections[target], sections[idx]];
      return { ...song, sections: this.reindex(sections) };
    });
  }

  /** Delete a song entirely. */
  async remove(songId: string): Promise<void> {
    const uid = this.uid();
    if (uid) await deleteDoc(doc(this.db, 'users', uid, 'songs', songId));
  }

  // --- version snapshots (US-3.3) ------------------------------------------

  /** Live list of a song's named snapshots, newest first. */
  watchVersions(songId: string): Observable<VersionSnapshot[]> {
    const uid = this.uid();
    if (!uid) return of([]);
    return collectionData(query(this.versionsCol(uid, songId), orderBy('createdAt', 'desc')), {
      idField: 'id',
    }) as Observable<VersionSnapshot[]>;
  }

  /** Save the current state of a song as a restorable named snapshot. */
  async snapshot(songId: string, label: string): Promise<void> {
    const uid = this.uid();
    const song = this.get(songId);
    if (!uid || !song) return;
    const ref = doc(this.versionsCol(uid, songId));
    await setDoc(ref, { label: label.trim() || 'Untitled version', createdAt: Date.now(), song });
  }

  /** Restore a snapshot's content over the live song (its own next autosave persists it). */
  restore(songId: string, snapshot: VersionSnapshot): void {
    this.persist({ ...snapshot.song, id: songId, updatedAt: Date.now() });
  }

  /** Append a human-authorship / provenance entry (called when a Hermes suggestion is
   *  accepted, or to record human edits). See docs/05-hermes-agent-setup.md §6. */
  logProvenance(songId: string, entry: ProvenanceEntry): void {
    this.mutate(songId, (song) => ({ ...song, provenance: [...song.provenance, entry] }));
  }

  // --- persistence ---------------------------------------------------------
  private col(uid: string) {
    return collection(this.db, 'users', uid, 'songs');
  }

  private versionsCol(uid: string, songId: string) {
    return collection(this.db, 'users', uid, 'songs', songId, 'versions');
  }

  private persist(song: Song): void {
    const uid = this.uid();
    if (!uid) return;
    void setDoc(
      doc(this.db, 'users', uid, 'songs', song.id),
      this.toDoc({ ...song, updatedAt: Date.now() }),
    );
  }

  private mutate(songId: string, fn: (song: Song) => Song): void {
    const song = this.get(songId);
    if (song) this.persist(fn(song));
  }

  /** Strip the derived `id` (it comes from the doc id on read) before writing. */
  private toDoc(song: Song): Omit<Song, 'id'> {
    const { id: _id, ...rest } = song;
    return rest;
  }

  private requireUid(): string {
    const uid = this.uid();
    if (!uid) throw new Error('Sign in to create songs.');
    return uid;
  }

  private reindex(sections: Section[]): Section[] {
    return sections.map((s, i) => ({ ...s, order: i }));
  }

  private blankSection(type: Section['type'], label: string, order: number): Section {
    return {
      id: 'sec' + Math.random().toString(36).slice(2, 8),
      type,
      label,
      order,
      lines: [],
      progression: [],
    };
  }
}
