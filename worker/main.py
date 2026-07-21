"""Tig Music audio worker — poll Firestore for import jobs and process them.

Run:  python main.py            # long-running daemon
      python main.py --once     # process at most one job then exit (handy for testing/cron)
"""
from __future__ import annotations

import argparse
import logging
import sys
import time

from config import detect_device, get_config
from firebase_io import FirebaseIO
from process import process_job

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("worker")


def run(once: bool = False) -> None:
    cfg = get_config()
    log.info("device=%s demucs=%s/%s whisper=%s/%s bucket=%s collection=%s",
             detect_device(), cfg.demucs_model, cfg.demucs_device,
             cfg.whisper_model, cfg.whisper_device, cfg.storage_bucket, cfg.jobs_collection)
    io = FirebaseIO(cfg)
    log.info("worker up; polling every %.1fs", cfg.poll_interval_sec)

    while True:
        job = io.claim_next()
        if not job:
            if once:
                log.info("no queued jobs; exiting (--once)")
                return
            time.sleep(cfg.poll_interval_sec)
            continue

        log.info("claimed job %s (%s)", job.id, job.file_name)
        try:
            result = process_job(job, io, cfg)
            io.complete(job.id, result)
            log.info("job %s done", job.id)
        except Exception as e:
            log.exception("job %s failed", job.id)
            io.fail(job.id, f"{type(e).__name__}: {e}")

        if once:
            return


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="process one job then exit")
    args = ap.parse_args()
    try:
        run(once=args.once)
    except KeyboardInterrupt:
        sys.exit(0)
