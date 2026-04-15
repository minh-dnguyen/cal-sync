from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.schemas.calendar_source import (
    CalendarSourceResponse,
    UpdateCalendarSourceRequest,
    SyncHolidaysRequest,
)
from app.models.calendar_source import CalendarSource, SourceType
from app.models.event import Event, EventSource
from app.models.user import User
from app.services.holiday_service import fetch_public_holidays
from typing import List

router = APIRouter(prefix="/calendar-sources", tags=["calendar-sources"])


@router.get("", response_model=List[CalendarSourceResponse])
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CalendarSource)
        .filter(CalendarSource.user_id == current_user.id)
        .order_by(CalendarSource.created_at)
        .all()
    )


@router.post("/holidays/sync", response_model=CalendarSourceResponse)
async def sync_holidays(
    body: SyncHolidaysRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch public holidays from Nager.Date and upsert them as all-day events.

    - Creates (or reuses) a holiday CalendarSource for the user.
    - Syncs the current year and next year.
    - Uses external_id to avoid duplicates on repeated calls.
    """
    country_code = (body.country_code or current_user.country_code or "US").upper()

    # ── Get or create the holiday CalendarSource ──────────────────────────────
    holiday_source = (
        db.query(CalendarSource)
        .filter(
            CalendarSource.user_id == current_user.id,
            CalendarSource.source_type == SourceType.holiday,
        )
        .first()
    )

    region_names = {
        "US": "United States", "VN": "Vietnam", "GB": "United Kingdom",
        "DE": "Germany", "FR": "France", "JP": "Japan", "KR": "South Korea",
        "CN": "China", "IN": "India", "BR": "Brazil", "AU": "Australia",
        "CA": "Canada", "RU": "Russia",
    }
    source_name = f"Holidays in {region_names.get(country_code, country_code)}"

    if not holiday_source:
        holiday_source = CalendarSource(
            user_id=current_user.id,
            name=source_name,
            source_type=SourceType.holiday,
            color="#EF4444",
            is_visible=True,
        )
        db.add(holiday_source)
        db.flush()
    else:
        holiday_source.name = source_name
        holiday_source.is_visible = True

    # ── Fetch this year + next year from Nager.Date ───────────────────────────
    current_year = datetime.now(timezone.utc).year
    all_holidays: list[dict] = []
    for year in (current_year, current_year + 1):
        holidays = await fetch_public_holidays(year, country_code)
        all_holidays.extend(holidays)

    if not all_holidays:
        # Country not supported by Nager.Date — still return the source
        db.commit()
        db.refresh(holiday_source)
        return holiday_source

    # ── Upsert holiday events ─────────────────────────────────────────────────
    for h in all_holidays:
        # Only include nationwide (global) holidays
        if not h.get("global", True):
            continue

        date_str: str = h["date"]  # "YYYY-MM-DD"
        external_id = f"holiday_{country_code}_{date_str}"

        start = datetime.fromisoformat(date_str).replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
        )
        end = start.replace(hour=23, minute=59, second=59)
        title = h.get("localName") or h.get("name") or "Holiday"

        existing = (
            db.query(Event)
            .filter(
                Event.external_id == external_id,
                Event.user_id == current_user.id,
            )
            .first()
        )

        if existing:
            # Restore and refresh in case country or name changed
            existing.is_deleted = False
            existing.title = title
            existing.start_time = start
            existing.end_time = end
            existing.calendar_source_id = holiday_source.id
        else:
            db.add(
                Event(
                    user_id=current_user.id,
                    calendar_source_id=holiday_source.id,
                    title=title,
                    start_time=start,
                    end_time=end,
                    all_day=True,
                    source=EventSource.holiday,
                    external_id=external_id,
                )
            )

    db.commit()
    db.refresh(holiday_source)
    return holiday_source


@router.patch("/{source_id}", response_model=CalendarSourceResponse)
def update_source(
    source_id: UUID,
    body: UpdateCalendarSourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = (
        db.query(CalendarSource)
        .filter(CalendarSource.id == source_id, CalendarSource.user_id == current_user.id)
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Calendar source not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(source, field, value)
    db.commit()
    db.refresh(source)
    return source
