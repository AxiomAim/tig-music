// Hermes proposal types. Hermes PROPOSES and never acts: every suggestion is one of these
// editable cards, and nothing changes the song until the writer Accepts (which applies the
// `apply` payload and logs a provenance entry). See docs/05-hermes-agent-setup.md.

export type HermesSkill = 'ask' | 'rhyme' | 'scripture' | 'chord' | 'title' | 'structure';

/** How an accepted proposal mutates the song. Absent = advisory note only (never mutates). */
export type ProposalApply =
  | { type: 'append-line'; sectionId: string; text: string }
  | { type: 'add-chord'; sectionId: string; symbol: string; nashville: string }
  | { type: 'set-title'; title: string };

/** A single editable co-writer proposal. */
export interface Proposal {
  id: string;
  skill: HermesSkill;
  kind: 'line' | 'chord' | 'title' | 'note';
  target: string; // human-readable description of where it lands
  proposed: string; // the suggested text / chord / title (editable before accepting)
  rationale: string; // plain-English "why", grounded in a tool result
  sources: string[]; // verse refs / theory facts used (the grounding receipts)
  apply?: ProposalApply;
}
