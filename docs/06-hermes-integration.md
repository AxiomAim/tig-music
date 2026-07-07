# Tig Music ⇄ Hermes — Integration Status & Setup

**Goal:** let Tig Music's co-writer call your real Hermes agent (Nous Research, on the Mac mini),
exposed at `https://aim.aimos.it.com` via the Cloudflare `AimOS` tunnel.

## What's built (in code, compiling green)

```
tig-music (browser)  →  Firebase Function `hermesPropose`  →  aim.aimos.it.com/<api>  →  Hermes (Mac mini)
   HermesPanel            functions/src/index.ts               Cloudflare tunnel            127.0.0.1:8642
   "✦ Ask Hermes"         holds secrets + CF Access token
```

- **`functions/`** — a Cloud Functions codebase with the callable **`hermesPropose`**. It verifies
  the signed-in user, calls Hermes server-side, and returns editable **Proposal cards**
  (propose-never-act preserved). Secrets never touch the browser.
- **`core/services/hermes-remote.service.ts`** — calls the callable; returns `[]` if unreachable.
- **`core/services/hermes.service.ts`** — the new **`ask`** skill routes to Hermes; the grounded
  skills (rhyme / scripture / chord / title / structure) stay **local** so verses and chords are
  always exact.
- **HermesPanel** — a **✦ Ask Hermes** button next to the local skills.
- **Graceful fallback:** if Hermes/the function isn't configured or the Mac mini is offline, the
  panel shows a note and the local skills keep working. Nothing breaks.

**Why a server-side proxy:** a server-to-server request sends **no `Origin` header**, so it
sidesteps the strict Host/Origin check that breaks the browser chat WebSocket — and it keeps the
Hermes key + Cloudflare Access token off the client. (See [05-hermes-agent-setup.md](05-hermes-agent-setup.md) §6.)

## To go live — 3 setup steps (your side)

### 1. Connect the api_server in Hermes (Mac mini)
Hermes UI → **CHANNELS → api_server → connect**. Note its **route + auth**:
- the request path (e.g. `/v1/chat/completions` if OpenAI-compatible, or Hermes's own),
- whether it needs an **API key**.

If it's **not** OpenAI-compatible, change one function — the `callHermes()` URL/body/parse in
[`functions/src/index.ts`](../functions/src/index.ts). It's isolated and heavily commented.

### 2. Create a Cloudflare Access **service token** (so the function can pass Access)
`aim.aimos.it.com` is behind Access, so the function must authenticate non-interactively:
1. Zero Trust → **Access → Service Auth → Create Service Token** → copy the **Client ID** + **Client Secret**.
2. Zero Trust → Access → the `aim.aimos.it.com` application → **Policies** → add a policy:
   **Action = Service Auth**, **Include = Service Token = (the one above)**.

*(This is the one part I can't do for you — the `claude-access` API token is Tunnel-scoped only.
Add `Account → Access: Apps and Policies → Edit` if you want me to automate it next time.)*

### 3. Set the function secrets + env, then deploy
```bash
cd tig-music/functions
# secrets (prompted, hidden):
firebase functions:secrets:set HERMES_API_KEY            # '' if the api_server needs none
firebase functions:secrets:set CF_ACCESS_CLIENT_ID
firebase functions:secrets:set CF_ACCESS_CLIENT_SECRET

# non-secret env (functions/.env):
#   HERMES_BASE_URL=https://aim.aimos.it.com
#   HERMES_CHAT_PATH=/v1/chat/completions      # adjust to the api_server route
#   HERMES_MODEL=gemma4:12b

npm install && npm run build
firebase deploy --only functions:tig-music
```

## Verify
1. Deploy the app + function, sign in at `music.tigpowell.com`, open a song.
2. In the Hermes panel, click **✦ Ask Hermes**, optionally type a prompt, run it.
3. A suggestion card appears → **Accept** appends it to the section and logs a provenance entry;
   **Discard** drops it. Nothing enters the song without Accept.
4. If it can't reach Hermes, you'll see the "unreachable" note — the local skills still work.

## Status checklist
- [x] Cloud Function proxy (`hermesPropose`) — built, `tsc` clean.
- [x] Client wiring + `✦ Ask Hermes` button — built, `ng build` + 28 tests green.
- [ ] api_server connected in Hermes + route/auth confirmed.
- [ ] Cloudflare Access service token created + policy added.
- [ ] Function secrets/env set + deployed.
- [ ] `callHermes()` endpoint confirmed/adjusted to the real api_server shape.

## Notes
- The **chat-UI WebSocket** (`aim.aimos.it.com/chat`, code 1006) is a **separate** issue and is
  **not** needed for this integration. To fix it for your own browser use, allow `aim.aimos.it.com`
  in Hermes's host/origin config, or add a Cloudflare rule that rewrites the `Origin` header.
- **Rotate the `claude-access` Cloudflare API token** — it appeared in plaintext during setup.
