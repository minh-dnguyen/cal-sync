from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.models.event import Event, EventSource
from app.models.user import User

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
def list_events(
    start: Optional[datetime] = Query(None, description="Filter events starting at or after this time"),
    end: Optional[datetime] = Query(None, description="Filter events ending at or before this time"),
    source: Optional[str] = Query(None, description="Filter by source (local, google, outlook, holiday)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Event).filter(Event.user_id == current_user.id, Event.is_deleted == False)

    if start:
        q = q.filter(Event.end_time >= start)
    if end:
        q = q.filter(Event.start_time <= end)
    if source:
        q = q.filter(Event.source == source)

    return q.order_by(Event.start_time).all()


@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.start_time >= body.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    event = Event(
        user_id=current_user.id,
        source=EventSource.local,
        **body.model_dump(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id, Event.is_deleted == False)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: UUID,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id, Event.is_deleted == False)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    updates = body.model_dump(exclude_none=True)
    if "start_time" in updates or "end_time" in updates:
        start = updates.get("start_time", event.start_time)
        end = updates.get("end_time", event.end_time)
        if start >= end:
            raise HTTPException(status_code=400, detail="start_time must be before end_time")

    for field, value in updates.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id, Event.is_deleted == False)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Soft-delete so external events from Google/Outlook can be re-fetched
    event.is_deleted = True
    db.commit()
