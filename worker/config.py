"""Central config + compute-device detection for the Tig Music audio worker.

Every knob is an env var (see .env.example) so the same code runs unchanged on a Mac mini
(Apple MPS / CPU), an NVIDIA GPU box (CUDA), or a plain CPU VPS.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()  # read a local .env if present (no-op in prod if you use real env vars)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@lru_cache(maxsize=1)
def detect_device() -> str:
    """Best available torch device: cuda > mps (Apple) > cpu. Override with DEVICE=..."""
    forced = _env("DEVICE")
    if forced:
        return forced
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


@dataclass(frozen=True)
class Config:
    # --- Firebase ---
    # Path to a service-account JSON with Firestore + Storage admin. Also honored via
    # the standard GOOGLE_APPLICATION_CREDENTIALS env var.
    credentials_path: str
    project_id: str
    storage_bucket: str          # e.g. tig-powell.firebasestorage.app
    jobs_collection: str         # Firestore collection the app writes import jobs to

    # --- Models ---
    demucs_model: str            # htdemucs (default) / htdemucs_ft (slower, better)
    demucs_device: str           # cuda | mps | cpu — separated so you can force CPU if MPS flakes
    whisper_model: str           # tiny | base | small | medium | large-v3
    whisper_device: str          # cuda | cpu  (faster-whisper has no mps; use cpu on Apple)
    whisper_compute: str         # float16 (cuda) | int8 (cpu)

    # --- Optional LLM title suggestion (OpenAI-compatible chat endpoint, e.g. Ollama) ---
    llm_base_url: str            # "" disables; else e.g. http://localhost:11434/v1
    llm_model: str
    llm_api_key: str

    # --- Runtime ---
    poll_interval_sec: float
    work_dir: str                # scratch space for downloads + stems


@lru_cache(maxsize=1)
def get_config() -> Config:
    device = detect_device()
    cuda = device == "cuda"
    return Config(
        credentials_path=_env("GOOGLE_APPLICATION_CREDENTIALS") or _env("FIREBASE_CREDENTIALS"),
        project_id=_env("FIREBASE_PROJECT_ID", "tig-powell"),
        storage_bucket=_env("FIREBASE_STORAGE_BUCKET", "tig-powell.firebasestorage.app"),
        jobs_collection=_env("JOBS_COLLECTION", "songImports"),
        demucs_model=_env("DEMUCS_MODEL", "htdemucs"),
        demucs_device=_env("DEMUCS_DEVICE", device),
        whisper_model=_env("WHISPER_MODEL", "large-v3" if cuda else "medium"),
        whisper_device=_env("WHISPER_DEVICE", "cuda" if cuda else "cpu"),
        whisper_compute=_env("WHISPER_COMPUTE", "float16" if cuda else "int8"),
        llm_base_url=_env("LLM_BASE_URL"),
        llm_model=_env("LLM_MODEL", "gemma3:1b"),
        llm_api_key=_env("LLM_API_KEY"),
        poll_interval_sec=float(_env("POLL_INTERVAL_SEC", "5")),
        work_dir=_env("WORK_DIR", "/tmp/tig-music-worker"),
    )
