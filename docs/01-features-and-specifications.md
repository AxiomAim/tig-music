# Tig Music — Features, Benefits & Specifications

Every tool Tig Music ships: what it does, **why it matters** (the benefit), and the concrete
**spec** it's built to. Organized as the seven pillars from the
[overview](00-overview.md), then the roadmap. The tool each pillar replaces is called out so
the value is grounded in the real toolkit from the [brief](00-tig-music.md).

Legend: **MVP** = ships in the first release · **v1** = first full version · **Roadmap** =
planned, post-v1.

---

## Pillar 1 — Lyric Lab  *(replaces: RhymeZone, MasterWriter, Songwriter's Pad, a Bible app + Word doc)*

**What it does.** A distraction-light lyric editor that is *aware of song structure*. You
write into labeled sections (Verse 1, Pre-Chorus, Chorus, Bridge, Tag), and craft tools sit
one click away.

**Benefit.** The lyric tools that today live in five browser tabs are inline and
section-aware — you draft naturally, then tighten only the weak words, the way pros use rhyme
tools *late* (per the brief's caution against engineering songs too early).

**Spec.**
- **Section model** — a song is an ordered list of sections; each has a type
  (`verse | prechorus | chorus | bridge | intro | outro | tag | hook`), a label, and lyric
  lines. Sections are reorderable (drag), duplicable, and collapsible.
- **Rhyme & near-rhyme finder** — select or type a word → perfect rhymes, near/slant rhymes,
  and same-syllable-count matches. **MVP** uses the free [Datamuse API](https://www.datamuse.com/api/)
  (rhymes, near-rhymes, means-like, sounds-like — no key, generous limits); results cached.
- **Word & phrase families** — synonyms, associations, and "means like" (Datamuse `ml=`),
  for the MasterWriter-style word-craft job.
- **Syllable & meter meter** — per-line syllable count and a light stress/meter read, so a
  chorus line scans against its melody. Highlights lines that break the established meter.
- **Scripture search (inline)** — see Pillar-shared engine below; drop a verse or a
  cross-reference straight into a line, with a citation kept in the song's metadata.
- **Section-aware history** — every line edit is undoable; a section keeps alternate takes
  ("give me the other chorus") without losing the current one.

---

## Pillar 2 — Harmony Sketchpad  *(replaces: Hookpad / Hooktheory, Song Cage)*

**What it does.** A theory-aware surface for sketching chord progressions and a melody line
*in key*, so you can try changes and hear them without leaving the song.

**Benefit.** The Hookpad job — dragging chords and a melody around in-key and testing
choruses — but Nashville-native and connected to the same song your lyrics live in. Built for
the blues-inflected worship palette the writer actually uses.

**Spec.**
- **In-key chord palette** — pick a key; get the diatonic chords with **Nashville numbers**
  (1, 4, 5, 6m…) and one-tap borrowed/colored chords common to the style: **bVII, IV/I
  (slash), secondary dominants, dom7 blues moves, the ♭3 and ♭7 colors**. Reuses the
  family's `theory` engine (ported from Tig Guitar / Tig Worship).
- **Circle of fifths** — visual key + relationship picker; click to change key and everything
  re-labels.
- **Progression lane** — an ordered bar/beat lane of chords per section; loop a section and
  play it back at an adjustable tempo (Web Audio; see Pillar 4 audio engine).
- **Melody sketch (v1)** — a simple piano-roll/step lane over the progression to lay a top
  line in-key, with scale-degree highlighting; playable against the chords. **MVP** ships
  chords-only playback; melody sketch lands in v1.
- **Nashville ⟷ chord toggle** — every chord shows as a name (G, C, D7) or a number (1, 4, 57)
  in the current key, switchable globally.
- **Feeds the chart** — the progression is the source of truth the Chart pillar renders and
  transposes.

---

## Pillar 3 — Chart & Lead Sheet  *(replaces: MuseScore for charts, CCLI SongSelect study)*

**What it does.** Turns the song's lyrics + progression into shareable, printable, and
transposable charts.

**Benefit.** One click from "the song in my head" to a chord chart, a Nashville chart for the
band, and a melody lead sheet — in any key the singer needs — and out to the tools the world
already reads (MuseScore, Planning Center, PDF).

**Spec.**
- **Chart types** — (1) **Chord/lyric chart** (chords above lyrics, ChordPro-style),
  (2) **Nashville Number chart**, (3) **Lead sheet** (melody staff + chords + lyrics).
- **Transpose to any key** — reuse the family transpose engine
  ([Tig Worship charts](../../tig-worship/docs/06-charts-and-transpose.md)); numbers stay
  constant, chord names re-spell correctly (respecting sharp/flat key spelling), capo hint
  optional.
- **Export** — **ChordPro** (`.cho`) and **PDF** at MVP; **MusicXML** (opens in MuseScore /
  Finale) and a print-optimized lead sheet at v1. Import ChordPro at v1.
- **Worship handoff (v1)** — push a finished chart into the Tig Worship song library (shared
  Firebase project) so it's instantly a team chart-in-any-key with tracks; optional Planning
  Center export (CCLI/PCO) as a stretch.
- **Metadata on the chart** — key, tempo, time signature, capo, CCLI/ISWC fields (blank until
  registered), and the human-authorship note.

---

## Pillar 4 — Capture & Demo  *(replaces: Voice Memos, quick BandLab/GarageBand capture)*

**What it does.** Record demo takes and idea snippets straight onto the song, with a
metronome and tempo/key tagging. Explicitly a capture pad, **not** a DAW.

**Benefit.** The zero-friction "hum it before you lose it" baseline, but the recording lands
*on the song* instead of in a camera-roll graveyard — so the idea, the words, and the changes
stay together. GarageBand stays the place for real demos; this is the place for the idea.

**Spec.**
- **In-browser recording** — Web Audio / `MediaRecorder`; capture mic (and line-in via the
  OS) to a take attached to the song. Multiple takes per song, each labeled and dated.
- **Storage** — takes upload to **Firebase Cloud Storage** under the song; streamed back for
  playback. Size/length caps per take (see [requirements](02-requirements.md)).
- **Metronome & click** — adjustable tempo, time signature, count-in; shares the audio
  scheduler with the Harmony Sketchpad.
- **Tags** — each take carries tempo, key, and a note ("bridge idea", "phone demo 4/6").
- **Layered idea (v1)** — sing over an existing take (simple overdub), the Voice-Memos
  "Layered Recording" analog. Not multi-track mixing.
- **Mobile capture (v1)** — via **Capacitor** the native shell can record and sync a take
  from a phone, then it appears on the song on the web.

---

## Pillar 5 — Song Workbench ⭐ (flagship)  *(the thing no single tool in the brief does)*

**What it does.** The home screen for a single song: lyrics, chords, melody, demo takes, and
metadata on one surface, with **Hermes** in the margin. It's where writing actually happens;
the other pillars are its panels.

**Benefit.** This is the whole thesis made concrete — *a song is one object*. Everything about
the song is in view and in sync: change the key and the chart, the sketch, and Hermes's
suggestions all follow. It's the difference between "six tools" and "a studio."

**Spec.**
- **Unified layout** — a **lyric/section column** (Pillar 1), a **harmony lane** (Pillar 2), a
  **takes strip** (Pillar 4), and a **song header** (title, key, tempo, time signature,
  status, tags). Panels are show/hide-able and responsive.
- **Live context** — the song's key/tempo is a single source of truth; changing it updates the
  progression labels, the chart, playback, and Hermes's context in real time (a signal store,
  the family `ContextBar` pattern).
- **Section-linked chords** — each lyric section owns its progression, so the chart renders
  chords over the right lines automatically.
- **Hermes margin** — a persistent, collapsible co-writer panel scoped to the current song
  (see Pillar 7 / [05-hermes-agent-setup.md](05-hermes-agent-setup.md)). Every proposal
  renders as an **editable card** with Accept / Edit / Discard.
- **Autosave + version history** — continuous autosave to Firestore; named snapshots
  ("v2 — new bridge") the writer can restore.
- **Status lifecycle** — `idea → draft → demo → recorded → released`, surfaced in the header
  and driving the Catalog.

---

## Pillar 6 — Catalog & Release  *(replaces: a spreadsheet + DistroKid/RouteNote prep)*

**What it does.** The library of all songs and the on-ramp to publishing them.

**Benefit.** A durable catalog that turns "a folder of demos" into a managed body of work —
searchable, filterable by status, and pre-packaged for release, with the authorship record
that makes distribution and (eventual) copyright registration clean.

**Spec.**
- **Catalog view** — grid/list of songs with title, key, tempo, status, updated date, tags,
  and demo-count; search and filter by status, key, tag, and text.
- **Song lifecycle** — the five statuses above; a Kanban-style board view (idea → … →
  released) as a light nod to the writer's own pipeline.
- **Release prep** — a per-song release panel: title, artist, writers & **splits**, ISWC/CCLI
  (optional), release date, cover-art slot, and the **provenance / human-authorship log**
  (which lines/chords were AI-*suggested* vs. authored, per Hermes's record). Generates a
  tidy metadata sheet for **DistroKid / RouteNote** and a splits sheet for co-writes.
- **Spotify link** — attach the released track's Spotify URL; the artist page
  (`open.spotify.com/artist/6bXJh8MVT5unSHUwknBgkN`) is linked from the app.
- **Export the catalog** — CSV/JSON export of the whole catalog for backup.

---

## Pillar 7 — Hermes (AI co-writer) ⭐  *(the differentiator — replaces nothing; it's new)*

**What it does.** An AI co-writer threaded through every pillar that **proposes options and
never acts**. Full engineering detail in [05-hermes-agent-setup.md](05-hermes-agent-setup.md).

**Benefit.** The craft help of the whole toolkit — rhymes, phrasing, scripture ties, chord
substitutions, structure critique, titles — available conversationally and *in context*,
without ceding authorship. This is the honest answer to the AI-generation caution in the
brief: use AI to *sharpen* the writing, keep the melody and lyric authorship human, and keep
the receipts.

**Spec (feature-level; see the setup doc for the engineering).**
- **Skills** — Rhyme/line options, Scripture ties (grounded in the WEB text), Chord/substitution
  suggestions (grounded in the theory engine + current key), Structure critique ("your bridge
  repeats the chorus's idea"), Title/hook ideas, and Plain-language theory answers.
- **Propose-never-act** — Hermes returns **editable proposal cards**; nothing enters the song
  until the writer clicks Accept. Read tools (rhyme lookup, scripture search, transpose) run
  freely; anything that would *write* to the song is a proposal.
- **Grounded** — chord suggestions come from the real theory engine and the song's key;
  scripture ties come from the actual WEB text (no invented verses); rhymes from the rhyme
  service — Hermes composes, the deterministic engines supply facts.
- **Provenance logging** — every accepted suggestion is tagged in the song's authorship log,
  so the writer can always show what was human and what was AI-assisted (releasability).
- **Surfaces** — the Song Workbench margin panel, inline "✨ suggest" affordances on a
  selected line or chord, and a ⌘K command bar.

---

## Roadmap (post-v1, ranked by value & fit)

### High value / core DNA
- **Co-write & collaboration** — invite a co-writer to a song (real-time or async), with
  per-writer split tracking feeding the release sheet. The natural multi-user step.
- **Worship-library handoff (deepen)** — full two-way sync with [Tig Worship](../../tig-worship):
  a released song becomes a canonical worship song with charts, keys, and tracks; usage flows
  back. Ties the write→run pipeline shut.
- **Set & rehearsal export** — bundle several songs into a set with charts in chosen keys and
  demo tracks, for the band or for Planning Center.

### Craft depth
- **Melody-from-lyric assist** — Hermes suggests a singable top-line rhythm from a lyric line's
  meter (proposal only), the melodic analog of the harmony help.
- **Reference-track harmony import** — paste/point at a reference and pull its chords for study
  (the Moises job) — *study only*, clearly separated from your original writing.
- **Ear training from your own catalog** — quiz yourself on your own progressions/keys (reuses
  the family Exercises pattern), turning the catalog into practice material.

### Utility
- **Prosody & clichè check** — flag over-used worship clichés and forced rhymes (a gentle
  editor, opt-in).
- **Setlist/Spotify analytics** — pull public Spotify stats for released tracks onto the
  catalog card.
- **Print/booklet export** — a formatted lyric+chart booklet for a project or EP.

---

## Why this set

The seven pillars cover the songwriter's real pipeline end to end — *words, harmony, chart,
demo, one home, a catalog, and a co-writer* — collapsing a dozen disconnected tools onto one
object: the song. The flagship (**Song Workbench**) is where the disconnection actually gets
solved, and **Hermes** is the differentiator no point tool in the brief offers: real craft
help that keeps the human the author, with the provenance trail that makes the resulting songs
cleanly releasable to Spotify and beyond.
