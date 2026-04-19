# CalSync — Codebase Guide for New Readers

This document walks you through the entire codebase in the order that makes sense conceptually — from the outermost shell inward to the implementation details. After reading this, you will understand how every file fits together and why it exists.

---

## Project Structure at a Glance

```
calsync/
├── backend/          # FastAPI Python server
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── core/
│       │   ├── security.py
│       │   └── deps.py
│       ├── models/      # SQLAlchemy ORM tables
│       ├── schemas/     # Pydantic request/response shapes
│       ├── routers/     # HTTP route handlers
│       └── services/    # External API clients
└── frontend/         # Next.js 14 App Router
    ├── app/          # Pages and layouts
    ├── components/   # UI components
    ├── contexts/     # React context providers
    ├── hooks/        # TanStack Query hooks
    ├── lib/          # Utilities and API client
    ├── store/        # Zustand global state
    └── types/        # TypeScript type definitions
```

---

## Part 1 — Backend

Read the backend files in this order.

---

### 1. `backend/app/config.py`

**What it is:** The single source of truth for all environment variables.

Uses `pydantic-settings` to load values from a `.env` file. Every other backend file imports the singleton `settings` object from here instead of calling `os.environ` directly.

Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` / `ALGORITHM` — used for signing JWTs
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — Google OAuth credentials
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins

**Read this first** because every other file depends on `settings`.

---

### 2. `backend/app/database.py`

**What it is:** SQLAlchemy setup — the engine, session factory, and the `Base` class that all models inherit from.

```
config.py → database.py → models/*.py
```

- `engine` — the actual database connection pool
- `SessionLocal` — factory that creates per-request DB sessions
- `get_db()` — a generator that opens a session, yields it to a route, then closes it; used as a FastAPI dependency
- `Base` — all ORM model classes inherit this so SQLAlchemy knows to manage their tables

**Read this second** because the models cannot exist without it.

---

### 3. `backend/app/models/`

**What it is:** The three database tables, defined as Python classes.

Read them in this order because of their foreign-key dependencies:

#### `models/user.py`

Defines the `users` table. One row = one registered account.

Important columns:

- `id` — UUID primary key
- `email` — unique login identifier
- `hashed_password` — bcrypt hash, never the plain password
- `country_code` — ISO 3166-1 (e.g. `"US"`, `"VN"`), auto-detected from browser on signup, used to load the correct public holidays
- `theme` — `light | dark | system`

Relationships: one user `has many` events and `has many` calendar_sources.

#### `models/calendar_source.py`

Defines the `calendar_sources` table. Each row is a calendar that belongs to a user.

`source_type` can be:

- `local` — the default "Personal" calendar created at signup
- `google` — a connected Google Calendar account
- `holiday` — the public holiday feed for a country
- `outlook` — reserved for a future phase

Important columns:

- `access_token` / `refresh_token` — OAuth credentials for Google/Outlook
- `keep_source_colors` — whether to display Google's per-event colors instead of the source color
- `is_visible` — controls whether its events appear on the calendar

#### `models/event.py`

Defines the `events` table. Each row is a single event.

Important columns:

- `user_id` / `calendar_source_id` — foreign keys that link back to `users` and `calendar_sources`
- `source` — `local | google | outlook | holiday`, tells the app where this event came from
- `rrule` — an RFC 5545 recurrence string (e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR`), stored as text and understood by FullCalendar on the frontend
- `external_id` — stores the original ID from Google/Nager.Date to prevent duplicate imports on re-sync
- `is_deleted` — soft-delete flag; events are never hard-deleted so Google events can be re-synced

---

### 4. `backend/app/schemas/`

**What it is:** Pydantic models that validate incoming request bodies and shape outgoing JSON responses. The schemas mirror the ORM models but are separate because the API surface does not always expose every database column (e.g. `hashed_password` is never returned).

- `schemas/auth.py` — `RegisterRequest`, `LoginRequest`, `TokenResponse`
- `schemas/user.py` — `UserResponse` (what `/users/me` returns)
- `schemas/event.py` — `EventCreate`, `EventUpdate`, `EventResponse`
- `schemas/calendar_source.py` — `CalendarSourceResponse`, `UpdateCalendarSourceRequest`, `SyncHolidaysRequest`, `GoogleExchangeRequest`, `GoogleSyncResponse`

**The pattern:** A router function accepts a schema as its request body and returns another schema as the response. FastAPI validates and serializes automatically.

---

### 5. `backend/app/core/security.py`

**What it is:** All password hashing and JWT logic in one place.

- `hash_password(password)` — runs bcrypt, called at registration
- `verify_password(plain, hashed)` — called at login
- `create_access_token(subject)` — encodes the user's UUID into a JWT signed with `SECRET_KEY`; the token expires in 30 days by default
- `decode_access_token(token)` — decodes the JWT and returns the user UUID, or `None` if the token is invalid or expired

---

### 6. `backend/app/core/deps.py`

**What it is:** The `get_current_user` FastAPI dependency.

Any route that needs to know who is calling it adds `current_user: User = Depends(get_current_user)` to its function signature. FastAPI will:

1. Extract the `Authorization: Bearer <token>` header
2. Call `decode_access_token` from `security.py`
3. Query the database for the matching user
4. Raise HTTP 401 if anything fails
5. Otherwise inject the `User` ORM object into the route function

This is the authentication gate for the entire API.

---

### 7. `backend/app/services/`

**What it is:** Clients for external APIs. Routers call these; they do not touch the database directly.

#### `services/google_calendar_service.py`

Wraps every Google API call the app needs. Uses `httpx` (no official Google library required).

Key functions:

- `build_auth_url()` — constructs the OAuth2 authorization URL that the frontend redirects the user to
- `exchange_code(code)` — exchanges the authorization code for `access_token` + `refresh_token`
- `fetch_events(access_token, refresh_token, time_min, time_max)` — fetches up to 2,500 events from the user's primary Google Calendar; automatically refreshes the token on a 401 response
- `parse_google_event(g_event)` — converts a raw Google event object into the shape expected by the `Event` model
- `fetch_event_colors(access_token)` — fetches Google's color ID → hex mapping so per-event colors can be stored
- `revoke_token(token)` — called when a user disconnects their Google calendar

#### `services/holiday_service.py`

One function: `fetch_public_holidays(year, country_code)`. Calls the free Nager.Date API and returns a list of holiday objects. Returns an empty list if the country is not supported (HTTP 404).

---

### 8. `backend/app/routers/`

**What it is:** The HTTP layer. Each file is a FastAPI `APIRouter` that groups related endpoints. All routers are mounted under `/api/v1` in `main.py`.

#### `routers/auth.py` — `/api/v1/auth/...`

| Method | Path                    | What it does                                                                                        |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`        | Creates a user, hashes the password, creates the default "Personal" `CalendarSource`, returns a JWT |
| POST   | `/auth/login`           | Verifies credentials, returns a JWT                                                                 |
| GET    | `/auth/google/init`     | Returns the Google OAuth authorization URL                                                          |
| POST   | `/auth/google/exchange` | Receives the OAuth code, exchanges it for tokens, creates or updates the Google `CalendarSource`    |

**Registration side effect:** Every new user automatically gets a `CalendarSource` row with `source_type=local` and `name="Personal"`. This is the calendar that personal events are stored under.

#### `routers/events.py` — `/api/v1/events/...`

Standard CRUD for the authenticated user's events. All queries are scoped to `Event.user_id == current_user.id` so users can never see each other's data.

| Method | Path           | What it does                                                   |
| ------ | -------------- | -------------------------------------------------------------- |
| GET    | `/events`      | List events, optionally filtered by date range and source type |
| POST   | `/events`      | Create a local event                                           |
| GET    | `/events/{id}` | Get a single event                                             |
| PATCH  | `/events/{id}` | Partially update an event                                      |
| DELETE | `/events/{id}` | Soft-delete (sets `is_deleted=True`)                           |

**Why soft-delete?** Google and holiday events are fetched from external sources. If you hard-deleted them, a re-sync would immediately recreate them. Soft-delete lets the app track user intent.

#### `routers/calendar_sources.py` — `/api/v1/calendar-sources/...`

| Method | Path                              | What it does                                                       |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| GET    | `/calendar-sources`               | List all sources for the user                                      |
| PATCH  | `/calendar-sources/{id}`          | Update name, color, visibility, etc.                               |
| DELETE | `/calendar-sources/{id}`          | Revokes OAuth token, soft-deletes events, removes the source       |
| POST   | `/calendar-sources/holidays/sync` | Calls Nager.Date and upserts holiday events for the user's country |
| POST   | `/calendar-sources/{id}/sync`     | Fetches events from the connected Google Calendar and upserts them |

**Upsert logic (both sync endpoints):** The app uses `external_id` to check whether an event already exists. If it does, the row is updated in place. If not, a new row is inserted. This makes syncing idempotent — you can call it as many times as you want.

---

### 9. `backend/app/main.py`

**What it is:** The FastAPI application entry point.

- Creates the `FastAPI` app instance
- Adds CORS middleware configured from `settings.cors_origins_list`
- Mounts all four routers under `/api/v1`
- Exposes a `/health` endpoint (used by Docker health checks and Vercel)

This is the file that `uvicorn` runs: `uvicorn app.main:app`.

---

## Part 2 — Frontend

Read the frontend files in this order.

---

### 10. `frontend/types/index.ts`

**What it is:** All TypeScript type definitions in one file.

Start here to understand the data shapes the frontend works with:

- `User` — matches `UserResponse` from the backend
- `CalendarSource` — matches `CalendarSourceResponse`
- `CalEvent` — matches `EventResponse`; `rrule` is a string or null
- `EventCreate` / `EventUpdate` — request body shapes
- `FcEvent` — the shape that FullCalendar expects; different from `CalEvent`, converted via `lib/utils.ts`

**Read this before any component** so you understand what data is flowing around.

---

### 11. `frontend/store/`

**What it is:** Zustand global state stores. Zustand is a lightweight alternative to Redux. The `persist` middleware saves state to `localStorage` so it survives page refreshes.

#### `store/authStore.ts`

Holds `token` (JWT string) and `user` (the `User` object). Only `token` is persisted to localStorage — `user` is re-fetched from the API on load.

Key actions: `setToken`, `setUser`, `logout`.

The `token` is the single source of truth for whether the user is authenticated. Every page that requires auth checks this store.

#### `store/settingsStore.ts`

Persists user preferences that are local to the browser: `language`, `region`, `dateFormat`, `timeFormat`, `offlineMode`, and up to 5 `savedAccounts` (for the "switch account" feature in the profile menu).

These are UI preferences, not server-side settings (except `theme`, which is stored in the database on the `User` model).

#### `store/uiStore.ts`

Holds `newEventTrigger` — a counter that increments each time the "Create" button in the Sidebar is clicked. `CalendarView` watches this value and opens the new-event modal when it changes. This is a clean way for sibling components that have no parent–child relationship to communicate without prop-drilling.

---

### 12. `frontend/lib/api.ts`

**What it is:** The single Axios instance used for all API calls.

Two interceptors are registered:

1. **Request interceptor** — reads `token` from `authStore` and adds `Authorization: Bearer <token>` to every outgoing request automatically
2. **Response interceptor** — if any response returns HTTP 401, calls `logout()` and redirects to `/login`

Every hook and page imports this `api` object instead of raw `axios` or `fetch`.

---

### 13. `frontend/lib/utils.ts`

**What it is:** Shared utility functions, most importantly `toFcEvent`.

`toFcEvent(calEvent, sources)` converts a `CalEvent` from the API into an `FcEvent` that FullCalendar can render. It:

- Maps `start_time` / `end_time` to FullCalendar's `start` / `end`
- Determines the event color: if the event has its own `color`, use it; otherwise use the source's `color`; if the source has `keep_source_colors=true` and the event has no color, fall back to the source color
- Passes the `rrule` string through directly (FullCalendar's rrule plugin handles it natively)

---

### 14. `frontend/hooks/useAuth.ts`

**What it is:** The authentication hook used by the dashboard layout.

- If `token` exists in the store, fires a TanStack Query to `GET /api/v1/users/me` to fetch the current user profile
- Updates `authStore.user` when the response arrives
- Returns `{ token, user, isLoading, isAuthenticated, logout }`

Pages use `isAuthenticated` to decide whether to render or redirect.

---

### 15. `frontend/hooks/useEvents.ts`

**What it is:** All TanStack Query hooks for events and calendar sources.

| Hook                            | What it does                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `useEvents(start, end)`         | `GET /events` filtered by date range; re-fetches when the visible calendar range changes |
| `useCreateEvent()`              | `POST /events`; invalidates the events query on success                                  |
| `useUpdateEvent()`              | `PATCH /events/{id}`; invalidates the events query on success                            |
| `useDeleteEvent()`              | `DELETE /events/{id}`; invalidates the events query on success                           |
| `useSyncHolidays()`             | `POST /calendar-sources/holidays/sync`; invalidates both sources and events queries      |
| `useGoogleInit()`               | `GET /auth/google/init`; returns the Google OAuth URL                                    |
| `useSyncGoogleCalendar()`       | `POST /calendar-sources/{id}/sync`; triggers a full Google sync                          |
| `useDisconnectCalendarSource()` | `DELETE /calendar-sources/{id}`; revokes the token and removes the source                |

**The pattern:** Mutations call `queryClient.invalidateQueries(...)` on success. TanStack Query then automatically refetches any component that is subscribed to those query keys, so the UI updates without manual state management.

---

### 16. `frontend/contexts/CalendarContext.tsx`

**What it is:** A React context that shares one FullCalendar instance across multiple unrelated components.

**The problem it solves:** The Header (prev/next/today buttons) and the MiniCalendar (date picker) need to control the main FullCalendar view in `CalendarView`. But they are siblings, not children, of `CalendarView`. Rather than lifting state all the way up to the layout, this context holds a `ref` to the FullCalendar API.

- `CalendarView` calls `registerCal(calRef.current)` to register itself
- `Header` and `MiniCalendar` call `goToday()`, `goPrev()`, `goNext()`, `goToDate()`, `changeView()` from the context
- `title`, `view`, and `currentDate` are kept in sync by `CalendarView` via the `datesSet` callback → `updateState()`

`CalendarProvider` wraps the entire dashboard layout so all children share the same instance.

---

### 17. `frontend/app/layout.tsx` and `frontend/app/providers.tsx`

**What they are:** The root of the Next.js app tree.

`layout.tsx` defines the HTML shell (PWA metadata, manifest link, theme color) and wraps everything in `<Providers>`.

`providers.tsx` sets up:

- `ThemeProvider` (next-themes) — applies dark/light/system theme via `class` attribute on `<html>`
- `QueryClientProvider` (TanStack Query) — makes the query cache available to all hooks
- `LanguageSync` — reads the language from `settingsStore` and calls `i18n.changeLanguage()` to keep react-i18next in sync

---

### 18. `frontend/app/page.tsx`

**What it is:** The root route `/`. Immediately redirects to `/calendar` if a token exists in the store, or to `/login` otherwise. Contains no UI of its own.

---

### 19. `frontend/app/(auth)/login/page.tsx` and `frontend/app/(auth)/register/page.tsx`

**What they are:** The login and registration forms.

On successful login/register, the backend returns `{ access_token: "..." }`. The page calls `authStore.setToken(token)` and navigates to `/calendar`. From that point on, every API call made by `lib/api.ts` will include that token automatically.

---

### 20. `frontend/app/(dashboard)/layout.tsx`

**What it is:** The authenticated shell that wraps all dashboard pages.

- Reads `token` from `authStore`; if missing, redirects to `/login` immediately (client-side auth guard)
- Wraps children in `<CalendarProvider>` so all dashboard components share the FullCalendar context
- Renders `<Header>` and `<Sidebar>` around `<main>` which holds the current page

---

### 21. `frontend/app/(dashboard)/calendar/page.tsx`

**What it is:** The main calendar page. A one-liner — it just renders `<CalendarView />`.

---

### 22. `frontend/components/calendar/CalendarView.tsx`

**What it is:** The central component of the app. Where everything comes together.

Responsibilities:

1. Renders the FullCalendar instance with `dayGridPlugin`, `timeGridPlugin`, `rrulePlugin`, etc.
2. Calls `useEvents(rangeStart, rangeEnd)` to fetch events for the currently visible date window. The window updates via FullCalendar's `datesSet` callback.
3. Fetches calendar sources (`GET /calendar-sources`) and filters out events whose source is hidden (`is_visible=false`).
4. Calls `toFcEvent()` on each visible event to convert it to FullCalendar's format.
5. Handles three interaction callbacks:
   - `handleDateSelect` — user drags a range on the calendar → opens EventModal pre-filled with that range
   - `handleEventClick` — user clicks an event → opens EventModal pre-filled with that event's data
   - `handleDatesSet` — visible range changed → updates `rangeStart`/`rangeEnd` to re-fetch, and updates shared context title/view/date
6. Watches `uiStore.newEventTrigger` and opens the modal when it increments (triggered by the Sidebar "Create" button).
7. Registers itself with `CalendarContext` so Header/MiniCalendar can control it.

---

### 23. `frontend/components/calendar/EventModal.tsx`

**What it is:** The create/edit modal for personal events.

- When `selectedEvent` is null: renders a "Create event" form
- When `selectedEvent` is set: renders an "Edit event" form pre-populated with the event's data, plus a Delete button
- Calls `useCreateEvent`, `useUpdateEvent`, or `useDeleteEvent` hooks depending on the action
- Includes an RRULE builder UI for setting recurrence (daily, weekly, monthly, custom)

---

### 24. `frontend/components/layout/Sidebar.tsx`

**What it is:** The left sidebar with the "Create" button, the calendar source list, and the MiniCalendar.

- Lists all `CalendarSource` rows from the API with color indicators
- Toggling a source's checkbox calls `PATCH /calendar-sources/{id}` to update `is_visible`
- The "Create" button calls `uiStore.triggerNewEvent()` which signals `CalendarView` to open the new-event modal

---

### 25. `frontend/app/(dashboard)/settings/page.tsx`

**What it is:** The settings page with four sections: Appearance, Localization, Connected Calendars, and Saved Accounts.

- **Appearance** — ThemeToggle (light/dark/system), saved to the `User` model via `PATCH /users/me`
- **Localization** — language, region, date format, time format — saved to `settingsStore` (localStorage)
- **Connected Calendars:**
  - "Add Holidays" — calls `useSyncHolidays()` with the selected country code
  - "Connect Google Calendar" — calls `useGoogleInit()` to get the OAuth URL, redirects the user to Google
  - "Sync" button — calls `useSyncGoogleCalendar()` to pull fresh events from Google
  - "Disconnect" button — calls `useDisconnectCalendarSource()`

---

### 26. `frontend/app/auth/google/callback/page.tsx`

**What it is:** The OAuth callback page that Google redirects to after the user grants permission.

Flow:

1. Google appends `?code=...` to the redirect URI
2. This page reads the `code` from the URL
3. Calls `POST /api/v1/auth/google/exchange` with the code
4. Backend exchanges it for tokens and creates the Google `CalendarSource`
5. Page redirects to `/settings`

A `called` ref prevents the effect from firing twice in React Strict Mode.

---

## Part 3 — How the Key Flows Work End to End

### User Registration

```
Register page → POST /auth/register
  → backend creates User + "Personal" CalendarSource
  → returns JWT
  → frontend stores token → redirects to /calendar
```

### Viewing the Calendar

```
/calendar renders CalendarView
  → CalendarView fetches /events?start=...&end=...  (useEvents hook)
  → CalendarView fetches /calendar-sources           (inline useQuery)
  → Filters events by source visibility
  → Converts to FullCalendar format via toFcEvent()
  → FullCalendar renders; rrulePlugin expands recurring events
```

### Creating a Personal Event

```
User clicks date on calendar → handleDateSelect → opens EventModal
  → user fills form and submits
  → useCreateEvent → POST /events
  → TanStack Query invalidates ["events"]
  → CalendarView re-fetches → new event appears
```

### Connecting Google Calendar

```
Settings page → "Connect Google Calendar"
  → useGoogleInit → GET /auth/google/init → backend returns auth URL
  → browser redirects to Google
  → user grants permission → Google redirects to /auth/google/callback?code=...
  → callback page → POST /auth/google/exchange
  → backend exchanges code, creates CalendarSource, stores tokens
  → frontend redirects to /settings
  → user clicks "Sync" → POST /calendar-sources/{id}/sync
  → backend fetches Google events, upserts by external_id
  → TanStack Query invalidates ["events"] → calendar updates
```

### Syncing Public Holidays

```
Settings page → select country → "Add Holidays"
  → useSyncHolidays → POST /calendar-sources/holidays/sync
  → backend calls Nager.Date for current + next year
  → upserts holiday events with external_id = "holiday_US_2026-07-04"
  → TanStack Query invalidates ["events"] → holidays appear on calendar
```

### Authentication Guard (every page load)

```
User opens app → root page.tsx checks authStore.token
  → if token exists → redirect to /calendar
  → DashboardLayout checks token → if missing → redirect to /login
  → useAuth hook fires GET /users/me to validate token is still good
  → if 401 → api.ts interceptor calls logout() → redirect to /login
```

---

## Summary of Dependencies Between Files

```
config.py
  └─ database.py
       └─ models/*.py
            └─ schemas/*.py
                 └─ core/security.py + core/deps.py
                      └─ routers/*.py
                           └─ services/*.py
                                └─ main.py (assembles everything)

types/index.ts
  └─ store/authStore.ts + store/settingsStore.ts + store/uiStore.ts
       └─ lib/api.ts
            └─ hooks/useAuth.ts + hooks/useEvents.ts
                 └─ contexts/CalendarContext.tsx
                      └─ app/providers.tsx → app/layout.tsx
                           └─ app/(dashboard)/layout.tsx
                                └─ components/layout/Header.tsx
                                └─ components/layout/Sidebar.tsx
                                └─ app/(dashboard)/calendar/page.tsx
                                     └─ components/calendar/CalendarView.tsx
                                          └─ components/calendar/EventModal.tsx
```
