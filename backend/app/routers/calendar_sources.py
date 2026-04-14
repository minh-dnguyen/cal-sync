from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.schemas.calendar_source import CalendarSourceResponse, UpdateCalendarSourceRequest
from app.models.calendar_source import CalendarSource
from app.models.user import User
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
