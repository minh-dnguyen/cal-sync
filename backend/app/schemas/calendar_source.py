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


class SyncHolidaysRequest(BaseModel):
    """Body for POST /calendar-sources/holidays/sync.

    country_code: ISO 3166-1 alpha-2 code (e.g. "US", "VN").
    Falls back to the authenticated user's stored country_code when omitted.
    """
    country_code: str | None = None
