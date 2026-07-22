// ============================================================
// Tig Music — Hermes co-writer proxy (Cloud Function).
//
// tig-music (browser) → this function → active backend (xAI Grok, or the Mac-mini Hermes agent).
//
// Why a server-side proxy (see tig-music/docs/05-hermes-agent-setup.md §6):
//  - Holds the API key(s) — never in the browser.
//  - Enforces propose-never-act: it returns editable Proposal cards; it never writes the song.
//  - Only signed-in Tig Music users can call it (onCall verifies the Firebase ID token).
//
// The backend is selectable via HERMES_BACKEND (default 'xai'); both are OpenAI-compatible. Config
// lives in functions/.env, secrets in Firebase Secret Manager. See functions/README.md for the full
// contract, the switch-back steps, and deploy. Confirmed live: xAI 2026-07-22, api_server 2026-07-21.
// ============================================================

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// ── Backend selector ─────────────────────────────────────────────────────────
// 'xai'        → call xAI (Grok) directly. Fast (~5s), no Cloudflare/Mac-mini needed. (default)
// 'api_server' → route to the local Hermes agent on the Mac mini via the aim.aimos.it.com tunnel
//                (gemma4/llama). Kept intact so we can switch back; see functions/README.md.
type Backend = 'xai' | 'api_server';
const BACKEND: Backend = process.env.HERMES_BACKEND === 'api_server' ? 'api_server' : 'xai';

// xAI (active backend).
const XAI_API_KEY = defineSecret('XAI_API_KEY');
const XAI_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
const XAI_MODEL = process.env.XAI_MODEL ?? 'grok-4.3';

// api_server / Mac-mini backend. IMPORTANT: `defineSecret` registers a *deploy-time* requirement
// for that secret, whether or not it's bound to the function — so we only define these when the
// api_server backend is actually selected. Otherwise an xai-only deploy would demand these unset
// secrets. (Discovered on the first deploy, 2026-07-22.)
const apiServer =
  BACKEND === 'api_server'
    ? {
        key: defineSecret('HERMES_API_KEY'),
        cfId: defineSecret('CF_ACCESS_CLIENT_ID'),
        cfSecret: defineSecret('CF_ACCESS_CLIENT_SECRET'),
      }
    : null;
const BASE_URL = process.env.HERMES_BASE_URL ?? 'https://aim-api.aimos.it.com';
const CHAT_PATH = process.env.HERMES_CHAT_PATH ?? '/v1/chat/completions';
const MODEL = process.env.HERMES_MODEL ?? 'hermes-agent';

/** Secrets bound to the function — only what the active backend needs. */
const SECRETS =
  BACKEND === 'api_server' ? [apiServer!.key, apiServer!.cfId, apiServer!.cfSecret] : [XAI_API_KEY];

/** The model/label recorded on a proposal's `sources` (the grounding receipt). */
const activeModel = (): string => (BACKEND === 'xai' ? XAI_MODEL : MODEL);

// ---- request/response contracts shared in spirit with the Angular client ----
interface ProposeRequest {
  skill: 'ask' | 'rhyme' | 'scripture' | 'chord' | 'title' | 'structure';
  sectionId?: string;
  input?: string;
  song: {
    title: string;
    keyName: string;
    tempo: number;
    sectionLabel?: string;
    sectionLyrics?: string;
  };
}

interface Proposal {
  id: string;
  skill: string;
  kind: 'line' | 'note';
  target: string;
  proposed: string;
  rationale: string;
  sources: string[];
  apply?: { type: 'append-line'; sectionId: string; text: string };
}

export const hermesPropose = onCall(
  {
    // Only the active backend's secrets (see SECRETS above). Switching to api_server just needs
    // HERMES_BACKEND=api_server + those three secrets set — no code edit here (see README).
    secrets: SECRETS,
    cors: true,
    // xai returns in ~5s; the api_server agent can take 3–5 min. 300s covers both backends and is
    // harmless for the fast path (the function returns as soon as the reply lands).
    timeoutSeconds: 300,
  },
  async (req): Promise<{ proposals: Proposal[]; source: 'hermes' }> => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in to use Hermes.');
    const data = req.data as ProposeRequest;
    if (!data?.song) throw new HttpsError('invalid-argument', 'Missing song context.');

    const reply = await callHermes(buildMessages(data));
    return { proposals: toProposals(data, reply), source: 'hermes' };
  },
);

/** Dispatch to the active backend. Both return the assistant's text; the caller shapes it into
 *  editable proposal cards (propose-never-act is unchanged regardless of backend). */
async function callHermes(messages: { role: string; content: string }[]): Promise<string> {
  return BACKEND === 'xai' ? callXai(messages) : callApiServer(messages);
}

/** xAI (Grok) — OpenAI-compatible chat completions. Key held server-side; no Cloudflare needed. */
async function callXai(messages: { role: string; content: string }[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY.value()}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages,
        max_tokens: 120,
        temperature: 0.9,
        stream: false,
      }),
    });
  } catch (e) {
    throw new HttpsError('unavailable', `Could not reach xAI: ${(e as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new HttpsError(
      'permission-denied',
      'xAI rejected the API key (check the secret/billing).',
    );
  }
  if (res.status === 429)
    throw new HttpsError('resource-exhausted', 'xAI rate limit — try again shortly.');
  if (!res.ok) throw new HttpsError('internal', `xAI returned HTTP ${res.status}.`);

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new HttpsError('internal', 'xAI returned an empty reply.');
  return content.trim();
}

/** Local Hermes agent on the Mac mini, via the aim.aimos.it.com tunnel (gemma4/llama). Kept for
 *  the HERMES_BACKEND=api_server switch-back; requires the CF Access + Hermes secrets (see README). */
async function callApiServer(messages: { role: string; content: string }[]): Promise<string> {
  // Only reachable when BACKEND==='api_server', so `apiServer` is non-null here.
  const s = apiServer!;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.key.value()) headers['Authorization'] = `Bearer ${s.key.value()}`;
  if (s.cfId.value()) headers['CF-Access-Client-Id'] = s.cfId.value();
  if (s.cfSecret.value()) headers['CF-Access-Client-Secret'] = s.cfSecret.value();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${CHAT_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.9,
        stream: false,
      }),
    });
  } catch (e) {
    throw new HttpsError('unavailable', `Could not reach Hermes: ${(e as Error).message}`);
  }
  if (res.status === 302 || res.status === 401 || res.status === 403) {
    throw new HttpsError(
      'permission-denied',
      'Blocked by Cloudflare Access — check the service token.',
    );
  }
  if (!res.ok) throw new HttpsError('internal', `Hermes returned HTTP ${res.status}.`);

  const body = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    content?: string;
    text?: string;
    hermes?: { failed?: boolean; completed?: boolean; error_code?: string | null };
  };

  // The api_server can return HTTP 200 while the agent itself failed (e.g. the model was loaded
  // with too little context for tool use). It puts the error message in `content` and flags it in
  // the `hermes` envelope / `finish_reason`. Treat that as unavailable so the client falls back to
  // the local grounded skills instead of showing the error text as a song suggestion.
  const choice = body.choices?.[0];
  if (body.hermes?.failed || choice?.finish_reason === 'error') {
    const code = body.hermes?.error_code;
    throw new HttpsError(
      'unavailable',
      code ? `Hermes agent error (${code}).` : 'Hermes agent error.',
    );
  }

  const content = choice?.message?.content ?? body.content ?? body.text ?? '';
  if (!content.trim()) throw new HttpsError('internal', 'Hermes returned an empty reply.');
  return content.trim();
}

function buildMessages(d: ProposeRequest): { role: string; content: string }[] {
  const system =
    'You are Hermes, a songwriting co-writer inside Tig Music. Offer ONE short, singable ' +
    'suggestion (a lyric line, image, or idea) that fits the song. Do NOT write the whole song, ' +
    'do not explain at length, and keep the writer’s voice. Reply with just the suggested line.';
  const ctx =
    `Song "${d.song.title}", key of ${d.song.keyName}, ${d.song.tempo} bpm.` +
    (d.song.sectionLabel ? ` Working on the ${d.song.sectionLabel}.` : '') +
    (d.song.sectionLyrics ? ` Existing lines:\n${d.song.sectionLyrics}` : '') +
    (d.input ? `\nThe writer asks: ${d.input}` : '\nSuggest a next line.');
  return [
    { role: 'system', content: system },
    { role: 'user', content: ctx },
  ];
}

function toProposals(d: ProposeRequest, reply: string): Proposal[] {
  // Split a multi-line reply into up to 3 line options; keep them editable + logged on accept.
  const lines = reply
    .split('\n')
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const picks = lines.length ? lines : [reply];
  return picks.map((text, i) => ({
    id: 'h' + Date.now() + i,
    skill: d.skill,
    kind: d.sectionId ? 'line' : 'note',
    target: d.song.sectionLabel ? `${d.song.sectionLabel} — Hermes` : 'Hermes suggestion',
    proposed: text,
    rationale:
      'Suggested by your Hermes agent — edit or discard; nothing changes until you Accept.',
    sources: ['hermes:' + activeModel()],
    apply: d.sectionId ? { type: 'append-line', sectionId: d.sectionId, text } : undefined,
  }));
}
