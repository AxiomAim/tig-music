# Tig Music — Audio Import Worker

Turns an uploaded **wav/mp3** into everything the "Add New Song by Upload" feature needs
([../docs/05-tig-music-update.md](../docs/05-tig-music-update.md)):

| Field | How |
|---|---|
| **Stem separation** | Demucs `htdemucs` → `vocals / drums / bass / other` |
| **Remove vocals** | Demucs → `instrumental.wav` (all stems except vocals) |
| **Key** | librosa chroma + Krumhansl-Schmuckler |
| **Tempo (BPM)** | librosa beat tracking |
| **Lyrics** | faster-whisper on the isolated vocal stem |
| **Title** | file's ID3 tag → else LLM suggestion from lyrics → else filename |
| **Author** | file's ID3 tag only (not derivable from raw audio; blank if absent) |

## How it fits together

```
music.tigpowell.com (browser)
  1. upload file  → Firebase Storage: imports/{uid}/{jobId}/original.<ext>
  2. create job   → Firestore songImports/{jobId} { status:'queued', ... }
        │
        ▼   (this worker PULLS — no inbound ports, runs behind NAT)
  THIS WORKER  (Mac mini / GPU box)
     claim → download → Demucs → key/tempo → Whisper → tags
     → upload stems + instrumental to Storage
     → Firestore job { status:'done', result:{ key,tempo,lyrics,title,author,stems,... } }
        │
        ▼
  browser watches the job doc → pre-fills the New Song form
```

The worker only makes **outbound** connections to Firebase, so it needs no public URL,
tunnel, or Cloudflare Access token (unlike the Hermes chat proxy). A home Mac mini works.

## Install

Requires **Python 3.10–3.12** and **ffmpeg** (`brew install ffmpeg` / `apt install ffmpeg`).

```bash
cd worker
python3 -m venv .venv && source .venv/bin/activate

# PyTorch first — the wheel differs by host:
#   • NVIDIA GPU box:  pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
#   • Mac mini (MPS):  pip install torch torchaudio          (default wheel has MPS)
#   • CPU-only:        pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

## Configure

```bash
cp .env.example .env
# put a Firebase service-account JSON next to it (Firestore + Storage admin) and point
# GOOGLE_APPLICATION_CREDENTIALS at it. Generate one in:
#   Firebase console → Project settings → Service accounts → Generate new private key
```

Device is auto-detected (`cuda` > `mps` > `cpu`); the defaults pick sensible model sizes per
host. On a Mac mini, if Demucs errors with an MPS "unsupported op", set `DEMUCS_DEVICE=cpu`.

## Run

```bash
python main.py --once     # process one queued job then exit — use this to smoke-test
python main.py            # daemon: poll forever
```

### Keep it running

- **macOS (Mac mini):** a `launchd` plist (`~/Library/LaunchAgents/com.tigmusic.worker.plist`)
  running `main.py`, `KeepAlive=true`, `RunAtLoad=true`.
- **Linux (GPU box):** a `systemd` unit (`Restart=always`) or `pm2 start main.py --interpreter python3`.

## Test without the app

Create a Storage object + a Firestore `songImports` doc by hand (status `queued`,
`audioPath` = the object path, `ownerUid` = any uid), then `python main.py --once` and watch
the doc flip to `done` with a populated `result`.

## Performance notes (per ~3.5-min song)

| Host | Demucs | Whisper (medium/large) |
|---|---|---|
| NVIDIA GPU (CUDA) | ~5–15 s | ~10–30 s |
| Mac mini M4 (MPS/CPU) | ~1–3 min | ~1–3 min (int8 CPU) |
| CPU VPS (4 core) | ~5–10 min | ~10–30 min (avoid large) |

Whisper model auto-selects `large-v3` on CUDA, `medium` elsewhere — override in `.env`.
