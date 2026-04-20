import json
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.schemas.calendar_source import (
    CalendarSourceResponse,
    UpdateCalendarSourceRequest,
    SyncHolidaysRequest,
    GoogleSyncResponse,
    OutlookSyncResponse,
)
from app.models.calendar_source import CalendarSource, SourceType
from app.models.event import Event, EventSource
from app.models.user import User
from app.services.holiday_service import fetch_public_holidays
from app.services import google_calendar_service as gcs
from app.services import outlook_calendar_service as ocs
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


@router.post("/{source_id}/sync", response_model=GoogleSyncResponse)
async def sync_source(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch events from a connected Google or Outlook calendar and upsert them.

    Syncs 1 year back and 1 year forward from today.
    Uses external_id to avoid duplicates on repeated runs.
    """
    source = (
        db.query(CalendarSource)
        .filter(
            CalendarSource.id == source_id,
            CalendarSource.user_id == current_user.id,
            CalendarSource.source_type.in_([SourceType.google, SourceType.outlook]),
        )
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Calendar source not found")

    if not source.access_token:
        raise HTTPException(status_code=400, detail="Calendar not connected")

    now = datetime.now(timezone.utc)
    time_min = now - timedelta(days=365)
    time_max = now + timedelta(days=365)

    # ── Google sync ───────────────────────────────────────────────────────────
    if source.source_type == SourceType.google:
        try:
            raw_events, fresh_token = await gcs.fetch_events(
                source.access_token, source.refresh_token, time_min, time_max,
            )
        except Exception:
            raise HTTPException(status_code=502, detail="Failed to fetch events from Google Calendar")

        if fresh_token != source.access_token:
            source.access_token = fresh_token
            db.flush()

        colors_map: dict = {}
        if source.keep_source_colors:
            try:
                colors_map = await gcs.fetch_event_colors(fresh_token)
            except Exception:
                colors_map = {}
            try:
                cal_color = await gcs.get_primary_calendar_color(fresh_token)
                if cal_color:
                    source.color = cal_color
            except Exception:
                pass

        synced = 0
        for raw in raw_events:
            parsed = gcs.parse_google_event(raw)
            if parsed is None:
                continue

            color_id = parsed["color_id"]
            event_color = colors_map.get(color_id) if (source.keep_source_colors and color_id) else None

            existing = (
                db.query(Event)
                .filter(Event.external_id == parsed["external_id"], Event.user_id == current_user.id)
                .first()
            )
            if existing:
                existing.is_deleted = False
                existing.title = parsed["title"]
                existing.description = parsed["description"]
                existing.start_time = parsed["start_time"]
                existing.end_time = parsed["end_time"]
                existing.all_day = parsed["all_day"]
                existing.color = event_color
                existing.calendar_source_id = source.id
            else:
                db.add(Event(
                    user_id=current_user.id,
                    calendar_source_id=source.id,
                    title=parsed["title"],
                    description=parsed["description"],
                    start_time=parsed["start_time"],
                    end_time=parsed["end_time"],
                    all_day=parsed["all_day"],
                    color=event_color,
                    source=EventSource.google,
                    external_id=parsed["external_id"],
                ))
                synced += 1

    # ── Outlook sync ──────────────────────────────────────────────────────────
    else:
        try:
            raw_events, fresh_token, fresh_refresh = await ocs.fetch_events(
                source.access_token, source.refresh_token, time_min, time_max,
            )
        except Exception:
            raise HTTPException(status_code=502, detail="Failed to fetch events from Outlook Calendar")

        if fresh_token != source.access_token:
            source.access_token = fresh_token
            db.flush()
        if fresh_refresh:
            source.refresh_token = fresh_refresh
            db.flush()

        colors_map: dict = {}
        if source.keep_source_colors:
            try:
                colors_map = await ocs.fetch_category_colors(fresh_token)
            except Exception:
                colors_map = {}
            try:
                cal_color = await ocs.get_calendar_color(fresh_token)
                if cal_color:
                    source.color = cal_color
            except Exception:
                pass

        synced = 0
        for raw in raw_events:
            parsed = ocs.parse_outlook_event(raw)
            if parsed is None:
                continue

            category = parsed["category"]
            event_color = colors_map.get(category) if (source.keep_source_colors and category) else None
            categories_raw = parsed["categories_raw"]
            outlook_categories_json = json.dumps(categories_raw) if categories_raw else None

            existing = (
                db.query(Event)
                .filter(Event.external_id == parsed["external_id"], Event.user_id == current_user.id)
                .first()
            )
            if existing:
                existing.is_deleted = False
                existing.title = parsed["title"]
                existing.description = parsed["description"]
                existing.start_time = parsed["start_time"]
                existing.end_time = parsed["end_time"]
                existing.all_day = parsed["all_day"]
                existing.color = event_color
                existing.calendar_source_id = source.id
                existing.outlook_categories = outlook_categories_json
            else:
                db.add(Event(
                    user_id=current_user.id,
                    calendar_source_id=source.id,
                    title=parsed["title"],
                    description=parsed["description"],
                    start_time=parsed["start_time"],
                    end_time=parsed["end_time"],
                    all_day=parsed["all_day"],
                    color=event_color,
                    source=EventSource.outlook,
                    external_id=parsed["external_id"],
                    outlook_categories=outlook_categories_json,
                ))
                synced += 1

    db.commit()
    db.refresh(source)
    return GoogleSyncResponse(synced=synced, source=source)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect a Google (or other OAuth) calendar source.

    Revokes the token with Google, soft-deletes the events, and removes the source.
    """
    source = (
        db.query(CalendarSource)
        .filter(
            CalendarSource.id == source_id,
            CalendarSource.user_id == current_user.id,
        )
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Calendar source not found")

    # Revoke the OAuth token (best-effort, provider-specific)
    if source.source_type == SourceType.google:
        token = source.refresh_token or source.access_token
        if token:
            await gcs.revoke_token(token)
    elif source.source_type == SourceType.outlook:
        if source.access_token:
            await ocs.revoke_token(source.access_token)

    # Soft-delete all events from this source
    db.query(Event).filter(
        Event.calendar_source_id == source_id,
        Event.user_id == current_user.id,
    ).update({"is_deleted": True})

    db.delete(source)
    db.commit()


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
