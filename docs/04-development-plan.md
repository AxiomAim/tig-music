# Tig Music — Development Plan (Agile + Kanban)

How Tig Music gets built and delivered: the **SDLC**, the **Agile/Kanban** process (modeled on
the [Atlassian Agile playbook](https://www.atlassian.com/agile)), the **epics → user stories →
tasks** backlog, the **sprint/milestone** plan, **Definition of Ready/Done**, **testing**,
**CI/CD**, and **metrics**. It's written to be run in a Jira/GitHub-Projects board with the
columns and swimlanes below.

Requirement IDs (e.g. `FR-L1`) reference [02-requirements.md](02-requirements.md); components
and services reference [03-design-and-architecture.md](03-design-and-architecture.md).

---

## 1. SDLC model

A lightweight, iterative SDLC wrapped around Agile sprints:

1. **Inception** *(done)* — brief, product overview, features, requirements, architecture
   (these docs). Output: this doc set.
2. **Design** — per-epic design spike: data shapes, component API, service contract, test plan.
   Output: a short design note attached to the epic before its stories start.
3. **Build** — 2-week sprints; vertical slices (UI + service + tests) behind the Kanban WIP
   limits below.
4. **Test** — continuous: unit on every service/component, integration per epic, E2E on the
   acceptance flows ([02 §7](02-requirements.md)), plus the `verify` skill on nontrivial
   changes before merge.
5. **Release** — per-milestone deploy to `music.tigpowell.com` (Firebase), behind feature
   flags where a slice is partial.
6. **Operate & learn** — watch metrics (§9), triage bugs into the board, feed a short
   retro into the next sprint.

**Branching (from suite memory):** branch off `main` → PR → review/CI → merge → **deploy from
`main`**, so production never diverges from `main`. Small vertical PRs, one story or less each.

---

## 2. Agile process (Scrum-flavored Kanban)

- **Cadence:** 2-week sprints with a sprint goal, but the board runs as **Kanban** with WIP
  limits so work flows continuously (Atlassian "Scrumban").
- **Ceremonies:** sprint planning (pull from the ranked backlog to the sprint goal), a short
  daily check, sprint review/demo against acceptance criteria, retro.
- **Roles:** solo-developer reality — the owner is Product Owner + Dev; **Hermes/Claude Code
  assists** as an implementation pair. The PO hat writes/ranks stories; the Dev hat pulls them.
- **Estimation:** story points (Fibonacci 1/2/3/5/8); 8 = split it. Velocity is observed, not
  promised.

### Board columns (Kanban)

| Column | WIP limit | Exit criteria |
|---|---|---|
| **Backlog** | — | Ranked; not yet ready. |
| **Ready** | 8 | Meets Definition of Ready (§7). |
| **In Progress** | 3 | Branch open, tests being written alongside. |
| **In Review** | 3 | PR up, CI green, self-`verify` done. |
| **Done** | — | Meets Definition of Done (§7); merged to `main`. |

**Swimlanes:** one per epic (below), plus an **Expedite** lane for prod bugs (bypasses WIP).

---

## 3. Epics

Ranked by delivery order. Each maps to pillars/requirements and to a milestone (§6).

| # | Epic | Delivers | Key requirements | Milestone |
|---|---|---|---|---|
| **E0** | **Foundation & scaffold** | Rebrand the copied scaffold to Tig Music; core models, song context, ported theory/transpose, Firebase + suite auth. | FR-A1–A4, DR-1–3 | M0 |
| **E1** | **Lyric Lab** | Section-based lyric editor + rhyme + syllable + scripture search. | FR-L1–L6, FR-A* | M1 |
| **E2** | **Harmony Sketchpad** | In-key Nashville progression builder + playback. | FR-H1–H5 | M1 |
| **E3** | **Song Workbench** ⭐ | Unified single-song surface, live context, autosave, versions, status. | FR-W1–W5 | M2 |
| **E4** | **Chart & Lead Sheet** | Chord/Nashville charts, transpose, ChordPro + PDF export. | FR-C1–C4 | M2 |
| **E5** | **Capture & Demo** | In-browser recording, Storage, metronome, tags. | FR-D1–D4 | M3 |
| **E6** | **Catalog & Release** | Library, search/filter, status board, release + provenance. | FR-CAT1–CAT5, LR-1 | M3 |
| **E7** | **Hermes (AI co-writer)** ⭐ | Propose-never-act co-writer, skills, grounding, provenance. | FR-AI1–AI6, NFR-Sec2 | M4 |
| **E8** | **Hub & mobile** | `/music` page on tig-powell; Capacitor shells; SSR landing. | IR-4, FR-D6, NFR-Port1, NFR-SEO1 | M4/M5 |
| **E9** | **Roadmap** | Melody sketch, MusicXML, worship handoff, co-write, analytics. | FR-H6, FR-C5–C7, IR-5 | M5+ |

---

## 4. Backlog — user stories & tasks

Format: **US-#** *As a [role], I want [capability], so that [benefit].* Acceptance criteria are
Given/When/Then. Tasks are the implementation checklist. Points in ⟨⟩.

### E0 — Foundation & scaffold

**US-0.1 ⟨3⟩** *As the developer, I want the copied Tig Banjo scaffold rebranded to Tig Music,
so that the app identity, routes, and deploy target are correct.*
- AC: Given the repo, when I build, then the app name, title, brand ramp, hosting target
  `music`, and README/package name are Tig Music, with no banjo references.
- Tasks: rename `package.json`/README/`angular.json`; add `music` target to `.firebaserc` +
  `firebase.json`; apply the Tig Music Tailwind brand ramp; remove banjo features/data; update
  `SUITE-SYNC.md` for `appId:'music'`.

**US-0.2 ⟨5⟩** *As the developer, I want the core song models and the song-context signal store,
so that every feature shares one live key/tempo context.*
- AC: Given a song, when key/tempo changes, then subscribers receive the update reactively.
- Tasks: `core/models/*` (Song, Section, ChordEvent, Take, ReleaseInfo, ProvenanceEntry);
  `song-context.service` (signals); unit tests for context propagation.

**US-0.3 ⟨3⟩** *As the developer, I want the theory and transpose engines ported from the
family, so that Nashville numbers and key changes work correctly.*
- AC: transpose spells enharmonics correctly across all 12 keys; numbers invariant.
- Tasks: port `theory.service` + `transpose.service` from Tig Worship; port unit tests; adapt
  types.

**US-0.4 ⟨5⟩** *As a user, I want Google sign-in and suite sync, so that my work persists and
the hub reflects Tig Music.*
- AC: signed out → local demo only; signed in → songs persist and a `progress/music` doc +
  session rows are written; hub Continue card appears.
- Tasks: family `auth.service` + `suite-account-button` drop-ins; `suite-sync.service`
  (`appId:'music'`); Firebase config for `tig-music`; enable Google provider + authorized
  domains; security rules for `users/{uid}/songs/**`.

### E1 — Lyric Lab

**US-1.1 ⟨5⟩** *As a writer, I want typed, reorderable song sections, so that I can structure a
song as verses/choruses/bridges.* — FR-L1
- AC: add/rename/reorder(drag)/duplicate/delete typed sections; order persists.
- Tasks: `section-editor` component; drag-reorder; Firestore persistence via `song.service`;
  unit + component tests.

**US-1.2 ⟨3⟩** *As a writer, I want autosave and undo/redo on lyric edits, so that I never lose
a line.* — FR-L2, NFR-Rel1
- AC: edits autosave (debounced ≤1/2s); undo/redo across a session.
- Tasks: debounced autosave; per-song undo stack; conflict-free reconcile on reconnect.

**US-1.3 ⟨5⟩** *As a writer, I want a rhyme & near-rhyme finder, so that I can strengthen weak
words late in a draft.* — FR-L3
- AC: selecting a word returns perfect/near rhymes + synonyms; one-tap insert.
- Tasks: `rhyme.service` over Datamuse (`rel_rhy`,`rel_nry`,`ml`); result cache; graceful
  offline; UI popover; tests with a mocked provider.

**US-1.4 ⟨3⟩** *As a writer, I want per-line syllable/meter feedback, so that my lines scan.* —
FR-L4
- AC: each line shows a syllable count; lines breaking the section pattern are flagged.
- Tasks: syllable estimator; meter heuristic; inline badges; tests on known lines.

**US-1.5 ⟨5⟩** *As a worship writer, I want inline WEB scripture search with cross-references,
so that I can root lyrics in the text and keep the citation.* — FR-L5, LR-2
- AC: keyword/reference search returns real WEB verses + cross-refs; insert drops text +
  records the citation in metadata.
- Tasks: build the app-local WEB index (`core/data`); `scripture.service` (search + xrefs);
  insert-with-citation; tests proving only-real-verses.

**US-1.6 ⟨3⟩** *As a writer, I want alternate section takes, so that I can try another chorus
without losing the current one.* — FR-L6
- Tasks: `alternates[]` on Section; swap/keep UI; tests.

### E2 — Harmony Sketchpad

**US-2.1 ⟨3⟩** *As a writer, I want the diatonic chords for a key with Nashville numbers, so
that I can build in-key.* — FR-H1
- Tasks: key → diatonic set via `theory.service`; palette UI; Nashville labels.

**US-2.2 ⟨3⟩** *As a writer, I want to add borrowed/colored chords, so that I can use bVII,
slash, dom7 blues moves.* — FR-H2
- Tasks: borrowed-chord palette data; add-to-progression; correct Nashville labeling.

**US-2.3 ⟨5⟩** *As a writer, I want a per-section chord lane, so that each section has its own
progression.* — FR-H3
- Tasks: `chord-lane` component (bars/beats, add/move/delete/duration); binds to Section.

**US-2.4 ⟨5⟩** *As a writer, I want to hear a section's progression at an adjustable tempo, so
that I can test it.* — FR-H4, NFR-Perf2
- Tasks: `audio.service` look-ahead scheduler; synth voice + click; loop a section; tempo
  control; timing test.

**US-2.5 ⟨2⟩** *As a writer, I want to toggle chord names vs. Nashville numbers everywhere, so
that I can read either.* — FR-H5
- Tasks: global display signal; renderer switch; persists in prefs.

### E3 — Song Workbench (flagship)

**US-3.1 ⟨5⟩** *As a writer, I want lyrics, harmony, takes, and the song header on one surface,
so that the song is one object.* — FR-W1
- Tasks: `workbench` shell hosting the panels; responsive show/hide; layout tests.

**US-3.2 ⟨3⟩** *As a writer, I want changing key/tempo to update everything live, so that the
whole song follows.* — FR-W2
- Tasks: wire `context-bar` → `song-context.service` → chord labels/chart/playback/Hermes.

**US-3.3 ⟨5⟩** *As a writer, I want autosave plus named version snapshots I can restore, so that
I can experiment safely.* — FR-W3, DR-5
- Tasks: `versions` subcollection; snapshot/restore UI; prune cap; tests.

**US-3.4 ⟨2⟩** *As a writer, I want a status lifecycle on the song, so that I track it from idea
to released.* — FR-W5
- Tasks: status field + header control; drives Catalog board.

### E4 — Chart & Lead Sheet

**US-4.1 ⟨5⟩** *As a writer, I want a chord/lyric chart generated from my song, so that I can
play or share it.* — FR-C1
- Tasks: inline chord-anchor model; `chart-view` ChordPro renderer; alignment tests.

**US-4.2 ⟨3⟩** *As a bandleader, I want a Nashville Number chart, so that the band can play in
any key.* — FR-C2
- Tasks: Nashville render mode; tests.

**US-4.3 ⟨5⟩** *As a writer, I want to transpose the whole song to any key, so that it fits the
singer.* — FR-C3
- Tasks: wire `transpose.service`; enharmonic correctness; capo hint; full-song transpose
  tests.

**US-4.4 ⟨3⟩** *As a writer, I want to export ChordPro and PDF, so that I can use the chart
elsewhere.* — FR-C4
- Tasks: ChordPro serializer; print stylesheet → PDF; round-trip test.

### E5 — Capture & Demo

**US-5.1 ⟨5⟩** *As a writer, I want to record a demo take onto the song, so that I don't lose
the idea.* — FR-D1, FR-D2
- Tasks: `recording.service` (`MediaRecorder`); Storage upload; `Take` doc; playback; Safari
  format handling.

**US-5.2 ⟨3⟩** *As a writer, I want a metronome with count-in, so that I can record in time.* —
FR-D3
- Tasks: `metronome` component on `audio.service`; count-in; time-sig.

**US-5.3 ⟨2⟩** *As a writer, I want to tag takes with tempo/key/note, so that I can find the
right one.* — FR-D4
- Tasks: tag fields on Take; takes-strip UI.

### E6 — Catalog & Release

**US-6.1 ⟨3⟩** *As a writer, I want a searchable catalog of my songs, so that I can find and
resume work.* — FR-CAT1
- Tasks: `catalog` list/grid; search + filter (status/key/tag/text); resume deep-link.

**US-6.2 ⟨3⟩** *As a writer, I want a status board view, so that I can see my pipeline.* —
FR-CAT2
- Tasks: Kanban board by status; drag to change status.

**US-6.3 ⟨5⟩** *As a releasing artist, I want a release panel with writers/splits/metadata and a
Spotify link, so that I can prepare distribution.* — FR-CAT3, FR-CAT5
- Tasks: `release` form; splits editor; DistroKid/RouteNote metadata + splits sheet export;
  Spotify URL.

**US-6.4 ⟨5⟩** *As a releasing artist, I want a human-authorship provenance log, so that my
releases are cleanly human-authored.* — FR-CAT4, LR-1
- Tasks: `provenance` log write on every Hermes Accept; provenance view; export with the
  release sheet.

### E7 — Hermes (AI co-writer)  — *full detail in [05](05-hermes-agent-setup.md)*

**US-7.1 ⟨5⟩** *As a writer, I want a song-scoped co-writer panel that returns editable
proposals, so that I get help without losing control.* — FR-AI1, FR-AI3
- Tasks: `hermes.service` conversation; `proposal-card` (Accept/Edit/Discard); scope to song.

**US-7.2 ⟨8⟩** *As a writer, I want Hermes's skills (rhyme/line/scripture/chord/structure/title),
so that I get real craft help.* — FR-AI2, FR-AI4
- Tasks: Gemini function-calling tool defs; wire each tool to its deterministic engine
  (`rhyme`,`scripture`,`theory`,`transpose`); structured-output proposals; grounding tests.

**US-7.3 ⟨5⟩** *As the owner, I want propose-never-act enforced server-side, so that no AI edit
lands without my Accept.* — FR-AI3, FR-AI5, NFR-Sec2
- Tasks: Cloud Function action-token gate on mutating tools; provenance write on Accept;
  security test proving no write without a confirmed token.

**US-7.4 ⟨3⟩** *As a writer, I want inline "✨ suggest" and a ⌘K command bar, so that help is one
gesture away.* — FR-AI6
- Tasks: line/chord inline entry points; ⌘K bar routing into `hermes.service`.

### E8 — Hub & mobile

**US-8.1 ⟨3⟩** *As a visitor, I want a `/music` page on tigpowell.com, so that I can discover
and open Tig Music.* — IR-4
- Tasks: `MusicView` on tig-powell (clone `/guitar`); route + nav/footer/home links.

**US-8.2 ⟨5⟩** *As a mobile writer, I want to capture a take from my phone, so that ideas sync
to the song.* — FR-D6, NFR-Port1
- Tasks: Capacitor iOS/Android shells; native mic permission; `cap sync` build; capture→sync.

**US-8.3 ⟨2⟩** *As a visitor, I want the landing/help routes to be crawlable, so that the app is
discoverable.* — NFR-SEO1
- Tasks: SSR/prerender landing + help; per-route meta.

### E9 — Roadmap (post-v1)
Melody sketch (FR-H6), MusicXML + lead sheet + ChordPro import (FR-C5–C6), Tig Worship chart
handoff (FR-C7/IR-5), co-write/collaboration, Spotify analytics, ear-training-from-catalog.
Groomed into the backlog after M4.

---

## 5. Story map (at a glance)

```
Backbone:   Write lyrics → Sketch harmony → See it as one song → Chart it → Demo it → Catalog & release → (Hermes throughout)
            [E1]            [E2]            [E3]                 [E4]        [E5]       [E6]                [E7]
MVP walk:   US-1.1..1.3     US-2.1..2.4     US-3.1..3.2          US-4.1,4.3  US-5.1     US-6.1,6.4          —
v1 walk:    +1.4..1.6       +2.5            +3.3..3.4            +4.2,4.4    +5.2,5.3   +6.2,6.3            US-7.1..7.4
```

---

## 6. Milestones & sprint plan

Each milestone is independently shippable. **MVP = M0–M3** (a real songwriting studio without
AI); **v1 = through M4** (adds Hermes); **M5+ = roadmap**.

| Milestone | Sprints | Goal | Epics |
|---|---|---|---|
| **M0 — Foundation** | S1 (wk 1–2) | Rebranded scaffold, core models + context, ported theory/transpose, auth + suite sync. | E0 |
| **M1 — Words & harmony** | S2–S3 (wk 3–6) | Lyric Lab + Harmony Sketchpad usable standalone. | E1, E2 |
| **M2 — The studio** | S4–S5 (wk 7–10) | Song Workbench unifies them; charts + transpose + export. **MVP-visible.** | E3, E4 |
| **M3 — Demo & catalog** | S6–S7 (wk 11–14) | Recording + metronome; catalog, status board, release + provenance. **MVP ships.** | E5, E6 |
| **M4 — Hermes** | S8–S9 (wk 15–18) | AI co-writer with grounded skills + propose-never-act. **v1 ships.** | E7 |
| **M5 — Reach** | S10+ (wk 19+) | `/music` hub page, Capacitor mobile, SSR; then roadmap. | E8, E9 |

Parallelizable: the `/music` hub page (US-8.1) is independent and can land any time after M0
gives a live URL.

---

## 7. Definition of Ready / Definition of Done

**Definition of Ready** (a story may enter *Ready*):
- Clear user-story form with Given/When/Then acceptance criteria.
- References its requirement ID(s) and the component/service it touches.
- Estimated ≤ 5 points (else split); dependencies identified; a design note exists if the epic
  needs one.

**Definition of Done** (a story is *Done*):
- Acceptance criteria met and demoed.
- Unit tests for new services/components; integration test if it crosses a boundary; the
  acceptance E2E updated if it touches a §7 flow.
- `verify` skill run on nontrivial runtime changes (drove the real flow, not just tests).
- Prettier clean, `ng build` green, no new console errors, perf/a11y budgets respected.
- PR reviewed, CI green, merged to `main`; deployed (or behind a flag) with docs updated.

---

## 8. Testing strategy

- **Unit (Vitest):** prioritize the math/logic engines — `transpose.service` (all 12 keys,
  enharmonics, slash/borrowed), `theory.service` (Nashville numbers, diatonic sets),
  `chart.service` (chord-anchor alignment, ChordPro round-trip), `scripture.service`
  (only-real-verses), `rhyme.service` (mocked provider). These have correct answers — test hard.
- **Component:** `section-editor` (reorder/duplicate), `chord-lane`, `chart-view` snapshots
  across keys, `proposal-card` (Accept/Edit/Discard).
- **Integration:** autosave + reconnect; suite-sync writes; recording → Storage → playback.
- **AI safety (critical):** a test proving **no song mutation occurs without a confirmed action
  token** (NFR-Sec2); grounding tests that Hermes never emits a scripture/chord/key not
  produced by an engine.
- **E2E (Playwright, later):** the [02 §7](02-requirements.md) acceptance walk end to end.
- **Manual/`verify`:** audio timing and recording are hard to fully automate — drive them by
  hand each change plus a thin timing test.

---

## 9. CI/CD & metrics

- **CI (GitHub Actions):** on PR — install, Prettier check, `ng build`, `ng test` (Vitest),
  and (later) Playwright smoke. Branch protection on `main`.
- **CD:** merge to `main` → `ng build` → `firebase deploy --only hosting:music` (+ functions
  when Hermes ships). Deploy **from `main`** per the suite workflow.
- **Feature flags:** partial slices (melody sketch, MusicXML, mobile) ship dark behind flags.
- **Delivery metrics:** velocity, cycle time (Ready→Done), WIP adherence, escaped-defect count.
- **Product metrics (post-launch):** songs created, songs reaching *released*, Hermes
  proposals accepted vs. offered, demo takes recorded, hub Continue-card usage.

---

## 10. Risks & mitigations (delivery)

| Risk | Mitigation |
|---|---|
| Song-context/aggregate designed wrong → costly retrofit | Build E0 context store first with tests; every panel subscribes from day one. |
| Chart lyric alignment harder than expected | Prototype `chart-view` early in M2 against real charts; inline-anchor model keeps it deterministic. |
| AI scope creep / unsafe writes | Propose-never-act enforced server-side + a dedicated safety test before Hermes ships to users. |
| Solo-dev velocity variance | Keep stories ≤5 pts, ship per-milestone, use Hermes/Claude Code as an implementation pair. |
| Third-party rhyme/AI provider changes | Isolate behind `rhyme.service`/`hermes.service`; degrade gracefully. |
| Creeping toward a DAW | Hold Capture as a pad; real production stays in GarageBand (scope guard in reviews). |
