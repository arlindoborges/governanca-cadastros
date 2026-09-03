from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass
class ProcessingJob:
    status: str
    processed: int = 0
    total: int = 0
    message: str = ""
    result: Any | None = None
    error: str | None = None


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
        )


def set_running(key: str, total: int, message: str) -> ProcessingJob:
    with _lock:
        job = ProcessingJob(status="RUNNING", processed=0, total=total, message=message)
        _jobs[key] = job
        return ProcessingJob(
            status=job.status,
            processed=job.processed,
            total=job.total,
            message=job.message,
        )


def update_progress(key: str, processed: int, total: int, message: str) -> None:
    with _lock:
        job = _jobs.get(key)
        if job is None or job.status != "RUNNING":
            return
        job.processed = processed
        job.total = total
        job.message = message


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


def fail(key: str, error: str) -> None:
    with _lock:
        job = _jobs.get(key)
        if job is None:
            return
        job.status = "FAILED"
        job.message = error
        job.error = error


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
