import { Injectable } from '@angular/core';

export interface RhymeResults {
  rhymes: string[];
  near: string[];
  synonyms: string[];
}

interface DatamuseWord {
  word: string;
  score?: number;
}

/**
 * Rhyme, near-rhyme, and word-family lookup backed by the free Datamuse API.
 * Results are cached; a network failure degrades gracefully to empty lists so the rest of
 * the editor is unaffected (see docs FR-L3 / IR-3). Swappable behind this interface.
 */
@Injectable({ providedIn: 'root' })
export class RhymeService {
  private readonly base = 'https://api.datamuse.com/words';
  private readonly cache = new Map<string, RhymeResults>();
  private readonly max = 24;

  /** Perfect rhymes, near/slant rhymes, and synonyms for a word. */
  async lookup(word: string): Promise<RhymeResults> {
    const key = word.trim().toLowerCase();
    if (!key) return { rhymes: [], near: [], synonyms: [] };
    const cached = this.cache.get(key);
    if (cached) return cached;

    const [rhymes, near, synonyms] = await Promise.all([
      this.query({ rel_rhy: key }),
      this.query({ rel_nry: key }),
      this.query({ ml: key }),
    ]);
    const result: RhymeResults = { rhymes, near, synonyms };
    this.cache.set(key, result);
    return result;
  }

  private async query(params: Record<string, string>): Promise<string[]> {
    if (typeof fetch === 'undefined') return [];
    try {
      const qs = new URLSearchParams({ ...params, max: String(this.max) }).toString();
      const res = await fetch(`${this.base}?${qs}`);
      if (!res.ok) return [];
      const words = (await res.json()) as DatamuseWord[];
      return words.map((w) => w.word);
    } catch {
      return []; // graceful — the feature disables, the app keeps working
    }
  }
}
