"""Title/author metadata.

Author of the words & music is not recoverable from raw audio, so we take the honest path:
read embedded ID3/Vorbis tags when the uploaded file has them, otherwise leave author blank.
Title falls back to an optional LLM suggestion from the transcribed lyrics, then the filename.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("worker.metadata")


@dataclass
class SongMeta:
    title: str = ""
    author: str = ""          # from tags only; "" when unknown (never invented)
    title_source: str = ""    # tag | llm | filename
    author_source: str = ""   # tag | ""


def _from_tags(audio_path: Path) -> tuple[str, str]:
    try:
        from mutagen import File as MutagenFile

        f = MutagenFile(str(audio_path), easy=True)
        if not f or not f.tags:
            return "", ""
        title = (f.tags.get("title") or [""])[0]
        artist = (f.tags.get("artist") or f.tags.get("albumartist") or [""])[0]
        return title.strip(), artist.strip()
    except Exception as e:  # pragma: no cover - tag libs vary by format
        log.warning("tag read failed: %s", e)
        return "", ""


def _title_from_lyrics_llm(lyrics: str, base_url: str, model: str, api_key: str) -> str:
    """Ask an OpenAI-compatible chat endpoint (e.g. Ollama) to propose a title. Best-effort."""
    if not base_url or not lyrics.strip():
        return ""
    import requests

    prompt = (
        "Suggest a concise song title (max 6 words) for these lyrics. "
        "Reply with ONLY the title, no quotes.\n\n" + lyrics[:1500]
    )
    try:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        r = requests.post(
            f"{base_url.rstrip('/')}/chat/completions",
            json={"model": model, "messages": [{"role": "user", "content": prompt}],
                  "temperature": 0.4, "max_tokens": 24},
            headers=headers, timeout=30,
        )
        r.raise_for_status()
        title = r.json()["choices"][0]["message"]["content"].strip().strip('"')
        return re.sub(r"\s+", " ", title)[:80]
    except Exception as e:
        log.warning("llm title suggestion failed: %s", e)
        return ""


def resolve_meta(audio_path: Path, original_name: str, lyrics: str,
                 llm_base_url: str, llm_model: str, llm_api_key: str) -> SongMeta:
    title, author = _from_tags(audio_path)
    meta = SongMeta()
    if author:
        meta.author, meta.author_source = author, "tag"
    if title:
        meta.title, meta.title_source = title, "tag"
    else:
        llm_title = _title_from_lyrics_llm(lyrics, llm_base_url, llm_model, llm_api_key)
        if llm_title:
            meta.title, meta.title_source = llm_title, "llm"
        else:
            stem = Path(original_name).stem
            meta.title = re.sub(r"[_\-]+", " ", stem).strip().title()
            meta.title_source = "filename"
    log.info("meta: title=%r (%s) author=%r (%s)",
             meta.title, meta.title_source, meta.author, meta.author_source or "none")
    return meta
