from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.calendar_source import SourceType


class CalendarSourceResponse(BaseModel):
    id: UUID
    name: str
    source_type: SourceType
    is_visible: bool
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateCalendarSourceRequest(BaseModel):
    name: str | None = None
    is_visible: bool | None = None
    color: str | None = None
