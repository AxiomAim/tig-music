# Tig Music — Requirements

The requirements Tig Music is built and accepted against: **functional** (what it must do),
**non-functional** (how well), **data**, **integration**, **AI/Hermes**, **legal & IP**, and
**acceptance**. Each requirement has a stable ID so [user stories](04-development-plan.md) and
tests can reference it. Priority uses **MoSCoW** (Must / Should / Could / Won't-yet).

---

## 1. Scope & assumptions

- **In scope (v1):** single-user songwriting studio — the seven pillars in
  [01-features-and-specifications.md](01-features-and-specifications.md) — deployed to
  `music.tigpowell.com`, integrated with the tig-powell hub and (for charts) Tig Worship,
  with the Hermes AI co-writer.
- **Out of scope (v1):** AI song *generation* (full lyrics/melody from a prompt), a
  multi-track DAW/mixer, real-time multi-user co-writing, a public song marketplace, native
  app-store distribution (Capacitor shells are built but store submission is later).
- **Primary user:** the account owner (Tom). Multi-user co-write is roadmap.
- **Platforms:** modern evergreen browsers (Chrome, Safari, Edge, Firefox), responsive for
  tablet/phone web, plus a Capacitor shell for iOS/Android capture.

---

## 2. Functional requirements

### 2.1 Lyric Lab
- **FR-L1 (Must)** — Create a song as an ordered list of typed sections (verse, pre-chorus,
  chorus, bridge, intro, outro, tag, hook); add, rename, reorder (drag), duplicate, delete.
- **FR-L2 (Must)** — Edit lyric lines per section with continuous autosave and undo/redo.
- **FR-L3 (Must)** — Rhyme finder: for a selected/typed word, return perfect rhymes,
  near/slant rhymes, and synonyms/associations; insertable into a line.
- **FR-L4 (Should)** — Per-line syllable count and a meter/stress read; flag lines that break a
  section's established syllable pattern.
- **FR-L5 (Must)** — Inline scripture search over the WEB translation with cross-references;
  insert a verse or reference into a line and record the citation in song metadata.
- **FR-L6 (Should)** — Keep alternate takes of a section without discarding the current one.

### 2.2 Harmony Sketchpad
- **FR-H1 (Must)** — Choose a key and display the diatonic chords with Nashville numbers.
- **FR-H2 (Must)** — Add borrowed/colored chords (bVII, slash chords, secondary dominants,
  dom7) to a progression from a palette.
- **FR-H3 (Must)** — Build a per-section chord progression in an ordered bar/beat lane.
- **FR-H4 (Must)** — Play a section's progression back at an adjustable tempo (Web Audio).
- **FR-H5 (Must)** — Toggle chord display between chord names and Nashville numbers globally.
- **FR-H6 (Should)** — Sketch a melody top-line over the progression (piano-roll) with
  scale-degree highlighting and playback. *(v1)*

### 2.3 Chart & Lead Sheet
- **FR-C1 (Must)** — Render a chord/lyric (ChordPro-style) chart from a song's sections +
  progressions.
- **FR-C2 (Must)** — Render a Nashville Number chart.
- **FR-C3 (Must)** — Transpose the whole song to any key with correct enharmonic chord
  spelling; numbers remain invariant.
- **FR-C4 (Must)** — Export ChordPro and PDF.
- **FR-C5 (Should)** — Export MusicXML (MuseScore-compatible) and render a melody lead sheet.
  *(v1)*
- **FR-C6 (Should)** — Import a ChordPro file into a new song. *(v1)*
- **FR-C7 (Could)** — Push a chart to the Tig Worship song library. *(v1/roadmap)*

### 2.4 Capture & Demo
- **FR-D1 (Must)** — Record audio in-browser and attach it as a dated, labeled take on a song.
- **FR-D2 (Must)** — Store takes in Firebase Storage and stream them back for playback.
- **FR-D3 (Must)** — Metronome/click with adjustable tempo, time signature, and count-in.
- **FR-D4 (Should)** — Tag each take with tempo, key, and a note.
- **FR-D5 (Could)** — Overdub/sing over an existing take (layered idea). *(v1)*
- **FR-D6 (Should)** — Record and sync a take from the Capacitor mobile shell. *(v1)*

### 2.5 Song Workbench (flagship)
- **FR-W1 (Must)** — Present one song's lyrics, harmony, takes, and header on a single,
  responsive surface with show/hide panels.
- **FR-W2 (Must)** — Maintain one live song context (key/tempo/time-sig); changing it updates
  progression labels, the chart, playback, and Hermes's context in real time.
- **FR-W3 (Must)** — Persist continuously (autosave) and support named version snapshots with
  restore.
- **FR-W4 (Must)** — Host the Hermes margin panel scoped to the current song.
- **FR-W5 (Must)** — Show and advance the song status lifecycle (idea → draft → demo →
  recorded → released).

### 2.6 Catalog & Release
- **FR-CAT1 (Must)** — List all songs with search and filter (status, key, tag, text).
- **FR-CAT2 (Should)** — Board (Kanban) view of songs by status.
- **FR-CAT3 (Must)** — Per-song release panel: title, writers & splits, dates, optional
  ISWC/CCLI, cover-art slot, Spotify URL.
- **FR-CAT4 (Must)** — Maintain a human-authorship / provenance log per song (human vs.
  AI-suggested content).
- **FR-CAT5 (Should)** — Generate a DistroKid/RouteNote-ready metadata sheet and a splits
  sheet.
- **FR-CAT6 (Could)** — Export the whole catalog to CSV/JSON.

### 2.7 Hermes (AI co-writer)
- **FR-AI1 (Must)** — Provide a conversational, song-scoped co-writer that returns editable
  **proposal cards**, never direct edits.
- **FR-AI2 (Must)** — Skills: rhyme/line options, scripture ties, chord/substitution
  suggestions, structure critique, title/hook ideas, plain-language theory answers.
- **FR-AI3 (Must)** — Enforce **propose-never-act**: no song mutation without an explicit
  user Accept; read tools may run freely.
- **FR-AI4 (Must)** — Ground suggestions in real data (theory engine, WEB scripture, rhyme
  service, the song's own content) — no invented verses, keys, or facts.
- **FR-AI5 (Must)** — Log every accepted suggestion into the song's provenance record.
- **FR-AI6 (Should)** — Offer inline "✨ suggest" on a selected line/chord and a ⌘K command
  bar. *(v1)*

### 2.8 Accounts, suite & cross-cutting
- **FR-A1 (Must)** — Google sign-in (Firebase Auth) against the shared tig-powell project.
- **FR-A2 (Must)** — Signed-out: the app is read-only/local-only for a demo song; signing in
  enables persistence and sync.
- **FR-A3 (Must)** — Write the shared `users/{uid}` suite tree with `appId: 'music'`
  (progress, sessions, saved) so the hub dashboard reflects Tig Music.
- **FR-A4 (Must)** — Dark mode, and honor the hub's theme/left-handed prefs.

---

## 3. Non-functional requirements

- **NFR-Perf1 (Must)** — First contentful paint < 2.5 s on a mid-tier laptop over broadband;
  route-level code-splitting so opening one song doesn't load the whole app. Initial JS budget
  ≤ 900 kB (matches the family's raised Firebase budget).
- **NFR-Perf2 (Must)** — Audio playback latency for metronome/progression start < 100 ms after
  user gesture; scheduling jitter inaudible.
- **NFR-Perf3 (Should)** — Autosave writes debounced (≤ 1 write / 2 s per song) to control
  Firestore cost.
- **NFR-Rel1 (Must)** — No data loss on refresh/crash: autosaved state and uploaded takes
  survive; optimistic UI reconciles on reconnect.
- **NFR-Sec1 (Must)** — A user can read/write only their own `users/{uid}/**` tree and their
  own songs; Firestore/Storage security rules enforce this server-side.
- **NFR-Sec2 (Must)** — Hermes mutating tools are gated server-side behind an action token;
  no write path exists that bypasses user Accept (enforced in code, unit-tested).
- **NFR-Cost1 (Should)** — Per-user AI token budget with caching of grounding context; prefer
  deterministic engines over model calls for anything factual (rhymes, transpose, scripture).
- **NFR-A11y1 (Must)** — WCAG 2.1 AA: keyboard-navigable editor and diagrams, color-blind-safe
  chord/section colors, screen-reader labels, respects reduced-motion, note-name vs.
  Nashville-number toggle.
- **NFR-A11y2 (Should)** — Left-handed and high-contrast modes inherited from hub prefs.
- **NFR-SEO1 (Should)** — SSR/prerender the marketing/landing and public help routes for
  crawlability; per-route titles/descriptions.
- **NFR-Port1 (Should)** — The web app runs unchanged inside the Capacitor shell; native code
  limited to capture/permissions.
- **NFR-Maint1 (Must)** — Match the family conventions: Angular standalone + signals, Prettier
  (100 col, single quotes), feature-based folders, ported shared engines.
- **NFR-Priv1 (Must)** — Only the signed-in user's own data is ever sent to Hermes; no
  cross-user content in AI context.

---

## 4. Data requirements

- **DR-1 (Must)** — A **Song** is the aggregate root: metadata + ordered sections + per-section
  progressions + takes (Storage refs) + provenance log + release fields. Full shapes in
  [03-design-and-architecture.md](03-design-and-architecture.md) §6.
- **DR-2 (Must)** — Songs are stored per user in Firestore (`users/{uid}/songs/{songId}`),
  demo takes in Storage (`users/{uid}/songs/{songId}/takes/*`).
- **DR-3 (Must)** — Suite tree (`progress`, `sessions`, `saved`) written per the
  [Suite Data Contract](../../tig-powell/docs/00-architecture/03-suite-data-contract.md),
  `appId = 'music'`.
- **DR-4 (Must)** — The WEB scripture text is bundled/served as app-local reference content
  (public domain), not per-user data.
- **DR-5 (Should)** — Version snapshots are stored as immutable copies (or diffs) under the
  song; capped in count with oldest pruned.
- **DR-6 (Must)** — Provenance log entries record `{ target, type: human|ai-suggested,
  acceptedAt, hermesToolCallId? }` and are never silently dropped.

---

## 5. Integration requirements

- **IR-1 (Must)** — **Firebase**: Auth (Google), Firestore, Cloud Storage, Hosting/App
  Hosting, in the shared `tig-powell` project family.
- **IR-2 (Must)** — **Firebase AI Logic (Gemini)** for Hermes with function-calling and
  structured output (see [05-hermes-agent-setup.md](05-hermes-agent-setup.md)).
- **IR-3 (Must)** — **Datamuse API** (or equivalent) for rhymes/near-rhymes/word families;
  degrade gracefully if unavailable (feature disabled, app unaffected).
- **IR-4 (Must)** — **tig-powell hub**: `/music` describe-and-link page + suite dashboard
  integration.
- **IR-5 (Should)** — **Tig Worship**: chart handoff into the shared worship song library.
- **IR-6 (Could)** — **Planning Center / CCLI SongSelect** export (chart/metadata) — stretch.
- **IR-7 (Should)** — **Spotify**: store/link the released-track and artist URLs; public stats
  read is roadmap.
- **IR-8 (Could)** — **DistroKid / RouteNote**: generate an import-ready metadata/splits sheet
  (no direct API dependency assumed).

---

## 6. Legal, IP & content requirements

- **LR-1 (Must)** — **Human authorship of record.** Melody and lyric authorship must be human;
  Hermes may suggest but every accepted suggestion is logged, and released songs carry a
  human-authorship provenance record (the brief's copyright caution, enforced).
- **LR-2 (Must)** — **Public-domain scripture only** in shipped content: the World English
  Bible (WEB) translation. No copyrighted translations bundled.
- **LR-3 (Must)** — **No scraping of copyrighted content** (lyrics, charts, tab). Reference
  imports are user-supplied or clearly study-only.
- **LR-4 (Should)** — Splits and writer credits are captured per song to support fair
  co-write registration and distribution.
- **LR-5 (Should)** — Third-party API usage (Datamuse, Gemini) complies with their terms;
  no PII beyond the user's own account is sent.

---

## 7. Acceptance criteria (v1 "done")

Tig Music v1 is accepted when a signed-in user can, end to end and without leaving the app:

1. Create a song, write it in typed sections with rhyme + scripture help (FR-L*).
2. Sketch an in-key progression with Nashville numbers and hear it (FR-H1–H5).
3. Generate a chord chart and a Nashville chart, transpose to another key, and export
   ChordPro + PDF (FR-C1–C4).
4. Record a demo take onto the song and play it back (FR-D1–D3).
5. Do all of the above on one Song Workbench surface with live context and autosave
   (FR-W1–W5).
6. Ask Hermes for line/chord/scripture/title options, accept one, and see it logged in the
   provenance record — with **no** un-accepted edit ever entering the song (FR-AI*, LR-1).
7. See the song in a searchable catalog, mark it released with a Spotify link, and generate a
   release metadata sheet (FR-CAT*).
8. Have the hub dashboard reflect the session (streak/minutes/continue) via the suite contract
   (FR-A3).
9. Pass the non-functional bars: perf budget, security rules, a11y AA, and the
   propose-never-act safety test (NFR-*).
