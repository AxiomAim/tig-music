"""Orchestrate one import job end-to-end.

download → separate (Demucs) → analyze (key/tempo) → transcribe (Whisper) → metadata
→ upload stems → return a result dict the app writes back to the job doc.
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path

from pipeline.analyze import analyze
from pipeline.metadata import resolve_meta
from pipeline.separate import separate
from pipeline.transcribe import transcribe

log = logging.getLogger("worker.process")


def process_job(job, io, cfg) -> dict:
    """Run the full pipeline for one job; returns the `result` payload. Raises on failure."""
    work = Path(cfg.work_dir) / job.id
    stems_out = work / "stems"
    ext = Path(job.file_name or job.audio_path).suffix or ".mp3"
    original = work / f"original{ext}"

    try:
        io.download(job.audio_path, original)
        base = f"imports/{job.owner_uid}/{job.id}"

        # 1) Stem separation + vocal removal
        io.set_progress(job.id, 10, "separating")
        sep = separate(original, stems_out, cfg.demucs_model, cfg.demucs_device)

        # 2) Upload stems + instrumental
        io.set_progress(job.id, 55, "uploading-stems")
        stem_paths = {name: io.upload(p, f"{base}/stems/{name}.wav")
                      for name, p in sep.stems.items()}
        instrumental_path = io.upload(sep.instrumental, f"{base}/instrumental.wav")

        # 3) Key + tempo (read the cleaner instrumental)
        io.set_progress(job.id, 70, "analyzing")
        analysis = analyze(sep.instrumental)

        # 4) Lyrics from the isolated vocal stem
        io.set_progress(job.id, 80, "transcribing")
        vocals = sep.stems.get("vocals", original)
        transcript = transcribe(vocals, cfg.whisper_model, cfg.whisper_device, cfg.whisper_compute)

        # 5) Title / author
        io.set_progress(job.id, 95, "metadata")
        meta = resolve_meta(original, job.file_name, transcript.text,
                            cfg.llm_base_url, cfg.llm_model, cfg.llm_api_key)

        return {
            "title": meta.title,
            "titleSource": meta.title_source,
            "author": meta.author,
            "authorSource": meta.author_source,
            "key": analysis.key,
            "tempo": analysis.tempo,
            "durationSec": round(analysis.duration_sec, 1),
            "lyrics": transcript.text,
            "language": transcript.language,
            "stems": stem_paths,               # {vocals,drums,bass,other} -> Storage paths
            "instrumental": instrumental_path,  # vocals-removed mix -> Storage path
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)  # never leave audio on the worker disk
