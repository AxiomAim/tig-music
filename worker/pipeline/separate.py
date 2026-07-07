"""Stem separation + vocal removal via Demucs (facebookresearch/demucs).

Produces four stems (vocals, drums, bass, other) and an `instrumental` mix (everything
except vocals) — which is exactly the "Remove Vocals" feature.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("worker.separate")


@dataclass
class SeparationResult:
    stems: dict[str, Path]      # name -> wav path (vocals, drums, bass, other)
    instrumental: Path          # vocals-removed mix
    samplerate: int


def separate(audio_path: Path, out_dir: Path, model: str, device: str) -> SeparationResult:
    """Run Demucs and write stems + an instrumental mix as WAVs into out_dir."""
    # Imported lazily so the module (and unit tests of siblings) load without torch present.
    import torch
    from demucs.api import Separator, save_audio

    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("demucs: model=%s device=%s file=%s", model, device, audio_path.name)

    try:
        separator = Separator(model=model, device=device)
        _, sources = separator.separate_audio_file(str(audio_path))
    except (RuntimeError, NotImplementedError) as e:
        # MPS occasionally lacks an op; fall back to CPU rather than failing the job.
        if device != "cpu":
            log.warning("demucs on %s failed (%s); retrying on cpu", device, e)
            separator = Separator(model=model, device="cpu")
            _, sources = separator.separate_audio_file(str(audio_path))
        else:
            raise

    sr = separator.samplerate
    stems: dict[str, Path] = {}
    for name, tensor in sources.items():
        path = out_dir / f"{name}.wav"
        save_audio(tensor, str(path), samplerate=sr)
        stems[name] = path

    # Instrumental = sum of every stem except vocals.
    non_vocal = [t for n, t in sources.items() if n != "vocals"]
    instrumental_path = out_dir / "instrumental.wav"
    if non_vocal:
        mix = torch.stack(non_vocal).sum(dim=0)
        save_audio(mix, str(instrumental_path), samplerate=sr)
    else:  # single-stem model edge case
        instrumental_path = stems.get("other", next(iter(stems.values())))

    log.info("demucs: wrote %d stems + instrumental", len(stems))
    return SeparationResult(stems=stems, instrumental=instrumental_path, samplerate=sr)
