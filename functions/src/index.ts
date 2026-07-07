// ============================================================
// Tig Music — Hermes co-writer proxy (Cloud Function).
//
// tig-music (browser) → this function → aim.aimos.it.com/<api> → Hermes on the Mac mini.
//
// Why a server-side proxy (see tig-music/docs/05-hermes-agent-setup.md §6):
//  - Holds the secrets (Hermes API key + Cloudflare Access service token) — never in the browser.
//  - A server-to-server call sends NO `Origin` header, so it sidesteps Hermes's strict
//    Host/Origin check that breaks the browser chat WebSocket.
//  - Enforces propose-never-act: it returns editable Proposal cards; it never writes the song.
//  - Only signed-in Tig Music users can call it (onCall verifies the Firebase ID token).
//
// CONFIG — set these before deploy (see the deploy notes in docs/05-tig-music-update.md):
//   Secrets (firebase functions:secrets:set):
//     HERMES_API_KEY              — the api_server key, if it requires one ('' if none)
//     CF_ACCESS_CLIENT_ID         — Cloudflare Access service-token client id
//     CF_ACCESS_CLIENT_SECRET     — Cloudflare Access service-token client secret
//   Env (functions/.env or process env):
//     HERMES_BASE_URL             — e.g. https://aim.aimos.it.com
//     HERMES_CHAT_PATH            — e.g. /v1/chat/completions  (adjust to the api_server route)
//     HERMES_MODEL                — e.g. gemma4:12b
// ============================================================

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const HERMES_API_KEY = defineSecret('HERMES_API_KEY');
const CF_ACCESS_CLIENT_ID = defineSecret('CF_ACCESS_CLIENT_ID');
const CF_ACCESS_CLIENT_SECRET = defineSecret('CF_ACCESS_CLIENT_SECRET');

const BASE_URL = process.env.HERMES_BASE_URL ?? 'https://aim.aimos.it.com';
const CHAT_PATH = process.env.HERMES_CHAT_PATH ?? '/v1/chat/completions';
const MODEL = process.env.HERMES_MODEL ?? 'gemma4:12b';

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
  { secrets: [HERMES_API_KEY, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET], cors: true, timeoutSeconds: 60 },
  async (req): Promise<{ proposals: Proposal[]; source: 'hermes' }> => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in to use Hermes.');
    const data = req.data as ProposeRequest;
    if (!data?.song) throw new HttpsError('invalid-argument', 'Missing song context.');

    const reply = await callHermes(buildMessages(data));
    return { proposals: toProposals(data, reply), source: 'hermes' };
  },
);

/** The ONE place to adjust for the real api_server contract. Defaults to an OpenAI-compatible
 *  chat endpoint; change the URL/body/parse if Hermes exposes a different shape. */
async function callHermes(messages: { role: string; content: string }[]): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (HERMES_API_KEY.value()) headers['Authorization'] = `Bearer ${HERMES_API_KEY.value()}`;
  if (CF_ACCESS_CLIENT_ID.value()) headers['CF-Access-Client-Id'] = CF_ACCESS_CLIENT_ID.value();
  if (CF_ACCESS_CLIENT_SECRET.value()) headers['CF-Access-Client-Secret'] = CF_ACCESS_CLIENT_SECRET.value();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${CHAT_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 400, temperature: 0.9, stream: false }),
    });
  } catch (e) {
    throw new HttpsError('unavailable', `Could not reach Hermes: ${(e as Error).message}`);
  }
  if (res.status === 302 || res.status === 401 || res.status === 403) {
    throw new HttpsError('permission-denied', 'Blocked by Cloudflare Access — check the service token.');
  }
  if (!res.ok) throw new HttpsError('internal', `Hermes returned HTTP ${res.status}.`);

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; content?: string; text?: string };
  const content = body.choices?.[0]?.message?.content ?? body.content ?? body.text ?? '';
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
  const lines = reply.split('\n').map((l) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
  const picks = lines.length ? lines : [reply];
  return picks.map((text, i) => ({
    id: 'h' + Date.now() + i,
    skill: d.skill,
    kind: d.sectionId ? 'line' : 'note',
    target: d.song.sectionLabel ? `${d.song.sectionLabel} — Hermes` : 'Hermes suggestion',
    proposed: text,
    rationale: 'Suggested by your Hermes agent — edit or discard; nothing changes until you Accept.',
    sources: ['hermes:' + MODEL],
    apply: d.sectionId ? { type: 'append-line', sectionId: d.sectionId, text } : undefined,
  }));
}
