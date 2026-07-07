// A light, dependency-free English syllable estimator. It is a heuristic (good enough to
// flag lines that break a section's meter), not a dictionary — see docs FR-L4. Replace
// with a dictionary-backed count later if accuracy matters.

/** Estimate the syllable count of a single word. */
export function syllablesInWord(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;

  // Count vowel groups.
  const groups = w
    .replace(/e\b/g, '') // silent trailing e
    .replace(/[^aeiouy]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let count = groups.length;

  // Common adjustments.
  if (/(?:[^laeiouy]es|[^laeiouy]e)\b/.test(w)) count = Math.max(count, 1);
  if (/^y/.test(w)) count = Math.max(count, 1);

  return Math.max(1, count);
}

/** Estimate the syllable count of a whole line of lyrics. */
export function syllablesInLine(line: string): number {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, word) => sum + syllablesInWord(word), 0);
}
