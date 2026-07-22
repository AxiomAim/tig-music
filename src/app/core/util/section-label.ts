// Pure labeling helpers for song sections — the naming rules the Workbench relies on when
// a writer adds a section or changes its type. Kept free of Firestore so they're unit-testable.

import { Section, SectionType } from '../models/song.model';

/** True when a label still looks auto-generated ("Verse", "Verse 2", "Prechorus") rather than
 *  a name the writer typed themselves ("Big Drop", "Verse 1 (copy)"). */
export function isDefaultLabel(label: string): boolean {
  return /^(intro|verse|prechorus|chorus|bridge|hook|tag|outro)( \d+)?$/i.test(label.trim());
}

/** The default label for a section of `type`, numbered against the sections that already exist
 *  (a second verse → "Verse 2"; a lone bridge → "Bridge"). */
export function autoLabel(existing: Section[], type: SectionType): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  const n = existing.filter((s) => s.type === type).length + 1;
  return type === 'verse' ? `Verse ${n}` : n > 1 ? `${cap} ${n}` : cap;
}

/** Return `sections` with one section retyped, auto-renaming its label when it's still a default
 *  (so the dropdown and name stay in sync). A hand-customized label is preserved. */
export function withSectionType(
  sections: Section[],
  sectionId: string,
  type: SectionType,
): Section[] {
  return sections.map((s) => {
    if (s.id !== sectionId) return s;
    const others = sections.filter((o) => o.id !== sectionId);
    const label = isDefaultLabel(s.label) ? autoLabel(others, type) : s.label;
    return { ...s, type, label };
  });
}
