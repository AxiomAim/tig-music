"""Key + tempo (BPM) detection with librosa.

Key uses the Krumhansl-Schmuckler algorithm: average chroma correlated against major/minor
key profiles across all 12 rotations; best correlation wins. Analysing the vocals-removed
instrumental (when available) gives a cleaner harmonic read than the full mix.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("worker.analyze")

PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler major/minor tonal profiles.
_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]


@dataclass
class AudioAnalysis:
    key: str            # e.g. "G major", "E minor"
    tempo: int          # rounded BPM
    duration_sec: float


def _corr(a: list[float], b: list[float]) -> float:
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    num = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    da = sum((a[i] - ma) ** 2 for i in range(n)) ** 0.5
    db = sum((b[i] - mb) ** 2 for i in range(n)) ** 0.5
    return num / (da * db) if da and db else 0.0


def _estimate_key(chroma_mean: list[float]) -> str:
    best_score, best_key = -2.0, "C major"
    for i in range(12):
        rot = chroma_mean[i:] + chroma_mean[:i]
        for profile, quality in ((_MAJOR, "major"), (_MINOR, "minor")):
            score = _corr(rot, profile)
            if score > best_score:
                best_score, best_key = score, f"{PITCHES[i]} {quality}"
    return best_key


def analyze(audio_path: Path) -> AudioAnalysis:
    import librosa
    import numpy as np

    log.info("analyze: %s", audio_path.name)
    y, sr = librosa.load(str(audio_path), sr=22050, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
    tempo_bpm = int(round(float(np.atleast_1d(tempo)[0])))

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1).tolist()
    key = _estimate_key(chroma_mean)

    log.info("analyze: key=%s tempo=%d dur=%.1fs", key, tempo_bpm, duration)
    return AudioAnalysis(key=key, tempo=tempo_bpm, duration_sec=duration)
