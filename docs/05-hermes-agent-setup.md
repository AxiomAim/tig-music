# Hermes — AI Co-Writer: Step-by-Step Setup & Config

> Hermes is the messenger — it carries options to the writer and carries nothing into the song
> without a yes. Find, suggest, critique; propose and never act.

Hermes is Tig Music's AI co-writer: a song-scoped assistant that suggests rhymes, scripture
ties, chord substitutions, structure notes, and titles as **editable proposal cards** — and
writes nothing into a song until the human clicks **Accept**. It is the Tig Music analog of
[Tig Worship's AI Worship Assistant](../../tig-worship/docs/09-ai-worship-assistant.md) and runs
on the same family stack: **Firebase AI Logic (Gemini)** with function-calling and structured
output.

> **Assumption to confirm.** This document treats "Hermes" as the **in-product AI co-writer**
> for Tig Music (built on Firebase AI Logic / Gemini), because that matches the brief's
> AI-songwriting focus and the family's assistant pattern. If instead you meant Hermes as an
> external dev/coding agent or a different framework, tell me and I'll rewrite this doc against
> that — the rest of the plan is unaffected.

This is a **setup and configuration** guide: prerequisites, project wiring, tool
(function-calling) definitions, the safety model, grounding, prompts, testing, and rollout —
in the order you'd actually do them.

---

## 0. Prerequisites

- The Tig Music app scaffolded and building (Milestone **M0**,
  [04-development-plan.md](04-development-plan.md)), on the shared `tig-powell` Firebase
  project.
- **Firebase Blaze plan** (AI Logic + Cloud Functions require it).
- Firebase Auth (Google) working — Hermes only runs for a signed-in user (a `uid` to scope and
  a permission to check).
- The deterministic engines Hermes grounds on exist as services: `theory`, `transpose`,
  `rhyme`, `scripture`, `song` ([03-design-and-architecture.md](03-design-and-architecture.md) §2).
- Model id and quotas confirmed against the current Firebase AI Logic / `claude-api` docs
  **before** coding (don't hard-code a stale model id).

---

## 1. Enable Firebase AI Logic (Gemini)

1. In the **Firebase console** → **Build → AI Logic**, enable it for the `tig-powell` project.
2. Choose the **Gemini Developer API** backend (simplest to start) or **Vertex AI** if you need
   Vertex features later — Hermes's code path is the same via the AI Logic SDK.
3. Confirm the current recommended Gemini model id and its **function-calling** +
   **structured-output** support in the console/docs; record it in config (§3), don't inline it.
4. Note the free-tier quota and set a billing alert — Hermes should be cheap because the facts
   come from local engines, not the model (§6).

---

## 2. Install & wire the SDK

Add the Firebase AI Logic client to the Angular app (the SDK ships in the `firebase` package
the app already depends on):

```ts
// core/hermes/ai.config.ts
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { firebaseApp } from '../firebase.config';

export const HERMES_MODEL_ID = 'gemini-<confirm-current-id>'; // from §1.3 — do not guess
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

export const hermesModel = getGenerativeModel(ai, {
  model: HERMES_MODEL_ID,
  systemInstruction: HERMES_SYSTEM_PROMPT, // §5
  tools: [{ functionDeclarations: HERMES_READ_TOOLS }], // §4 — read tools only on the client
});
```

- **Read-only tools** (rhyme, scripture, theory, transpose lookups) may call from the client
  model — they can't harm anything.
- **Any tool that would write to a song** is NOT registered on the client model. It is a
  **proposal** the UI renders, and the actual write runs in a Cloud Function behind the action
  token (§6). This split is the safety model in one sentence.

---

## 3. Hermes configuration

Centralize the knobs so they're reviewable and tunable:

```ts
// core/hermes/hermes.config.ts
export const HERMES_CONFIG = {
  modelId: HERMES_MODEL_ID,
  maxOutputTokens: 1024,
  temperature: 0.9,            // a co-writer should be a little creative
  proposalTemperature: 0.9,
  factTemperature: 0.2,        // grounded/factual calls run cooler
  perUserDailyTokenBudget: 200_000,
  contextCacheTtlSec: 600,     // cache song/scripture grounding context
  maxProposalsPerTurn: 4,
  requireAcceptForWrites: true // NON-NEGOTIABLE — never false in prod
};
```

---

## 4. Tool (function-calling) definitions

Hermes orchestrates; the deterministic engines do the work. Each skill is a declared function
the model may call. **Read** tools return facts; **write** tools return *proposals*, never
committed changes.

| Tool | Kind | Backed by | Returns |
|---|---|---|---|
| `findRhymes(word, kind)` | read | `rhyme.service` (Datamuse) | rhymes / near-rhymes / synonyms |
| `searchScripture(query, refs?)` | read | `scripture.service` (WEB index) | real WEB verses + cross-refs |
| `getDiatonicChords(key)` | read | `theory.service` | in-key chords + Nashville numbers |
| `suggestSubstitutions(chord, key)` | read | `theory.service` | valid borrowed/substitute chords |
| `transposeSong(songId, toKey)` | read | `transpose.service` | preview only (no save) |
| `getSong(songId)` | read | `song.service` | the current song as grounding context |
| `proposeLineEdit(sectionId, lineNo, text)` | **write→proposal** | — | a `ProposalCard` (not applied) |
| `proposeChordEdit(sectionId, edit)` | **write→proposal** | — | a `ProposalCard` (not applied) |
| `proposeSectionEdit(sectionId, section)` | **write→proposal** | — | a `ProposalCard` (not applied) |

Example declaration (structured output enforced by JSON schema):

```ts
// core/hermes/tools.ts
export const HERMES_READ_TOOLS = [
  {
    name: 'searchScripture',
    description: 'Search the World English Bible (public domain) for verses matching a theme or reference. Returns only real verses.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Theme, phrase, or reference (e.g. "grace", "Psalm 23")' },
        includeCrossRefs: { type: 'boolean' }
      },
      required: ['query']
    }
  },
  // findRhymes, getDiatonicChords, suggestSubstitutions, transposeSong, getSong …
];
```

The proposal tools declare a strict output schema so the UI can render a card:

```ts
// ProposalCard schema (structured output)
{
  type: 'object',
  properties: {
    kind: { enum: ['line', 'chord', 'section', 'title', 'note'] },
    target: { type: 'string' },        // "section:{id}/line:{n}" | "chord:{...}" | ""
    proposed: { type: 'string' },       // the suggested text/chord
    rationale: { type: 'string' },      // plain-English "why", grounded in tool results
    sources: { type: 'array', items: { type: 'string' } } // verse refs / theory facts used
  },
  required: ['kind', 'proposed', 'rationale']
}
```

---

## 5. System prompt (the guardrails, in words)

```
You are Hermes, a songwriting co-writer inside Tig Music. You help the writer of THIS song.

Rules:
- You PROPOSE options; you NEVER change the song. Every suggestion is an editable card the
  writer accepts, edits, or discards. Present 1–4 options, not a wall of text.
- Ground every factual claim in a tool result. For scripture, cite only verses returned by
  searchScripture — never invent a reference or wording. For chords, use only what
  getDiatonicChords / suggestSubstitutions return for the current key.
- The writer is the author. Offer sparks and alternatives; do not write whole songs. Prefer
  the smallest helpful suggestion (a stronger line, a better rhyme, one chord color).
- Respect the song's key, tempo, meter, and the section you're helping with.
- When you lack data, say so and offer a next step — don't fill the gap with invention.
- Keep the writer's voice; match the style (worship-oriented, blues-influenced) unless asked.
```

Attach the current song (via `getSong`) and the active key/section as context each turn.

---

## 6. Safety model: propose-never-act (enforced, not just prompted)

This is the core requirement (`FR-AI3`, `NFR-Sec2`) and the reason releases stay human-authored.

1. **The model proposes; it never writes.** Read tools run freely. There is **no client or
   server path** where a model response writes to a song directly — the write tools only emit
   `ProposalCard`s.
2. **A human confirms.** Applying a proposal requires the writer to click **Accept** on the
   card. Accept mints a short-lived **action token**.
3. **Writes execute server-side, permission-checked.** A **Cloud Function** `applyProposal`
   takes the proposal + action token, re-checks that the caller **owns** the song, applies the
   edit, and appends a **provenance entry** (`kind: 'ai-suggested'`). No token → no write.
4. **Everything is logged & reversible.** Every accepted proposal is a diff recorded in the
   song's provenance log with the originating tool-call id; version snapshots let the writer
   roll back.

```ts
// functions/applyProposal.ts  (server-side — the ONLY write path for AI suggestions)
export const applyProposal = onCall(async (req) => {
  assertActionToken(req.data.actionToken);          // minted by Accept; short-lived
  const song = await loadSong(req.data.songId);
  assertOwner(req.auth.uid, song);                  // owner-only, re-checked server-side
  const updated = applyEdit(song, req.data.proposal);
  updated.provenance.push({
    target: req.data.proposal.target,
    kind: 'ai-suggested',
    acceptedAt: serverTimestamp(),
    hermesToolCallId: req.data.proposal.toolCallId,
    summary: req.data.proposal.rationale
  });
  await saveSong(updated);
});
```

A unit test asserts that **no code path mutates a song without a valid, confirmed action
token** — this test gates the Hermes release.

---

## 7. Grounding (no hallucinated verses, chords, or keys)

- Hermes may only cite scripture that `searchScripture` returned from the **WEB** index; the
  system prompt forbids inventing references and the provenance `sources` field records what was
  used, so it's auditable.
- Chord suggestions come only from `getDiatonicChords` / `suggestSubstitutions` for the song's
  actual key — the model composes phrasing, the engine supplies the harmony.
- Transpose previews come from `transpose.service`, not the model.
- Only the signed-in writer's own song is ever in context — no cross-user content (`NFR-Priv1`).

---

## 8. Client wiring (`hermes.service`)

```ts
// core/services/hermes.service.ts (sketch)
@Injectable({ providedIn: 'root' })
export class HermesService {
  private chat = hermesModel.startChat({ /* history */ });
  readonly proposals = signal<ProposalCard[]>([]);

  async ask(prompt: string, ctx: { songId: string; sectionId?: string }) {
    const res = await this.chat.sendMessage(this.withContext(prompt, ctx));
    // 1. run any read tool calls, feed results back (grounding loop)
    // 2. collect returned ProposalCards → this.proposals.set(...)
  }

  async accept(card: ProposalCard) {
    const token = mintActionToken(card);                 // client mints; server re-checks
    await this.fns.httpsCallable('applyProposal')({ ...card, actionToken: token });
    // provenance is written server-side; refresh song
  }
}
```

The `proposal-card` component renders each proposal with **Accept / Edit / Discard**; Edit lets
the writer alter the text before accepting (and it's logged as their edit, not AI, if changed
substantially).

---

## 9. Cost & performance

- **Prefer engines over the model.** Rhymes, transpose, diatonic chords, and scripture come from
  cheap deterministic services; the model is used for *understanding and composition* only.
- **Cache grounding context** (song + relevant scripture) for `contextCacheTtlSec`; don't resend
  the whole song every turn.
- **Per-user daily token budget** (`HERMES_CONFIG.perUserDailyTokenBudget`) with a friendly cap
  message; log spend.
- Keep `maxOutputTokens` tight — proposals are short by design.

---

## 10. Testing Hermes

- **Safety (blocking):** prove no song write occurs without a confirmed action token; prove
  `applyProposal` rejects a non-owner and a missing/expired token.
- **Grounding:** given a scripture prompt, assert every cited reference exists in the WEB index;
  given a chord prompt, assert every suggested chord is in the engine's set for the key.
- **Structured output:** proposals validate against the `ProposalCard` schema; malformed model
  output triggers a retry, never a crash.
- **Provenance:** accepting a proposal appends exactly one provenance entry with the right
  target and tool-call id.
- **Budget:** exceeding the daily budget degrades gracefully (read tools still work; the model
  is paused with a clear message).

---

## 11. Rollout checklist

- [ ] AI Logic enabled on `tig-powell`; model id + quota confirmed and in config.
- [ ] Read tools registered on the client model; **no** write tool registered there.
- [ ] `applyProposal` Cloud Function deployed with owner + action-token checks.
- [ ] `hermes.service` + `proposal-card` wired into the Song Workbench margin (`FR-W4`).
- [ ] Grounding engines (`rhyme`, `scripture`, `theory`, `transpose`) reachable as tools.
- [ ] Safety, grounding, structured-output, provenance, and budget tests green.
- [ ] Billing alert set; per-user budget enforced.
- [ ] Provenance log visible in the Release panel (`FR-CAT4`, ties releasability shut).

---

## 12. Why this design

It gives the writer a genuine co-writer — rhymes, scripture, harmony, structure, titles, on
demand and in context — while making it **structurally impossible** for the AI to author the
song behind their back. The human accepts every change, every acceptance is logged, and the
resulting provenance record is exactly what makes a Tig Music song cleanly releasable to
Spotify and beyond (the copyright caution from the [brief](00-tig-music.md), turned into an
engineering guarantee). And it's all on infrastructure the tig family already runs — Firebase +
Gemini — so Hermes is a fast path over the same engines the rest of Tig Music already uses.
