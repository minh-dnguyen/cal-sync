"""Google Calendar OAuth2 + API client (httpx-based, no google-client library needed)."""

from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.config import settings

SCOPES = "https://www.googleapis.com/auth/calendar.readonly"
_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo"
_CALENDAR_API = "https://www.googleapis.com/calendar/v3"


def build_auth_url() -> str:
    """Return the Google OAuth2 authorization URL to redirect the user to."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",  # always re-consent so we always get a refresh token
    }
    return f"{_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens.

    Returns a dict with at least:
      access_token, refresh_token (may be absent on re-auth), expires_in (int, seconds)
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            _TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Use a refresh token to obtain a new access token.

    Returns a dict with access_token, expires_in, and optionally a new refresh_token.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            _TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_user_email(access_token: str) -> Optional[str]:
    """Return the Google account email associated with this access token."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            _USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            return resp.json().get("email")
    return None


async def revoke_token(token: str) -> None:
    """Revoke an access or refresh token (best-effort; ignore errors)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(_REVOKE_URL, params={"token": token})


async def get_primary_calendar_color(access_token: str) -> Optional[str]:
    """Return the background color hex of the user's primary Google Calendar.

    Returns None on any error (non-critical; caller should treat as optional).
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_CALENDAR_API}/users/me/calendarList/primary",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            return resp.json().get("backgroundColor")
    return None


async def fetch_event_colors(access_token: str) -> dict[str, str]:
    """Fetch the event color map from Google Calendar's /colors endpoint.

    Returns a dict mapping colorId (e.g. "1") to background hex (e.g. "#7986CB").
    Falls back to the static GOOGLE_EVENT_COLORS dict on any error.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_CALENDAR_API}/colors",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            event_colors = resp.json().get("event", {})
            return {
                color_id: data["background"]
                for color_id, data in event_colors.items()
                if "background" in data
            }
    return GOOGLE_EVENT_COLORS


async def fetch_events(
    access_token: str,
    refresh_token: Optional[str],
    time_min: datetime,
    time_max: datetime,
) -> tuple[list[dict], str]:
    """Fetch all events from the user's primary Google Calendar.

    Handles a single automatic token refresh on 401.

    Returns:
        (events, valid_access_token) — the second element is the token that
        succeeded (may be a freshly refreshed one so the caller can persist it).
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "timeMin": time_min.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timeMax": time_max.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": "2500",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{_CALENDAR_API}/calendars/primary/events",
            headers=headers,
            params=params,
        )

        # If expired, try refreshing once
        if resp.status_code == 401 and refresh_token:
            new_tokens = await refresh_access_token(refresh_token)
            access_token = new_tokens["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            resp = await client.get(
                f"{_CALENDAR_API}/calendars/primary/events",
                headers=headers,
                params=params,
            )

        resp.raise_for_status()
        return resp.json().get("items", []), access_token


# ── Event color mapping ───────────────────────────────────────────────────────

# Google Calendar event colorId → hex (from the Calendar API /colors endpoint)
GOOGLE_EVENT_COLORS: dict[str, str] = {
    "1":  "#7986CB",  # Lavender
    "2":  "#33B679",  # Sage
    "3":  "#8E24AA",  # Grape
    "4":  "#E67C73",  # Flamingo
    "5":  "#F6BF26",  # Banana
    "6":  "#F4511E",  # Tangerine
    "7":  "#039BE5",  # Peacock
    "8":  "#616161",  # Graphite
    "9":  "#3F51B5",  # Blueberry
    "10": "#0B8043",  # Basil
    "11": "#D50000",  # Tomato
}


def google_color_hex(color_id: Optional[str]) -> Optional[str]:
    """Return the hex color for a Google Calendar colorId, or None if unset."""
    if not color_id:
        return None
    return GOOGLE_EVENT_COLORS.get(color_id)


# ── Event mapping ─────────────────────────────────────────────────────────────

def parse_google_event(g_event: dict) -> Optional[dict]:
    """Map a Google Calendar event object to the CalSync event shape.

    Returns None for cancelled events or events that cannot be parsed.
    Includes `color_id` so the caller can decide whether to apply it.
    """
    if g_event.get("status") == "cancelled":
        return None

    summary = g_event.get("summary") or "(No title)"
    description = g_event.get("description")
    external_id = f"google_{g_event['id']}"
    color_id = g_event.get("colorId")  # e.g. "1" … "11", absent means default

    start_raw = g_event.get("start", {})
    end_raw = g_event.get("end", {})

    all_day = "date" in start_raw and "dateTime" not in start_raw

    try:
        if all_day:
            start_dt = datetime.fromisoformat(start_raw["date"]).replace(
                hour=0, minute=0, second=0, tzinfo=timezone.utc
            )
            end_dt = datetime.fromisoformat(end_raw["date"]).replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
        else:
            start_dt = datetime.fromisoformat(start_raw["dateTime"]).astimezone(timezone.utc)
            end_dt = datetime.fromisoformat(end_raw["dateTime"]).astimezone(timezone.utc)
    except (KeyError, ValueError):
        return None

    return {
        "title": summary,
        "description": description,
        "start_time": start_dt,
        "end_time": end_dt,
        "all_day": all_day,
        "external_id": external_id,
        "color_id": color_id,  # raw Google colorId — caller maps to hex if desired
    }


def token_expiry(expires_in: int) -> datetime:
    """Return the absolute expiry datetime given seconds-from-now."""
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)
