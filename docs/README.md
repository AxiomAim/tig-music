# Tig Music — Project Documents

Tig Music is a **songwriting studio** — the full *lyric → harmony → lead-sheet → demo →
release* pipeline for a working songwriter, weighted toward worship-oriented,
blues-influenced writing on guitar and keys. It is the newest member of the
[tigpowell.com](../../tig-powell) family (alongside [Tig Guitar](../../tig-guitar),
[Tig Banjo](../../tig-banjo), and [Tig Worship](../../tig-worship)) and is planned to ship
at **music.tigpowell.com**.

Its differentiator is **Hermes** — an AI co-writer that *proposes and never acts*: it
suggests rhymes, scripture ties, harmonic colors, structure, and titles, but the human
stays the author. That rule is a craft choice and a copyright one — songs bound for
Spotify, DistroKid/RouteNote, and (eventually) the worship canon must have human melody
and lyric authorship of record.

These documents are a **plan for review** — the app source in this repo is scaffolding
copied from Tig Banjo and is not yet the Tig Music product.

## Index

| Doc | What it covers |
|---|---|
| [00-tig-music.md](00-tig-music.md) | The original brief — vision, stack, and the songwriter's-toolkit research this plan is built on. |
| [00-overview.md](00-overview.md) | **Product overview** — what Tig Music is, who it's for, the seven pillars, and why it's its own app. |
| [01-features-and-specifications.md](01-features-and-specifications.md) | **Features, benefits & specifications** — every tool, what it does, the benefit, and its concrete spec, plus the roadmap. |
| [02-requirements.md](02-requirements.md) | **Requirements** — functional, non-functional, data, integration, legal/IP, and acceptance criteria. |
| [03-design-and-architecture.md](03-design-and-architecture.md) | **Design & architecture** — tech stack, app architecture, the hard engines (chart/transpose, audio, scripture), data model, design system, and deployment. |
| [04-development-plan.md](04-development-plan.md) | **Development plan** — SDLC, Agile/Kanban process, epics → user stories → tasks, sprint/milestone plan, Definition of Ready/Done, testing, and CI/CD. |
| [05-hermes-agent-setup.md](05-hermes-agent-setup.md) | **Hermes agent** — step-by-step setup and configuration of the AI co-writer (Firebase AI Logic + Gemini, tools, safety, grounding, wiring). |

## At a glance

- **Audience:** the working songwriter (starting with Tom) — someone who writes on
  guitar/keys, thinks in the Nashville Number System, roots lyrics in scripture (WEB
  translation), and publishes to [Spotify](https://open.spotify.com/artist/6bXJh8MVT5unSHUwknBgkN).
- **Flagship:** the **Song Workbench** — one home per song that unifies lyrics, chords,
  melody chart, demo takes, and metadata, with Hermes as an in-context co-writer.
- **Stack:** Angular 21.2, Angular Material + Kendo UI, Tailwind v3.4, Firebase
  (Auth, Firestore, Storage, Hosting/App Hosting), Capacitor 8.3 for mobile, and
  Firebase AI Logic (Gemini) for Hermes.
- **Home:** `music.tigpowell.com` (new Firebase hosting target `music`), with a `/music`
  describe-and-link page on the tig-powell hub, mirroring `/guitar` and `/banjo`.
- **Suite:** writes the shared `users/{uid}` tree (`appId: 'music'`) so the hub dashboard
  reflects Tig Music — see the [Suite Data Contract](../../tig-powell/docs/00-architecture/03-suite-data-contract.md).
