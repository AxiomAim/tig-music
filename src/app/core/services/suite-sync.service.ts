// ============================================================
// Tig Music — Suite sync.
// Writes Tig Music activity into the shared `users/{uid}` tree so the hub dashboard at
// tigpowell.com reflects Music. On sign-in it sets a Continue point (a Music card appears
// on the hub) and exposes helpers to call from writing/save flows as features land
// (Workbench sessions, saved songs/charts). Signed out, nothing is written.
// ============================================================

import { Injectable, PLATFORM_ID, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { recordSession, saveItem, setResumePoint } from '../suite/sync';

@Injectable({ providedIn: 'root' })
export class SuiteSyncService {
  private readonly db = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    // On sign-in, make sure the hub shows a Music Continue card pointing at the catalog.
    effect(() => {
      const uid = this.auth.user()?.uid;
      if (!uid) return;
      void setResumePoint(this.db, uid, 'music', {
        resumePath: '/songs',
        resumeLabel: 'Your songs',
      });
    });
  }

  /** Call when a writing session ends (e.g. time spent in the Workbench on a song). */
  async endWritingSession(durationSec: number, itemsWorked = 0): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await recordSession(this.db, uid, { appId: 'music', durationSec, itemsPracticed: itemsWorked });
  }

  /** Call from a "save" action (a song, chart, or lyric). */
  async save(type: 'song' | 'chart' | 'lyric', title: string, deepLink: string): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    await saveItem(this.db, uid, { appId: 'music', type, title, deepLink });
  }
}
