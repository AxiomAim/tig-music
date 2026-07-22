# Tig Music

A **songwriting studio** — the full *lyric → harmony → lead-sheet → demo → release* pipeline
for a working songwriter, weighted toward worship-oriented, blues-influenced writing on guitar
and keys. The newest member of the [tigpowell.com](../tig-powell) family (after
[Tig Guitar](../tig-guitar), [Tig Banjo](../tig-banjo), and [Tig Worship](../tig-worship)),
destined for **music.tigpowell.com**.

Its differentiator is **Hermes** — an AI co-writer that *proposes and never acts*: it suggests
rhymes, scripture ties, harmonic colors, structure, and titles, but the human stays the author,
and every accepted suggestion is logged so released songs have a clean human-authorship record.

Built with **Angular 21.2**, **Angular Material + Kendo UI**, **Tailwind CSS v3.4**, the Web
Audio API, **Firebase** (Auth, Firestore, Storage, Hosting/App Hosting), **Capacitor 8.3** for
mobile, and **Firebase AI Logic (Gemini)** for Hermes.

> **Status:** the studio is built (epics E0–E8). Signed-in writers can create songs; write
> section-based lyrics with rhyme, meter, and WEB scripture search; sketch in-key harmony with
> Nashville numbers and playback; generate/transpose charts and export ChordPro / MusicXML /
> PDF; record demo takes; manage a catalog + release/provenance; and co-write with **Hermes**
> (propose-never-act). Songs persist to Firestore and versions/takes are per-writer.
>
> **Remaining (roadmap / needs live infra):** wire Hermes's Gemini backend behind the local
> proposer; build the Capacitor shells (`npx cap add`); optional SSR for public routes; and the
> post-v1 roadmap (melody sketch, co-write, Spotify analytics). See [`docs/`](docs/).

## What's built

| Route | What it does |
| --- | --- |
| `/` · `/about` | Public landing + about (the seven pillars). |
| `/songs` | Catalog — search/filter, **board view** by status, **Import ChordPro**, New song. |
| `/songs/:id` | **Song Workbench** — section lyric editor (rhyme/meter/scripture), per-section chord lane (in-key + borrowed colors, playback), demo takes + metronome, version history, and the Hermes co-writer. |
| `/songs/:id/chart` | Chord / Nashville chart, transpose to any key, export **ChordPro · MusicXML · PDF**. |
| `/songs/:id/release` | Writers & splits, release metadata, Spotify link, and the human-authorship **provenance log**. |

Unit tests cover the pure engines (transpose, chart round-trip, scripture grounding, Hermes
propose-never-act, rhyme, syllables): `npm test`.

## Plans & documents

Start in [`docs/`](docs/):

| Doc | What it covers |
| --- | --- |
| [00-tig-music.md](docs/00-tig-music.md) | The original brief and songwriter's-toolkit research. |
| [00-overview.md](docs/00-overview.md) | Product overview — vision, audience, the seven pillars. |
| [01-features-and-specifications.md](docs/01-features-and-specifications.md) | Features, benefits & specifications, plus the roadmap. |
| [02-requirements.md](docs/02-requirements.md) | Functional, non-functional, data, integration, legal/IP, and acceptance. |
| [03-design-and-architecture.md](docs/03-design-and-architecture.md) | Stack, architecture, engines, data model, design system, deployment. |
| [04-development-plan.md](docs/04-development-plan.md) | SDLC, Agile/Kanban, epics → stories → tasks, milestones, testing, CI/CD. |
| [05-hermes-agent-setup.md](docs/05-hermes-agent-setup.md) | The Hermes AI co-writer — step-by-step setup & configuration. |

## Getting started (scaffold)

```bash
npm install
npm start          # dev server at http://localhost:4200
```

## Build & deploy (planned)

```bash
npm run build      # → dist/tig-music/browser
npm run deploy     # build, then: firebase deploy --only hosting:music
```

Deploys to the `music` Firebase Hosting target (`tig-music` site) in the shared `tig-powell`
project — connect `music.tigpowell.com` to that site and enable Google auth + authorized
domains. A `/music` describe-and-link page on [tig-powell](../tig-powell) links to it, mirroring
`/guitar` and `/banjo`.

### Shared-bucket infra (rules + CORS)

The suite shares **one** Cloud Storage bucket (`tig-powell.firebasestorage.app`), so its
security ruleset ([storage.rules](storage.rules), deployed via `firebase deploy --only storage`)
and its **CORS config** ([storage.cors.json](storage.cors.json)) are shared with Tig Worship —
edits from either repo overwrite the other's, so keep both repos' copies identical and never
drop another app's origins/paths. Reapply CORS after changing it:

```bash
gcloud storage buckets update gs://tig-powell.firebasestorage.app \
  --cors-file=storage.cors.json
```

Demo-take recording needs both: the `users/{uid}/songs/**` block in `storage.rules` *and* the
music origins + `POST`/`PUT` methods in the CORS config (browser uploads preflight against it).

## Suite integration

Tig Music writes the shared `users/{uid}` tree with `appId: 'music'` (progress, sessions,
saved) so the hub dashboard reflects it — see the
[Suite Data Contract](../tig-powell/docs/00-architecture/03-suite-data-contract.md).
