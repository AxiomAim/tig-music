import { Injectable } from '@angular/core';
import { Verse, WEB_VERSES } from '../data/scripture-web';

/**
 * Scripture search over the public-domain World English Bible (WEB). Grounded: it can only
 * return verses that exist in the index — never invented text — which is the guarantee the
 * Lyric Lab and Hermes scripture-tie features rely on (docs FR-L5, LR-2).
 *
 * SEED: searches the WEB_VERSES seed set today; swaps to the full WEB index in E1 without
 * changing this interface.
 */
@Injectable({ providedIn: 'root' })
export class ScriptureService {
  private readonly verses = WEB_VERSES;

  /** Keyword/theme/reference search. Ranks reference and theme hits above body hits. */
  search(query: string, limit = 8): Verse[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);

    const scored = this.verses
      .map((v) => ({ v, score: this.score(v, terms) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.v);
  }

  /** Exact-ish reference lookup, e.g. "John 3:16". */
  byReference(ref: string): Verse | undefined {
    const r = ref.trim().toLowerCase();
    return this.verses.find((v) => v.ref.toLowerCase() === r);
  }

  private score(v: Verse, terms: string[]): number {
    const ref = v.ref.toLowerCase();
    const text = v.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (ref.includes(t)) score += 5;
      if (v.themes.some((theme) => theme.includes(t))) score += 3;
      if (text.includes(t)) score += 1;
    }
    return score;
  }
}
