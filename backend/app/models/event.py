import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class EventSource(str, enum.Enum):
    local = "local"
    google = "google"
    outlook = "outlook"
    holiday = "holiday"


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    calendar_source_id = Column(
        UUID(as_uuid=True),
        ForeignKey("calendar_sources.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    all_day = Column(Boolean, default=False)
    color = Column(String(7), nullable=True)  # Override source color per event
    # RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    rrule = Column(String, nullable=True)
    source = Column(SAEnum(EventSource), default=EventSource.local)
    # Original ID from Google Calendar / Outlook — used to avoid duplicates
    external_id = Column(String, nullable=True, index=True)
    reminder_minutes = Column(Integer, nullable=True)  # e.g. 15 = notify 15 min before
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="events")
    calendar_source = relationship("CalendarSource", back_populates="events")
