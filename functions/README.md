# Tig Music Functions — Hermes proxy

The callable **`hermesPropose`** turns the browser's "✦ Ask Hermes" into an editable proposal card,
holding the model API key server-side and enforcing propose-never-act. The backend is **switchable**
via `HERMES_BACKEND` in [`.env`](.env); the grounded skills (rhyme/scripture/chord/title/structure)
always run locally in the app and never hit any model.

## Backends

| `HERMES_BACKEND` | Path | Latency | Needs |
|---|---|---|---|
| **`xai`** (active) | Function → xAI Grok (`api.x.ai`) | ~4s (measured) | `XAI_API_KEY` secret. **No Cloudflare/Mac-mini.** |
| `api_server` | Function → tunnel → Hermes agent on the Mac mini (gemma4/llama) | 3–5 min | Cloudflare tunnel + Access token + 3 secrets (below) |

Switching is one env value + redeploy. The `api_server` code path is kept intact — nothing local
was removed.

### Model (xai)
Picked 2026-07-22 from `GET https://api.x.ai/v1/models`: **`grok-4.3`** (`grok-latest`, 1M context,
balanced). Change `XAI_MODEL` in `.env` to trade off:
- `grok-4.20-non-reasoning` — sub-second, cheapest, slightly less creative
- `grok-4.3` — balanced default (~4s)
- `grok-4.5` — flagship, best quality, ~8s + pricier

Only the `ask` skill calls Grok, ~270 tokens/call → a fraction of a cent per suggestion.

## Deploy (xai — current)

```bash
cd tig-music/functions
firebase functions:secrets:set XAI_API_KEY      # paste the xAI key (hidden prompt)
npm install && npm run build
firebase deploy --only functions:tig-music
```

Local emulator reads `XAI_API_KEY` from the gitignored `.env.local`; the deployed function reads it
from Firebase Secret Manager (the command above). Verify: sign in at `music.tigpowell.com`, open a
song, Hermes panel → **✦ Ask Hermes** → a suggestion card appears in seconds → **Accept** appends it
+ logs provenance; **Discard** drops it. If xAI is unreachable, the panel shows the graceful note and
local skills still work.

## Switch back to the Mac-mini agent (gemma4/llama)

1. In [`.env`](.env): `HERMES_BACKEND=api_server`.
2. In [`src/index.ts`](src/index.ts) `onCall({ secrets: [...] })`: add `HERMES_API_KEY`,
   `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.
3. Set those secrets; add a Cloudflare tunnel hostname → `http://127.0.0.1:8643` behind an Access
   Service-Auth policy, and point `HERMES_BASE_URL` at it (details below).
4. `npm run build && firebase deploy --only functions:tig-music`.

### api_server contract (verified 2026-07-21)
`POST /v1/chat/completions` (OpenAI-compatible), model `hermes-agent`, key = the mini's
`API_SERVER_KEY`. Chat lives **only** on the api_server (local `:8643`) — the dashboard (`:8642`,
which `aim.aimos.it.com` maps to) 405s on chat. The agent needs the model at ≥64k context (set on
the mini). Cloudflare Access service token: Zero Trust → Access → Service Auth → Create Token, then
add a Service-Auth policy on the api_server hostname's Access app.
