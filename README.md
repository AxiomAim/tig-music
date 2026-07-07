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

> **Status:** planning complete, app not yet built. The source in this repo is scaffolding
> copied from Tig Banjo — see [`docs/`](docs/) for the plan that replaces it.

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

## Suite integration

Tig Music writes the shared `users/{uid}` tree with `appId: 'music'` (progress, sessions,
saved) so the hub dashboard reflects it — see the
[Suite Data Contract](../tig-powell/docs/00-architecture/03-suite-data-contract.md).
# tig-music
