# Tig Music — Product Overview

> Write the song, not the paperwork. One place to take an idea from a hummed line to a
> released track — lyrics, harmony, a lead sheet, and a demo — with an AI co-writer that
> helps you *and leaves the authorship yours*.

Tig Music is a **songwriting studio** web app. It is the fourth member of the
[tigpowell.com](../../tig-powell) family — after [Tig Guitar](../../tig-guitar),
[Tig Banjo](../../tig-banjo), and [Tig Worship](../../tig-worship) — and where those apps
teach an *instrument* or run a *worship team*, Tig Music supports the **craft of writing a
song**: the pipeline from a first lyric fragment to a lead sheet ready for the band and a
track ready for Spotify.

It is built for one songwriter's real process first (guitar/keys, Nashville numbers,
worship-oriented and blues-influenced, scripture-rooted), then generalized. The research
behind it — the songwriter's toolkit review in [00-tig-music.md](00-tig-music.md) — maps
the friction across a dozen disconnected tools (RhymeZone, MasterWriter, Hookpad, a Bible
search, Voice Memos, MuseScore, CCLI, DistroKid). **Tig Music's thesis is that the friction
is the disconnection**, and the win is a single surface where a song is *one object* that
carries its lyrics, chords, melody, demos, and release metadata together.

---

## 1. Why a separate app (not a feature of Tig Guitar or Tig Worship)

The family shares music theory — keys, the Nashville Number System, the circle of fifths,
transpose — and Tig Music reuses those engines directly. But the *job* is different:

| The instrument apps answer… | Tig Music answers… |
|---|---|
| "How does this instrument work?" (fretboard, rolls, tunings) | "How do I finish *this song*?" |
| Practice a known thing correctly | Create a new thing from nothing |
| The unit is a **chord / roll / scale** | The unit is a **song** (sections, lyrics, chart, demo) |
| Theory as curriculum | Theory as a **craft assistant** while writing |
| Tig Worship *plans* existing songs for a team | Tig Music *writes* the song in the first place |

Tig Worship is the closest sibling and the natural downstream: a finished Tig Music song can
flow into the worship library as a chart-in-any-key with tracks. But planning a Sunday and
writing a bridge are different acts, and conflating them would make both worse. Tig Music is
the **write** stage; Tig Worship is the **run-it-with-a-team** stage.

We are explicitly **not** building an AI song *generator* (Suno/Udio) or a DAW
(GarageBand/Logic own that). We are the **connective writing layer** between a scattered
toolkit — the place the words, chords, and melody come together and the human does the
authoring.

---

## 2. Who it's for

- **Primary:** the working independent songwriter — writes on guitar or keys, thinks in
  Nashville numbers, wants less tool-juggling and a durable catalog. Starting concretely
  with worship-oriented, blues-influenced, scripture-rooted writing bound for Spotify.
- **Secondary:** worship songwriters and co-writers who want scripture-rooted lyric tools,
  in-key harmonic sketching, and a clean handoff into a worship team (Tig Worship / Planning
  Center).
- **Tertiary:** any lyricist or hobbyist who wants a structured, section-based place to keep
  songs, with rhyme/scripture help and a way to demo and catalog them.

We are **not** targeting producers who live in a DAW, or listeners — this is a *maker's*
tool.

---

## 3. What it does (the short version)

Seven connected pillars, one flagship, one AI co-writer:

1. **Lyric Lab** — a section-based lyric editor (verse / pre / chorus / bridge) with a
   rhyme & near-rhyme finder, word/phrase families, a syllable & meter meter, and inline
   **scripture search** (WEB translation + cross-references) for scripture-rooted lines.
2. **Harmony Sketchpad** — theory-aware, in-key chord & melody sketching (the Hookpad job):
   Nashville numbers, the circle of fifths, diatonic + borrowed colors (bVII, IV/I, dom7
   blues moves), reusing the family theory engine.
3. **Chart & Lead Sheet** — turn a song into a chord chart, a Nashville number chart, and a
   melody lead sheet; transpose to any key; export to ChordPro / MusicXML / PDF (and on to
   MuseScore) and hand off to Tig Worship / Planning Center.
4. **Capture & Demo** — record and attach demo takes and voice-memo ideas to a song, with a
   metronome/click, tempo and key tags. A capture surface, *not* a DAW.
5. **Song Workbench** ⭐ — the flagship. One home per song that ties the four tools above
   together into a single writing surface, with Hermes living in the margin.
6. **Catalog & Release** — the song catalog with a lifecycle (idea → draft → demo → recorded
   → released), Spotify links, and release-prep metadata for DistroKid/RouteNote, including a
   **human-authorship / provenance log**.
7. **Hermes** ⭐ — the AI co-writer, threaded through every pillar. Suggests, critiques, and
   drafts *options* — rhymes, alternate lines, scripture ties, chord substitutions, song
   titles, structure notes — but **proposes and never acts**; the human accepts, edits, or
   discards, and every acceptance is logged so authorship stays human and provable.

See [01-features-and-specifications.md](01-features-and-specifications.md) for the full
catalog and the roadmap (co-write collaboration, setlist/worship handoff, split sheets,
ear-training-from-your-own-catalog).

---

## 4. Guiding principles

- **A song is one object.** Lyrics, chords, melody, demos, and metadata live together and
  travel together. No re-keying between five apps.
- **Reuse the theory, build the craft.** Share the family's key / Nashville / circle-of-fifths
  / transpose engines; build net-new everything about lyrics, sections, demos, and release.
- **The human is the author — always.** Hermes proposes; the writer disposes. Every AI
  suggestion the writer accepts is recorded, so a released song has a clean,
  human-authored provenance trail (the copyright caution from the brief, enforced in code).
- **Scripture-literate.** First-class scripture search (WEB, public-domain) and
  cross-references, because the primary writer roots lyrics in the text.
- **Nashville-native.** Numbers are a first-class notation everywhere, not an afterthought —
  the way the writer already thinks.
- **The ear leads.** Every chord and melody is playable; every song can hold an audio take.
- **Friction is the enemy.** The best tool is the one that removes the most steps between the
  idea and the finished song.

---

## 5. Success looks like

A songwriter who used to spread one song across RhymeZone, a Bible app, Hookpad, Voice
Memos, a Word doc, and MuseScore can, in Tig Music: open one song, draft a chorus with the
rhyme and scripture tools at hand, sketch the changes in-key with Nashville numbers, ask
Hermes for three alternate second-line options and keep one (logged as their edit), record a
phone demo straight onto the song, generate a lead sheet in the singer's key, and mark it
*released* with its Spotify link and a clean authorship record — without leaving the app or
losing the thread. And when the song is ready for the band, it hands off to
[Tig Worship](../../tig-worship) as a chart in any key.
