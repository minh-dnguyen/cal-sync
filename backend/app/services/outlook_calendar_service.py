"""Microsoft Outlook Calendar OAuth2 + Graph API client (httpx-based, no MSAL library needed)."""

from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.config import settings

# Microsoft Identity Platform v2.0 endpoints
_AUTH_URL  = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
_GRAPH_API = "https://graph.microsoft.com/v1.0"

# offline_access is required to receive a refresh_token.
# Calendars.Read grants read-only access to the user's calendar events.
SCOPES = "offline_access https://graph.microsoft.com/Calendars.Read"

# Maps Microsoft Graph categoryColor preset values to hex colors.
OUTLOOK_PRESET_COLORS: dict[str, str] = {
    "preset0":  "#e74856",
    "preset1":  "#ff8c00",
    "preset2":  "#fce100",
    "preset3":  "#00b294",
    "preset4":  "#038387",
    "preset5":  "#ca5010",
    "preset6":  "#0078d4",
    "preset7":  "#8764b8",
    "preset8":  "#c30052",
    "preset9":  "#767676",
    "preset10": "#003b4e",
    "preset11": "#bdbdbd",
    "preset12": "#6d6d6d",
    "preset13": "#1e1e1e",
    "preset14": "#a4262c",
    "preset15": "#8f7034",
    "preset16": "#986f0b",
    "preset17": "#498205",
    "preset18": "#00666d",
    "preset19": "#6b4226",
    "preset20": "#005a9e",
    "preset21": "#32145a",
    "preset22": "#6b0030",
    "preset23": "#00333d",
    "preset24": "#004e33",
}


def build_auth_url() -> str:
    """Return the Microsoft OAuth2 authorization URL to redirect the user to."""
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "response_mode": "query",
        # prompt=consent forces the consent screen so we always receive a refresh_token.
        "prompt": "consent",
    }
    return f"{_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens.

    Returns a dict with at least:
      access_token, refresh_token, expires_in (int, seconds)
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            _TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
                "grant_type": "authorization_code",
                "scope": SCOPES,
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
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "scope": SCOPES,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_category_colors(access_token: str) -> dict[str, str]:
    """Return a mapping of category display name (lowercase) → hex color.

    Calls /me/outlook/masterCategories to get the user's category list,
    then resolves each preset value to a hex color via OUTLOOK_PRESET_COLORS.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_GRAPH_API}/me/outlook/masterCategories",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            return {}
        categories = resp.json().get("value", [])

    result: dict[str, str] = {}
    for cat in categories:
        name = cat.get("displayName", "")
        color_preset = cat.get("color", "none")
        hex_color = OUTLOOK_PRESET_COLORS.get(color_preset)
        if name and hex_color:
            result[name.lower()] = hex_color
    return result


async def get_calendar_color(access_token: str) -> Optional[str]:
    """Return the hex color of the user's primary Outlook calendar, or None."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_GRAPH_API}/me/calendar",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            hex_color = resp.json().get("hexColor")
            if hex_color and hex_color != "auto":
                return hex_color if hex_color.startswith("#") else f"#{hex_color}"
    return None


async def get_user_email(access_token: str) -> Optional[str]:
    """Return the Microsoft account email associated with this access token.

    The Graph /me endpoint returns `mail` for most accounts and
    `userPrincipalName` as a fallback for accounts without a mail field.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_GRAPH_API}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("mail") or data.get("userPrincipalName")
    return None


async def revoke_token(access_token: str) -> None:
    """Revoke all active sessions for the signed-in user (best-effort; ignores errors).

    Microsoft does not have a simple token-invalidation endpoint like Google.
    Calling revokeSignInSessions invalidates all refresh tokens for the account.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"{_GRAPH_API}/me/revokeSignInSessions",
            headers={"Authorization": f"Bearer {access_token}"},
        )


async def fetch_events(
    access_token: str,
    refresh_token: Optional[str],
    time_min: datetime,
    time_max: datetime,
) -> tuple[list[dict], str, Optional[str]]:
    """Fetch all events from the user's primary Outlook calendar.

    Uses Microsoft Graph /me/calendarView with automatic token refresh on 401.
    Follows @odata.nextLink to retrieve all pages.

    Returns:
        (events, valid_access_token, new_refresh_token) — tokens may be refreshed.
        new_refresh_token is None if no refresh occurred.
    """
    # Graph API requires ISO 8601 with timezone suffix
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    start_str = time_min.astimezone(timezone.utc).strftime(fmt)
    end_str   = time_max.astimezone(timezone.utc).strftime(fmt)

    params = {
        "startDateTime": start_str,
        "endDateTime":   end_str,
        "$select": "id,subject,start,end,isAllDay,isCancelled,bodyPreview,categories",
        "$top": "999",
    }

    headers = {"Authorization": f"Bearer {access_token}"}
    all_events: list[dict] = []
    new_refresh_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{_GRAPH_API}/me/calendarView"

        while url:
            resp = await client.get(
                url,
                headers=headers,
                # Only send params on the first request; nextLink already contains them
                params=params if url == f"{_GRAPH_API}/me/calendarView" else None,
            )

            # Single automatic token refresh on 401
            if resp.status_code == 401 and refresh_token:
                new_tokens = await refresh_access_token(refresh_token)
                access_token = new_tokens["access_token"]
                new_refresh_token = new_tokens.get("refresh_token")
                headers = {"Authorization": f"Bearer {access_token}"}
                resp = await client.get(
                    url,
                    headers=headers,
                    params=params if url == f"{_GRAPH_API}/me/calendarView" else None,
                )

            resp.raise_for_status()
            body = resp.json()
            all_events.extend(body.get("value", []))
            url = body.get("@odata.nextLink")  # None when last page reached

    return all_events, access_token, new_refresh_token


def parse_outlook_event(o_event: dict) -> Optional[dict]:
    """Map a Microsoft Graph calendar event object to the CalSync event shape.

    Returns None for cancelled events or events that cannot be parsed.
    """
    if o_event.get("isCancelled"):
        return None

    title = o_event.get("subject") or "(No title)"
    description = o_event.get("bodyPreview") or None
    external_id = f"outlook_{o_event['id']}"

    all_day: bool = o_event.get("isAllDay", False)

    start_raw = o_event.get("start", {})
    end_raw   = o_event.get("end", {})

    try:
        if all_day:
            # Microsoft sends all-day times as midnight in the event's local timezone.
            # Normalize to a UTC full-day span.
            start_dt = datetime.fromisoformat(start_raw["dateTime"].rstrip("Z")).replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
            )
            end_dt = start_dt.replace(hour=23, minute=59, second=59)
        else:
            raw = start_raw["dateTime"].rstrip("Z")
            start_dt = datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
            raw = end_raw["dateTime"].rstrip("Z")
            end_dt = datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
    except (KeyError, ValueError):
        return None

    # Preserve all category names; first one (lowercased) is used for color lookup
    categories: list[str] = o_event.get("categories") or []
    first_category = categories[0].lower() if categories else None

    return {
        "title": title,
        "description": description,
        "start_time": start_dt,
        "end_time": end_dt,
        "all_day": all_day,
        "external_id": external_id,
        "category": first_category,          # lowercase, for color map lookup
        "categories_raw": categories,         # original casing, for storage
    }


def token_expiry(expires_in: int) -> datetime:
    """Return the absolute expiry datetime given seconds-from-now."""
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)
