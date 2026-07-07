// ============================================================
// Tig Music — the Song aggregate.
// A song is ONE object: metadata + ordered sections (each with lyric lines and its own
// chord progression) + demo takes + a human-authorship provenance log + release info.
// See docs/03-design-and-architecture.md §6.
// ============================================================

/** Where a song sits in the writer's pipeline. Drives the Catalog board + header. */
export type SongStatus = 'idea' | 'draft' | 'demo' | 'recorded' | 'released';

export const SONG_STATUSES: SongStatus[] = ['idea', 'draft', 'demo', 'recorded', 'released'];

/** The kind of a song section. Used to label and to render charts. */
export type SectionType =
  | 'intro'
  | 'verse'
  | 'prechorus'
  | 'chorus'
  | 'bridge'
  | 'hook'
  | 'tag'
  | 'outro';

export const SECTION_TYPES: SectionType[] = [
  'intro',
  'verse',
  'prechorus',
  'chorus',
  'bridge',
  'hook',
  'tag',
  'outro',
];

/** A chord placed in a section's progression lane (bar/beat grid). */
export interface ChordEvent {
  /** Concrete chord symbol in the song's key, e.g. "Gmaj7", "D/F#". */
  symbol: string;
  /** Nashville number in the song's key, e.g. "1", "5/7". Computed; may be blank. */
  nashville: string;
  bar: number;
  beat: number;
  durationBeats: number;
}

/** An inline chord anchor over a lyric line — the render source for charts. */
export interface ChordAnchor {
  symbol: string;
  /** Character offset into the line's text where the chord sits above. */
  charOffset: number;
}

/** One lyric line with its inline chord anchors. */
export interface LyricLine {
  text: string;
  chordAnchors: ChordAnchor[];
}

/** An ordered, typed song section: lyrics + its own progression. */
export interface Section {
  id: string;
  type: SectionType;
  label: string;
  order: number;
  lines: LyricLine[];
  progression: ChordEvent[];
  /** Kept-but-not-current alternate takes of this section. */
  alternates?: Section[];
}

/** A recorded demo take attached to a song (audio lives in Cloud Storage). */
export interface Take {
  id: string;
  storagePath: string;
  label: string;
  note?: string;
  tempo?: number;
  key?: string;
  durationSec: number;
  createdAt: number;
}

/** A writer + their split percentage (for co-writes and release registration). */
export interface Writer {
  name: string;
  splitPct: number;
}

/** Release / distribution metadata. */
export interface ReleaseInfo {
  writers: Writer[];
  iswc?: string;
  ccli?: string;
  releaseDate?: string;
  coverArtPath?: string;
  spotifyTrackUrl?: string;
  distributor?: 'DistroKid' | 'RouteNote';
}

/** One entry in the human-authorship / provenance log. Every accepted Hermes
 *  suggestion appends one, so a released song has a clean, provable authorship trail. */
export interface ProvenanceEntry {
  /** What was touched, e.g. "section:{id}/line:{n}" or "chord:{...}". */
  target: string;
  kind: 'human' | 'ai-suggested';
  acceptedAt: number;
  hermesToolCallId?: string;
  summary?: string;
}

/** The Song aggregate root (stored at users/{uid}/songs/{songId}). */
export interface Song {
  id: string;
  /** uid of the writer who owns this song. Songs live under users/{ownerUid}/songs/{id}. */
  ownerUid?: string;
  title: string;
  /** Song key as a pitch class 0–11 (see TheoryService). */
  key: number;
  tempo: number;
  timeSignature: string;
  capo?: number;
  status: SongStatus;
  tags: string[];
  sections: Section[];
  release: ReleaseInfo;
  provenance: ProvenanceEntry[];
  createdAt: number;
  updatedAt: number;
}

/** A restorable named snapshot of a song (users/{uid}/songs/{songId}/versions/{vId}). */
export interface VersionSnapshot {
  id: string;
  label: string;
  createdAt: number;
  song: Song;
}
