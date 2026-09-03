from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

STALE_AFTER_SECONDS = 45.0


@dataclass
class ProcessingJob:
    status: str
    processed: int = 0
    total: int = 0
    message: str = ""
    result: Any | None = None
    error: str | None = None
    updated_at: float = field(default_factory=time.monotonic)


_lock = threading.Lock()
_jobs: dict[str, ProcessingJob] = {}


def job_key(scope: str, organization_id: UUID, resource_id: UUID) -> str:
    return f"{scope}:{organization_id}:{resource_id}"


def get_job(key: str) -> ProcessingJob | None:
    with _lock:
        job = _jobs.get(key)
        if job is None:
            return None
        return ProcessingJob(
            status=job.status,
            processed=job.processed,
            total=job.total,
            message=job.message,
            result=job.result,
            error=job.error,
            updated_at=job.updated_at,
        )


def set_running(key: str, total: int, message: str) -> ProcessingJob:
    with _lock:
        now = time.monotonic()
        job = ProcessingJob(
            status="RUNNING",
            processed=0,
            total=total,
            message=message,
            updated_at=now,
        )
        _jobs[key] = job
        return ProcessingJob(
            status=job.status,
            processed=job.processed,
            total=job.total,
            message=job.message,
            updated_at=job.updated_at,
        )


def is_stale(job: ProcessingJob) -> bool:
    return (time.monotonic() - job.updated_at) >= STALE_AFTER_SECONDS


def mark_job_stale(key: str) -> None:
    with _lock:
        job = _jobs.get(key)
        if job is not None:
            job.updated_at = 0.0


def spawn_job(func: Callable[..., None], *args: Any) -> None:
    thread = threading.Thread(
        target=func,
        args=args,
        name=getattr(func, "__name__", "job"),
        daemon=True,
    )
    thread.start()


def update_progress(key: str, processed: int, total: int, message: str) -> None:
    with _lock:
        job = _jobs.get(key)
        if job is None or job.status != "RUNNING":
            return
        job.processed = processed
        job.total = total
        job.message = message
        job.updated_at = time.monotonic()


def complete(key: str, result: Any, message: str = "Processamento concluído.") -> None:
    with _lock:
        job = _jobs.get(key)
        if job is None:
            return
        job.status = "COMPLETED"
        job.processed = job.total
        job.message = message
        job.result = result
        job.error = None
        job.updated_at = time.monotonic()


def fail(key: str, error: str) -> None:
    with _lock:
        job = _jobs.get(key)
        if job is None:
            return
        job.status = "FAILED"
        job.message = error
        job.error = error
        job.updated_at = time.monotonic()


def percent_for(job: ProcessingJob) -> int:
    if job.total <= 0:
        return 0 if job.status == "RUNNING" else 100
    return min(100, round((job.processed / job.total) * 100))


def status_payload(job: ProcessingJob) -> dict[str, int | str]:
    return {
        "status": job.status,
        "processed": job.processed,
        "total": job.total,
        "percent": percent_for(job),
        "message": job.message,
    }


def clear_job(key: str) -> None:
    with _lock:
        _jobs.pop(key, None)
