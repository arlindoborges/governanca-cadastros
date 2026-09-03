from pydantic import BaseModel


class MessageResponse(BaseModel):
    data: dict[str, str]
