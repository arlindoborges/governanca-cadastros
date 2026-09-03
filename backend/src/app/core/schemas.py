from pydantic import BaseModel


class ProcessingJobStatus(BaseModel):
    status: str
    processed: int
    total: int
    percent: int
    message: str


class ProcessingJobStatusResponse(BaseModel):
    data: ProcessingJobStatus
