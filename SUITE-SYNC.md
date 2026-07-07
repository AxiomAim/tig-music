# Tig Banjo — Suite sync (P4) — WIRED

Tig Banjo now signs in against the shared `tig-powell` Firebase project and writes into
the shared `users/{uid}` tree, so the hub dashboard at tigpowell.com reflects Banjo.
Contract:
[03-suite-data-contract.md](../tig-powell/docs/00-architecture/03-suite-data-contract.md).

## What was added
- `firebase` + `@angular/fire` dependencies.
- `core/firebase.config.ts` — the real **tig-banjo** web-app config (shared project).
- `app.config.ts` — `provideFirebaseApp` / `provideAuth` / `provideFirestore`.
- `core/services/auth.service.ts` — Google sign-in/out, `user` signal.
- `core/suite/sync.ts` — drop-in copy of the canonical write contract.
- `core/services/suite-sync.service.ts` — on sign-in sets a Banjo Continue point on the
  hub; exposes `endPracticeSession()` and `save()` for future practice/save flows.
- `shared/components/suite-account-button/` — navbar sign-in/out (in `app.ts`).
- `angular.json` — initial-bundle warning budget raised 700→900 kB (Firebase weight).

## How it behaves
- **Signed out:** unchanged — the app runs locally, nothing is written.
- **Signed in:** writes `progress/banjo` with a resume point (`/rolls`), so a Banjo
  Continue card appears on the hub. As Roll Master / Exercises add real practice events,
  call `SuiteSyncService.endPracticeSession(durationSec, items)` and `.save(...)` to fill
  streak, minutes, the heatmap, and saved items.

## ⚠️ Before it works at runtime (shared with the hub)
1. **Auth providers** — enable **Google** in Authentication.
2. **Authorized domains** — add `banjo.tigpowell.com` (and `localhost` for dev).

(The Firebase config is already real — no placeholders to fill.)

## Verified
`npx ng build` completes cleanly with the integration in place.
