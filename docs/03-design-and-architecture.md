# Tig Music — Design & Architecture

How Tig Music is built: the tech stack, the application architecture, the engines that need
real engineering (chart/transpose, audio, scripture, the section model), the data model, the
design system, security, and deployment. It mirrors the family's architecture so Tig Music
feels like a sibling of [Tig Guitar](../../tig-guitar), [Tig Banjo](../../tig-banjo), and
[Tig Worship](../../tig-worship) and can reuse their theory/transpose engines.

---

## 1. Tech stack

Locked by the [brief](00-tig-music.md); aligned with the family where it doesn't conflict.

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Angular 21.2** (standalone components, signals) | Same major as the whole family. |
| UI kits | **Angular Material 21.2** + **Kendo UI 23.3** | Material for app chrome; Kendo grid/dialog/inputs/editor for the catalog and forms. |
| Styling | **Tailwind CSS 3.4.3** | Utility layer over Material; the Tig Music brand ramp. Dark mode first-class. |
| State | Angular **signals** + small services | The song context (key/tempo) is a root signal store — the family `ContextBar` pattern. |
| Audio | **Web Audio API** | Metronome, progression/melody playback, and recording scheduler. |
| Recording | `MediaRecorder` + Web Audio | Demo capture → Firebase Storage. |
| Rendering | **SVG** for charts, circle-of-fifths, melody/piano-roll; HTML for lyrics | Crisp, themeable, accessible. |
| Backend | **Firebase** — Auth, Firestore, Cloud Storage, Hosting + **App Hosting** | Shared `tig-powell` project family. |
| AI | **Firebase AI Logic (Gemini)** — function-calling + structured output | Hermes; same infra as Tig Worship's assistant. See [05](05-hermes-agent-setup.md). |
| Mobile | **Capacitor 8.3** | iOS/Android shell wrapping the web app; native only for capture/permissions. |
| SSR | **Angular SSR** (`@angular/ssr`, Express) | For landing/help routes' SEO; the studio itself is a signed-in SPA. |
| Tooling | Angular CLI, Prettier (100 col, single quotes), Vitest | Matches the scaffold's `package.json`. |

> **Rhyme provider decision.** Use the free **Datamuse API** for rhymes/near-rhymes/word
> families in v1 (no key, rich `rel_rhy`/`rel_nry`/`ml`/`sl` endpoints). MasterWriter-grade
> depth is a later swap behind the same `rhyme.service` interface. Degrades gracefully if the
> API is down — the rest of the app is unaffected.

---

## 2. Application architecture

Feature-based, identical in spirit to the family's `src/app/features/*` layout:

```
src/app/
├─ core/
│  ├─ models/            Song, Section, Progression, Chord, Take, Provenance, ReleaseInfo, …
│  ├─ data/              scripture (WEB) index, chord/interval tables, borrowed-chord palette
│  └─ services/
│     ├─ song-context.service.ts   key/tempo/time-sig signal store (the spine)
│     ├─ theory.service.ts         keys, Nashville numbers, circle of fifths  (PORTED)
│     ├─ transpose.service.ts      key change + enharmonic spelling            (PORTED from Tig Worship)
│     ├─ chart.service.ts          Song → ChordPro / Nashville / lead sheet / MusicXML / PDF
│     ├─ audio.service.ts          Web Audio scheduler: metronome + progression/melody playback
│     ├─ recording.service.ts      MediaRecorder capture → Storage upload
│     ├─ rhyme.service.ts          Datamuse-backed rhyme/near-rhyme/word-family (swappable)
│     ├─ scripture.service.ts      WEB search + cross-references (app-local index)
│     ├─ song.service.ts           CRUD + autosave + version snapshots (Firestore)
│     ├─ hermes.service.ts         AI co-writer: conversation, proposals, provenance   (see 05)
│     ├─ auth.service.ts           Google sign-in; user signal          (family drop-in)
│     └─ suite-sync.service.ts     writes users/{uid} progress/sessions/saved (appId:'music')
├─ features/
│  ├─ home/               dashboard: recent songs, resume, "start a song"
│  ├─ workbench/          ⭐ the Song Workbench (hosts the pillar panels + Hermes margin)
│  │  ├─ lyric-lab/
│  │  ├─ harmony-sketchpad/
│  │  ├─ takes-strip/
│  │  └─ hermes-panel/
│  ├─ chart/              chart & lead-sheet view + export
│  ├─ catalog/            library, board view, search/filter
│  ├─ release/            release prep + provenance + metadata sheet
│  └─ about/              what it is, links back to tigpowell.com
└─ shared/
   └─ components/
      ├─ section-editor/     typed, reorderable lyric sections
      ├─ chord-lane/         per-section progression lane (bars/beats)
      ├─ circle-of-fifths/   key picker / relationships
      ├─ chart-view/         ChordPro/Nashville/lead-sheet renderer
      ├─ metronome/          click + count-in (shares audio.service)
      ├─ proposal-card/      Hermes editable proposal (Accept/Edit/Discard)
      ├─ context-bar/        persistent key/tempo/status selector
      └─ suite-account-button/  navbar sign-in/out (family drop-in)
```

**Porting from the family.** `theory.service` (keys, Nashville numbers, circle of fifths) and
`transpose.service` (Tig Worship's chart transpose with correct enharmonic spelling) port over
with little change — music theory is instrument-agnostic. **Net-new** is everything about the
*song as an object*: the section model, the lyric craft tools, scripture search, recording,
the chart renderer's lyric alignment, the release/provenance layer, and Hermes.

---

## 3. The hard problems (where the real engineering is)

1. **The Song aggregate & live context.** A song is a non-trivial aggregate (sections ×
   progressions × takes × provenance × release), edited live with autosave and undo, and a
   single key/tempo context that, when changed, must re-label chords, re-render the chart,
   re-pitch playback, and update Hermes's context — all reactively. `song-context.service`
   (signals) is the spine; every panel subscribes. This is the highest-leverage design and
   must be right from day one (retrofitting a global context is expensive).

2. **Chart rendering with lyric alignment.** Placing chords at the right positions *above the
   right syllables*, in three notations (chord/lyric, Nashville, lead sheet), and keeping them
   correct through transpose, is the core rendering problem. ChordPro-style inline chord
   anchors in the lyric model make alignment deterministic; the renderer is pure
   `Song → SVG/DOM`. Transpose changes chord spelling but never the anchors.

3. **Transpose & enharmonic spelling.** Reuse Tig Worship's engine: numbers are invariant;
   chord *names* must spell correctly for the destination key (F♯ vs G♭), including slash
   chords and borrowed colors. Deterministic and heavily unit-tested — it has correct answers.

4. **Audio scheduling.** One Web Audio scheduler drives the metronome, progression playback,
   and (v1) melody sketch, at adjustable tempo with a count-in, plus recording. Look-ahead
   scheduling for tight timing; a light synth (piano/pad + click) for v1 — zero asset weight,
   good enough for writing. Sampled instruments are a later swap behind `audio.service`.

5. **Scripture search, grounded & public-domain.** The **WEB** text is indexed app-locally
   (keyword + reference lookup + cross-references) so Lyric Lab and Hermes can search it
   offline-fast and **only** cite verses that exist — the anti-hallucination guarantee for the
   scripture-tie skill. No copyrighted translations, ever.

6. **Propose-never-act AI.** Hermes composes; deterministic engines supply facts; nothing
   mutates the song without an explicit Accept. This is enforced structurally (mutating tools
   gated behind an action token, server-side) — detailed in
   [05-hermes-agent-setup.md](05-hermes-agent-setup.md).

---

## 4. Audio & chart engines (detail)

### Audio
- **Web Audio** look-ahead scheduler (25 ms timer, ~100 ms schedule horizon) for jitter-free
  metronome and chord/melody playback at adjustable tempo.
- **Synth-first (v1):** a simple oscillator/pad voice + a click. Recommendation: ship synth,
  swap sampled piano/guitar behind `audio.service` once the studio is proven — no asset weight
  on first load.
- **Recording:** `recording.service` uses `MediaRecorder` (opus/webm, m4a on Safari), uploads
  the blob to Storage, and stores a `Take` doc referencing it.

### Chart
- **Internal model:** a section's lyric lines carry inline chord anchors
  (`{ symbol, beatOffset }`); the progression lane is the editable source, the lyric anchors
  are the render source. `chart.service` renders `Song → { chordpro, nashville, leadsheet }`.
- **Export:** ChordPro (text) and PDF (print stylesheet → `window.print()` / a PDF lib) at MVP;
  **MusicXML** (opens in MuseScore) and a notated melody lead sheet at v1. ChordPro **import**
  parses back into the section/anchor model.

---

## 5. Design system

Match the tig-family look so the four apps read as siblings, with a Tig Music accent.

- **Framework:** Angular Material + Kendo UI components under a Tailwind utility layer (same as
  the family). **Dark mode first-class** — writers work at night.
- **Brand color:** the family uses a single `brand-*` ramp per app. Tig Music gets its own hue
  — an **ink/indigo-with-warm-gold** pairing (a page-of-lyrics-under-a-lamp feel), distinct
  from Guitar/Banjo/Worship while staying in-family. One ramp, light + dark.
- **Typography:** reuse the family heading/body pairing (Inter for body; the family geometric
  heading face) so the wordmark reads "Tig ___". A monospace face for charts/ChordPro.
- **Signature components (reused across the app):**
  - `section-editor` — the typed, reorderable lyric surface (the most-used component).
  - `chord-lane` — the per-section progression editor.
  - `chart-view` — the three-notation chart renderer.
  - `circle-of-fifths` — ported key wheel.
  - `proposal-card` — the Hermes editable proposal (Accept / Edit / Discard) — the visible face
    of propose-never-act.
  - `context-bar` — the persistent key/tempo/status selector.
- **Accessibility:** keyboard-first editor, color-blind-safe section/chord colors, note-name vs.
  Nashville-number toggle, reduced-motion support, screen-reader labels on diagrams; inherits
  left-handed/high-contrast prefs from the hub.

---

## 6. Data model (high-level)

Per-user in Firestore; audio in Storage. Suite tree per the
[Suite Data Contract](../../tig-powell/docs/00-architecture/03-suite-data-contract.md).

```
users/{uid}/songs/{songId}
  title, key, tempo, timeSignature, capo?, status (idea|draft|demo|recorded|released)
  tags[], createdAt, updatedAt
  sections: [ Section ]                       // ordered
  release: ReleaseInfo
  provenance: [ ProvenanceEntry ]

Section
  id, type (verse|prechorus|chorus|bridge|intro|outro|tag|hook), label, order
  lines: [ { text, chordAnchors: [{ symbol, beatOffset }] } ]
  progression: [ ChordEvent ]                 // bars/beats for this section
  alternates?: [ Section ]                    // kept-but-not-current takes

ChordEvent
  symbol ("Gmaj7", "D/F#"), nashville ("1", "5/7"), bar, beat, durationBeats

Take                                          // users/{uid}/songs/{songId}/takes/{takeId}
  storagePath, label, note, tempo, key, durationSec, createdAt

ReleaseInfo
  writers: [{ name, splitPct }], iswc?, ccli?, releaseDate?, coverArtPath?,
  spotifyTrackUrl?, distributor? ("DistroKid"|"RouteNote")

ProvenanceEntry
  target ("section:{id}/line:{n}" | "chord:{...}"), kind (human|ai-suggested),
  acceptedAt, hermesToolCallId?, summary

VersionSnapshot                               // users/{uid}/songs/{songId}/versions/{vId}
  label, createdAt, songSnapshot (immutable copy or diff)

// Suite (hub-read) — appId always 'music'
users/{uid}/progress/music   { streakDays, totalMinutes, lastPracticedAt, resumePath, resumeLabel, updatedAt }
users/{uid}/sessions/{id}    { appId:'music', day, durationSec, itemsPracticed, startedAt }
users/{uid}/saved/{id}       { appId:'music', type, title, deepLink, payload?, savedAt }
```

App-local, non-user content (not in the tree): the **WEB scripture index**, chord/interval
tables, and the borrowed-chord palette — shipped with the app.

---

## 7. Security

- **Firestore/Storage rules:** a signed-in user has full read/write over `users/{uid}/**` and
  their `songs/**` and nothing else — the family rule shape; no cross-user access. Storage take
  paths are namespaced under the uid.
- **Hermes safety (server-side):** read tools run freely; any tool that would mutate a song
  returns a **proposal** and is only executed by a Cloud Function after the user Accepts,
  which mints a short-lived **action token** the function re-checks (owner-only). No client
  path mutates a song from an AI suggestion without that token. Unit-tested to prove no
  write happens without a confirmed token (mirrors Tig Worship's model).
- **Privacy:** only the signed-in user's own song/context is ever placed in Hermes's context;
  no third-party content beyond the user's own is sent to Gemini/Datamuse.

---

## 8. Deployment

Reuse the family deployment shape.

- **Firebase hosting target `music`** added to `.firebaserc`, pointing at a `tig-music` site in
  the shared `tig-powell` project:
  ```jsonc
  // .firebaserc
  { "targets": { "tig-powell": { "hosting": {
      "www":     ["tig-powell"],
      "guitar":  ["tig-guitar"],
      "banjo":   ["tig-banjo"],
      "worship": ["tig-worship"],
      "music":   ["tig-music"]      // new
  } } } }
  ```
- **`firebase.json`:** `target: "music"`, `public: "dist/tig-music/browser"`, SPA rewrite to
  `/index.html`, plus the App Hosting/SSR block for the prerendered landing/help routes.
- **AI backend:** Hermes's mutating tools run as **Cloud Functions / App Hosting server code**;
  Firebase AI Logic (Gemini) is called from there (and read-only tools may call from the
  client SDK) — see [05](05-hermes-agent-setup.md).
- **Deploy script** (`package.json`): `"deploy": "ng build && firebase deploy --only
  hosting:music"` (plus functions when Hermes ships).
- **Domain:** connect `music.tigpowell.com` to the `tig-music` site; add it (and `localhost`)
  to Firebase Auth **authorized domains**, and enable **Google** as a sign-in provider.
- **Mobile:** `npx cap sync` builds the iOS/Android shells from the same web build; store
  submission is post-v1.

---

## 9. Risks & open questions

- **Chart lyric alignment** — the hardest renderer detail; the inline-anchor model keeps it
  deterministic, but verify against real charts early.
- **Audio fidelity vs. weight** — synth-first recommended; revisit sampled instruments once the
  studio is proven and Hermes playback needs to sound convincing.
- **Rhyme provider longevity** — Datamuse is free but third-party; keep it behind
  `rhyme.service` so it's swappable, and degrade gracefully.
- **AI provider** — Firebase AI Logic (Gemini) is the family standard and the assumed Hermes
  backend; confirm model id/quotas via the `claude-api`/AI-Logic docs before build. If a
  different model is desired, `hermes.service` isolates the provider.
- **Provenance UX** — logging every AI acceptance must be low-friction or writers will disable
  it; make it automatic and invisible until they need the record.
- **Scope creep toward a DAW** — hold the line: Capture is a pad, not a mixer. Real production
  stays in GarageBand.
- **Multi-user co-write** — deliberately v1-out; the data model leaves room (writers/splits)
  but real-time collaboration is a later, separate design.
