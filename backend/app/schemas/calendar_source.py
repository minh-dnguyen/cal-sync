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
    connected_email: str | None = None
    keep_source_colors: bool = False

    model_config = {"from_attributes": True}


class UpdateCalendarSourceRequest(BaseModel):
    name: str | None = None
    is_visible: bool | None = None
    color: str | None = None
    keep_source_colors: bool | None = None


class SyncHolidaysRequest(BaseModel):
    """Body for POST /calendar-sources/holidays/sync."""
    country_code: str | None = None


class GoogleExchangeRequest(BaseModel):
    """Body for POST /auth/google/exchange."""
    code: str
    keep_source_colors: bool = False


class GoogleSyncResponse(BaseModel):
    synced: int
    source: CalendarSourceResponse


class OutlookExchangeRequest(BaseModel):
    """Body for POST /auth/outlook/exchange."""
    code: str
    keep_source_colors: bool = False


class OutlookSyncResponse(BaseModel):
    synced: int
    source: CalendarSourceResponse
