import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class SourceType(str, enum.Enum):
    local = "local"
    google = "google"
    outlook = "outlook"
    holiday = "holiday"


class CalendarSource(Base):
    __tablename__ = "calendar_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    source_type = Column(SAEnum(SourceType), nullable=False)
    is_visible = Column(Boolean, default=True)
    color = Column(String(7), default="#6366F1")  # Indigo default
    # Phase 3-4: OAuth tokens — store encrypted in production
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    connected_email = Column(String, nullable=True)  # Google/Outlook account email
    keep_source_colors = Column(Boolean, default=False)  # Preserve original event colors from provider
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="calendar_sources")
    events = relationship("Event", back_populates="calendar_source")
