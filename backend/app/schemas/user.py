from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import ThemePreference


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None
    country_code: str | None
    timezone: str
    theme: ThemePreference
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    country_code: str | None = None
    timezone: str | None = None
    theme: ThemePreference | None = None
