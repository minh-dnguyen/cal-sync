import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ThemePreference(str, enum.Enum):
    light = "light"
    dark = "dark"
    system = "system"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    # ISO 3166-1 alpha-2 (e.g. "US", "VN"). Auto-detected from browser locale on signup.
    country_code = Column(String(2), nullable=True)
    timezone = Column(String, default="UTC")
    theme = Column(SAEnum(ThemePreference), default=ThemePreference.system)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    calendar_sources = relationship(
        "CalendarSource", back_populates="user", cascade="all, delete-orphan"
    )
