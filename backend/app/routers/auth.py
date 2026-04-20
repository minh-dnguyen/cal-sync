from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.schemas.calendar_source import CalendarSourceResponse, GoogleExchangeRequest, OutlookExchangeRequest
from app.models.user import User
from app.models.calendar_source import CalendarSource, SourceType
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.services import google_calendar_service as gcs
from app.services import outlook_calendar_service as ocs

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        country_code=body.country_code,
        timezone=body.timezone,
    )
    db.add(user)
    db.flush()  # get user.id before creating the source

    # Create the default "Personal" local calendar for every new user
    personal = CalendarSource(
        user_id=user.id,
        name="Personal",
        source_type=SourceType.local,
        color="#6366F1",
    )
    db.add(personal)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


# ── Phase 3: Google Calendar OAuth ───────────────────────────────────────────

@router.get("/google/init")
def google_init(redirect_uri: str | None = None, current_user: User = Depends(get_current_user)):
    """Return the Google OAuth2 authorization URL for the frontend to redirect to."""
    auth_url = gcs.build_auth_url(redirect_uri=redirect_uri)
    return {"auth_url": auth_url}


@router.post("/google/exchange", response_model=CalendarSourceResponse, status_code=status.HTTP_200_OK)
async def google_exchange(
    body: GoogleExchangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange a Google OAuth2 authorization code for tokens.

    Creates a new Google CalendarSource (or updates an existing one) and
    immediately syncs the user's primary Google Calendar events.
    """
    # Exchange the auth code for tokens
    try:
        token_data = await gcs.exchange_code(body.code, redirect_uri=body.redirect_uri)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to exchange Google authorization code")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received from Google")

    # Fetch the Google account email to label the source
    connected_email = await gcs.get_user_email(access_token)
    source_name = f"Google Calendar ({connected_email})" if connected_email else "Google Calendar"

    # Get or create the Google CalendarSource for this user
    google_source = (
        db.query(CalendarSource)
        .filter(
            CalendarSource.user_id == current_user.id,
            CalendarSource.source_type == SourceType.google,
        )
        .first()
    )

    if google_source:
        google_source.access_token = access_token
        if refresh_token:
            google_source.refresh_token = refresh_token
        google_source.token_expires_at = gcs.token_expiry(expires_in)
        google_source.connected_email = connected_email
        google_source.name = source_name
        google_source.is_visible = True
        google_source.keep_source_colors = body.keep_source_colors
    else:
        google_source = CalendarSource(
            user_id=current_user.id,
            name=source_name,
            source_type=SourceType.google,
            color="#4285F4",
            is_visible=True,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=gcs.token_expiry(expires_in),
            connected_email=connected_email,
            keep_source_colors=body.keep_source_colors,
        )
        db.add(google_source)

    db.commit()
    db.refresh(google_source)
    return google_source


# ── Phase 4: Microsoft Outlook Calendar OAuth ─────────────────────────────────

@router.get("/outlook/init")
def outlook_init(redirect_uri: str | None = None, current_user: User = Depends(get_current_user)):
    """Return the Microsoft OAuth2 authorization URL for the frontend to redirect to."""
    auth_url = ocs.build_auth_url(redirect_uri=redirect_uri)
    return {"auth_url": auth_url}


@router.post("/outlook/exchange", response_model=CalendarSourceResponse, status_code=status.HTTP_200_OK)
async def outlook_exchange(
    body: OutlookExchangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exchange a Microsoft OAuth2 authorization code for tokens.

    Creates a new Outlook CalendarSource (or updates an existing one).
    """
    try:
        token_data = await ocs.exchange_code(body.code, redirect_uri=body.redirect_uri)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to exchange Outlook authorization code")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received from Microsoft")

    connected_email = await ocs.get_user_email(access_token)
    source_name = f"Outlook Calendar ({connected_email})" if connected_email else "Outlook Calendar"

    outlook_source = (
        db.query(CalendarSource)
        .filter(
            CalendarSource.user_id == current_user.id,
            CalendarSource.source_type == SourceType.outlook,
        )
        .first()
    )

    if outlook_source:
        outlook_source.access_token = access_token
        if refresh_token:
            outlook_source.refresh_token = refresh_token
        outlook_source.token_expires_at = ocs.token_expiry(expires_in)
        outlook_source.connected_email = connected_email
        outlook_source.name = source_name
        outlook_source.is_visible = True
        outlook_source.keep_source_colors = body.keep_source_colors
    else:
        outlook_source = CalendarSource(
            user_id=current_user.id,
            name=source_name,
            source_type=SourceType.outlook,
            color="#0078D4",
            is_visible=True,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=ocs.token_expiry(expires_in),
            connected_email=connected_email,
            keep_source_colors=body.keep_source_colors,
        )
        db.add(outlook_source)

    db.commit()
    db.refresh(outlook_source)
    return outlook_source
