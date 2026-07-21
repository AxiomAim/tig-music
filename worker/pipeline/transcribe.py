"""Lyric transcription with faster-whisper.

Runs on the vocals stem when we have it (Demucs already isolated the voice, so the
transcript is far cleaner than transcribing the full mix). CUDA/float16 on a GPU box,
CPU/int8 on a Mac mini.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

log = logging.getLogger("worker.transcribe")


@dataclass
class Transcript:
    text: str                       # newline-joined lyric lines
    language: str = ""
    segments: list[dict] = field(default_factory=list)  # {start,end,text} for future alignment


@lru_cache(maxsize=2)
def _load_model(model: str, device: str, compute: str):
    from faster_whisper import WhisperModel

    log.info("whisper: loading model=%s device=%s compute=%s", model, device, compute)
    return WhisperModel(model, device=device, compute_type=compute)


def transcribe(audio_path: Path, model: str, device: str, compute: str) -> Transcript:
    m = _load_model(model, device, compute)
    # vad_filter drops the long silent gaps between vocal phrases → fewer hallucinated lines.
    segments, info = m.transcribe(str(audio_path), vad_filter=True, beam_size=5)

    seg_list, lines = [], []
    for s in segments:
        line = s.text.strip()
        if line:
            lines.append(line)
            seg_list.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": line})

    text = "\n".join(lines)
    log.info("whisper: lang=%s lines=%d", info.language, len(lines))
    return Transcript(text=text, language=info.language, segments=seg_list)
