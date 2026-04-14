from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.event import EventSource


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    color: str | None = None
    rrule: str | None = None  # RFC 5545 RRULE string
    reminder_minutes: int | None = None
    calendar_source_id: UUID | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    all_day: bool | None = None
    color: str | None = None
    rrule: str | None = None
    reminder_minutes: int | None = None
    calendar_source_id: UUID | None = None


class EventResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    start_time: datetime
    end_time: datetime
    all_day: bool
    color: str | None
    rrule: str | None
    source: EventSource
    external_id: str | None
    reminder_minutes: int | None
    calendar_source_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
