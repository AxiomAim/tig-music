// ============================================================
// Tig Music — Capture & Demo (E5).
// Record a demo take in-browser (MediaRecorder), upload it to Cloud Storage under the song,
// and write a Take doc so it shows on the song. Browser-only; no-ops under SSR. Takes live at
// Storage `users/{uid}/songs/{songId}/takes/{takeId}` and Firestore
// `users/{uid}/songs/{songId}/takes/{takeId}` — owner-only, like the rest of the tree.
// ============================================================

import { Injectable, computed, inject, signal } from '@angular/core';
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
import { Storage, deleteObject, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { type Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { Take } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class RecordingService {
  private readonly db = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly auth = inject(AuthService);
  private readonly uid = computed(() => this.auth.user()?.uid ?? null);

  readonly recording = signal(false);
  readonly supported =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;

  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  /** Live list of a song's takes, newest first. */
  watchTakes(songId: string): Observable<Take[]> {
    const uid = this.uid();
    if (!uid) return of([]);
    return collectionData(query(this.col(uid, songId), orderBy('createdAt', 'desc')), {
      idField: 'id',
    }) as Observable<Take[]>;
  }

  /** Begin recording from the mic. Resolves once the recorder is running. */
  async start(): Promise<void> {
    if (!this.supported || this.recording()) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, { mimeType: this.pickMimeType() });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.startedAt = Date.now();
    this.recorder.start();
    this.recording.set(true);
  }

  /** Stop recording and return the captured audio blob (or null if nothing was captured). */
  async stopAndGet(): Promise<{ blob: Blob; durationSec: number } | null> {
    if (!this.recorder || !this.recording()) return null;
    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    const blob = await new Promise<Blob>((resolve) => {
      this.recorder!.onstop = () =>
        resolve(new Blob(this.chunks, { type: this.chunks[0]?.type ?? 'audio/webm' }));
      this.recorder!.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.recording.set(false);
    return { blob, durationSec };
  }

  /** Upload a captured blob and write its Take doc. */
  async saveTake(
    songId: string,
    blob: Blob,
    meta: { label: string; durationSec: number; tempo?: number; key?: string; note?: string },
  ): Promise<void> {
    const uid = this.uid();
    if (!uid) return;
    const takeRef = doc(this.col(uid, songId));
    const ext = blob.type.includes('mp4') || blob.type.includes('mp4a') ? 'm4a' : 'webm';
    const storagePath = `users/${uid}/songs/${songId}/takes/${takeRef.id}.${ext}`;
    await uploadBytes(ref(this.storage, storagePath), blob);
    const take: Omit<Take, 'id'> = {
      storagePath,
      label: meta.label || 'Take',
      durationSec: meta.durationSec,
      tempo: meta.tempo,
      key: meta.key,
      note: meta.note,
      createdAt: Date.now(),
    };
    await setDoc(takeRef, take);
  }

  /** A playable URL for a stored take. */
  url(take: Take): Promise<string> {
    return getDownloadURL(ref(this.storage, take.storagePath));
  }

  async removeTake(songId: string, take: Take): Promise<void> {
    const uid = this.uid();
    if (!uid) return;
    await deleteDoc(doc(this.col(uid, songId), take.id));
    try {
      await deleteObject(ref(this.storage, take.storagePath));
    } catch {
      // The doc is gone; a missing storage object is fine.
    }
  }

  private col(uid: string, songId: string) {
    return collection(this.db, 'users', uid, 'songs', songId, 'takes');
  }

  private pickMimeType(): string {
    const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const t of prefs) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t;
    }
    return '';
  }
}
