"""Firestore job queue + Storage I/O (firebase-admin).

The worker PULLS jobs — it opens an outbound connection to Firebase and claims queued docs
in a transaction. No inbound ports, so it runs fine on a home Mac mini behind NAT or any
cloud box, without the Cloudflare-Access tunnel the Hermes chat proxy needs.

Job doc shape (collection = JOBS_COLLECTION, written by the app / Cloud Function):
    {
      ownerUid: str,
      status: 'queued' | 'processing' | 'done' | 'error',
      audioPath: 'imports/{uid}/{jobId}/original.<ext>',   # Storage object
      fileName: str,
      createdAt, updatedAt, progress?: 0..100,
      result?: {...}, error?: str,
    }
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.firestore_v1 import transactional

log = logging.getLogger("worker.firebase")


@dataclass
class Job:
    id: str
    owner_uid: str
    audio_path: str
    file_name: str


class FirebaseIO:
    def __init__(self, cfg):
        self.cfg = cfg
        opts = {"storageBucket": cfg.storage_bucket, "projectId": cfg.project_id}
        cred = credentials.Certificate(cfg.credentials_path) if cfg.credentials_path else None
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, opts)
        self.db = firestore.client()
        self.bucket = storage.bucket()
        self.col = self.db.collection(cfg.jobs_collection)

    # ---- queue ----
    def claim_next(self) -> Job | None:
        """Atomically move one 'queued' job to 'processing' and return it (or None)."""
        docs = list(self.col.where("status", "==", "queued")
                    .order_by("createdAt").limit(5).stream())
        for snap in docs:
            job = self._try_claim(snap.reference)
            if job:
                return job
        return None

    def _try_claim(self, ref) -> Job | None:
        tx = self.db.transaction()

        @transactional
        def claim(tx) -> Job | None:
            snap = ref.get(transaction=tx)
            data = snap.to_dict() or {}
            if data.get("status") != "queued":
                return None  # someone else grabbed it
            tx.update(ref, {"status": "processing", "progress": 1,
                            "updatedAt": firestore.SERVER_TIMESTAMP})
            return Job(id=snap.id, owner_uid=data.get("ownerUid", ""),
                       audio_path=data.get("audioPath", ""), file_name=data.get("fileName", ""))

        try:
            return claim(tx)
        except Exception as e:
            log.warning("claim failed for %s: %s", ref.id, e)
            return None

    def set_progress(self, job_id: str, progress: int, note: str = "") -> None:
        patch = {"progress": progress, "updatedAt": firestore.SERVER_TIMESTAMP}
        if note:
            patch["stage"] = note
        self.col.document(job_id).update(patch)

    def complete(self, job_id: str, result: dict) -> None:
        self.col.document(job_id).update({
            "status": "done", "progress": 100, "result": result,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })

    def fail(self, job_id: str, message: str) -> None:
        self.col.document(job_id).update({
            "status": "error", "error": message[:1000],
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })

    # ---- storage ----
    def download(self, object_path: str, dest: Path) -> Path:
        dest.parent.mkdir(parents=True, exist_ok=True)
        self.bucket.blob(object_path).download_to_filename(str(dest))
        log.info("downloaded %s -> %s", object_path, dest.name)
        return dest

    def upload(self, local: Path, object_path: str, content_type: str = "audio/wav") -> str:
        blob = self.bucket.blob(object_path)
        blob.upload_from_filename(str(local), content_type=content_type)
        log.info("uploaded %s -> %s", local.name, object_path)
        return object_path
