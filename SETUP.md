# CalSync — Setup Guide

## Prerequisites

| Tool       | Version                    |
| ---------- | -------------------------- |
| Node.js    | 20+                        |
| Python     | 3.12+                      |
| PostgreSQL | 15+ (or use Supabase/Neon) |
| Git        | any                        |

---

## Option A — Run locally without Docker

### 1. Database

**Option A1 — Local PostgreSQL**

```bash
createdb calsync
```

**Option A2 — Free cloud database**

- [Supabase](https://supabase.com) → New project → Settings → Database → copy the connection string
- [Neon](https://neon.tech) → New project → copy the connection string

---

### 2. Backend

```bash
cd backend

# Create virtualenv
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY at minimum:
#   python -c "import secrets; print(secrets.token_hex(32))"  <- generate SECRET_KEY

# Run database migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

The API is now running at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Open http://localhost:3000 — you should see the CalSync login page.

---

## Option B — Run with Docker Compose

```bash
# Copy and fill in .env files first
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env (set SECRET_KEY at minimum)
# DATABASE_URL is auto-set to the docker postgres service

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Postgres: localhost:5432

To stop: `docker compose down`  
To wipe the database volume: `docker compose down -v`

---

## Environment Variables

### backend/.env

| Variable                 | Required | Description                                             |
| ------------------------ | -------- | ------------------------------------------------------- |
| `DATABASE_URL`           | ✅        | PostgreSQL connection string                            |
| `SECRET_KEY`             | ✅        | JWT signing key — generate with `secrets.token_hex(32)` |
| `ALGORITHM`              |          | JWT algorithm, default `HS256`                          |
| `ACCESS_TOKEN_EXPIRE_DAYS` |        | JWT lifetime, default `30`                              |
| `CORS_ORIGINS`           |          | Comma-separated allowed origins, default `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`       | Phase 3  | Google OAuth client ID                                  |
| `GOOGLE_CLIENT_SECRET`   | Phase 3  | Google OAuth client secret                              |
| `GOOGLE_REDIRECT_URI`    | Phase 3  | OAuth callback URL                                      |
| `MICROSOFT_CLIENT_ID`    | Phase 4  | Azure OAuth client ID                                   |
| `MICROSOFT_CLIENT_SECRET`| Phase 4  | Azure OAuth client secret                               |
| `REDIS_URL`              | Phase 4  | Redis for Celery task queue                             |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Phase 4 | Email notification credentials |

### frontend/.env.local

| Variable                      | Required | Description                    |
| ----------------------------- | -------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`         | ✅        | Backend URL, default `http://localhost:8000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| Phase 3  | Google OAuth client ID         |
| `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` | Phase 4 | Azure OAuth client ID       |

---

## API Reference

Base URL: `http://localhost:8000/api/v1`  
All protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path             | Auth | Description                        |
| ------ | ---------------- | ---- | ---------------------------------- |
| POST   | `/auth/register` | —    | Create account, returns JWT        |
| POST   | `/auth/login`    | —    | Sign in, returns JWT               |

### Users

| Method | Path          | Auth | Description                        |
| ------ | ------------- | ---- | ---------------------------------- |
| GET    | `/users/me`   | ✅    | Get current user profile           |
| PATCH  | `/users/me`   | ✅    | Update profile (name, country, timezone, theme) |

### Events

| Method | Path                 | Auth | Description                             |
| ------ | -------------------- | ---- | --------------------------------------- |
| GET    | `/events`            | ✅    | List events (filter: `start`, `end`, `source`) |
| POST   | `/events`            | ✅    | Create local event                      |
| GET    | `/events/{id}`       | ✅    | Get event by ID                         |
| PATCH  | `/events/{id}`       | ✅    | Update event                            |
| DELETE | `/events/{id}`       | ✅    | Soft-delete event                       |

Events support RFC 5545 RRULE strings (stored in the `rrule` field). FullCalendar expands recurrences client-side via `@fullcalendar/rrule`.

### Calendar Sources

| Method | Path                                  | Auth | Description                              |
| ------ | ------------------------------------- | ---- | ---------------------------------------- |
| GET    | `/calendar-sources`                   | ✅    | List all calendar sources for current user |
| PATCH  | `/calendar-sources/{id}`              | ✅    | Update source (name, color, is_visible)  |
| POST   | `/calendar-sources/holidays/sync`     | ✅    | Sync public holidays via Nager.Date      |

**Holiday sync body:**
```json
{ "country_code": "VN" }
```
`country_code` is optional — falls back to the user's stored country on their profile.

---

## Phase 2 Features

### Public Holiday Sync (Nager.Date)

- **Sidebar → Other Calendars → "Add holidays"** — click to sync public holidays for your region
- Fetches the current year and next year from [date.nager.at](https://date.nager.at) (no API key required)
- Creates a `holiday` CalendarSource for the user and inserts all-day events
- Only nationwide (`global: true`) holidays are included
- Re-syncing is safe — uses `external_id` to upsert, never duplicates
- Supports all countries available in Nager.Date (~110 countries)

### RRULE UI Polish

- **UNTIL date** is now correctly restored when editing an existing recurring event
- **Monthly recurrence** has a two-mode toggle:
  - *On day X* — emits `BYMONTHDAY=X` (e.g. every 15th of the month); day auto-derived from the event's start date
  - *Weekly* — uses the existing weekday picker (BYDAY)
- `buildRrule` and `parseRrule` in `lib/utils.ts` are fully typed via `ParsedRrule` interface

---

## Project Structure

```
calsync/
├── docker-compose.yml
├── SETUP.md
│
├── backend/                        # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── core/
│   │   │   ├── deps.py             # JWT bearer dependency
│   │   │   └── security.py         # Password hashing, JWT encode/decode
│   │   ├── models/
│   │   │   ├── user.py             # User ORM (id, email, country_code, theme…)
│   │   │   ├── calendar_source.py  # CalendarSource ORM (local/google/outlook/holiday)
│   │   │   └── event.py            # Event ORM (rrule, source, external_id…)
│   │   ├── schemas/
│   │   │   ├── auth.py             # RegisterRequest, LoginRequest, TokenResponse
│   │   │   ├── user.py             # UserResponse, UpdateUserRequest
│   │   │   ├── event.py            # EventCreate, EventUpdate, EventResponse
│   │   │   └── calendar_source.py  # CalendarSourceResponse, SyncHolidaysRequest…
│   │   ├── routers/
│   │   │   ├── auth.py             # /auth/register, /auth/login
│   │   │   ├── users.py            # /users/me
│   │   │   ├── events.py           # /events CRUD
│   │   │   └── calendar_sources.py # /calendar-sources + /holidays/sync
│   │   ├── services/
│   │   │   └── holiday_service.py  # Nager.Date API client (httpx, async)
│   │   ├── config.py               # Pydantic settings (reads .env)
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   └── main.py                 # FastAPI app, CORS, router registration
│   ├── alembic/
│   │   └── versions/
│   │       └── 0001_initial_schema.py  # Full schema (users, calendar_sources, events)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                        # Local secrets (git-ignored)
│   └── .env.example                # Template
│
└── frontend/                       # Next.js 14 PWA (App Router + TypeScript)
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx      # Sign-in page
    │   │   └── register/page.tsx   # Registration page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx          # Protected layout (Header + Sidebar)
    │   │   ├── calendar/page.tsx   # Main calendar view
    │   │   └── settings/page.tsx   # Language, region, theme, date format
    │   ├── layout.tsx              # Root layout (i18n, theme, query providers)
    │   ├── page.tsx                # Redirects / → /calendar
    │   └── providers.tsx           # ThemeProvider + QueryClientProvider
    ├── components/
    │   ├── calendar/
    │   │   ├── CalendarView.tsx    # FullCalendar (dayGrid + timeGrid + rrulePlugin)
    │   │   ├── EventModal.tsx      # Create/edit event form (RRULE, color, reminder)
    │   │   └── MiniCalendar.tsx    # Sidebar mini-calendar
    │   ├── layout/
    │   │   ├── Header.tsx          # Nav toolbar (view switcher, today, hamburger)
    │   │   └── Sidebar.tsx         # Calendar list + holiday sync + mini-calendar
    │   └── ui/
    │       ├── Modal.tsx           # Reusable modal wrapper
    │       ├── ThemeToggle.tsx     # Light / Dark / System switcher
    │       ├── ProfileMenu.tsx     # User avatar dropdown
    │       └── SearchableSelect.tsx # Filterable dropdown (used in settings)
    ├── contexts/
    │   └── CalendarContext.tsx     # Shared FullCalendar API ref + view state
    ├── hooks/
    │   ├── useAuth.ts              # JWT auth + /users/me query
    │   └── useEvents.ts            # CRUD mutations + useSyncHolidays
    ├── lib/
    │   ├── api.ts                  # Axios instance (auto-attaches JWT)
    │   ├── utils.ts                # buildRrule, parseRrule (ParsedRrule), toFcEvent
    │   ├── translations.ts         # 16-language string map
    │   └── geoData.ts              # Country list for region picker
    ├── store/
    │   ├── authStore.ts            # Zustand: JWT token + user (persisted)
    │   ├── settingsStore.ts        # Zustand: language, region, dateFormat… (persisted)
    │   └── uiStore.ts              # Zustand: sidebar open, new-event trigger
    ├── types/
    │   └── index.ts                # User, CalEvent, CalendarSource, FcEvent…
    ├── public/
    │   └── manifest.json           # PWA manifest
    ├── package.json
    ├── Dockerfile
    ├── .env.local                  # Local env (git-ignored)
    └── .env.example                # Template
```

---

## Phase Roadmap

| Phase | Status       | Features                                                         |
| ----- | ------------ | ---------------------------------------------------------------- |
| 1     | ✅ Complete   | Core UI, local events CRUD, JWT auth, dark/light/system theme, PWA manifest |
| 2     | ✅ Complete   | Nager.Date public holidays, RRULE UNTIL + BYMONTHDAY polish      |
| 3     | 🔲 Next       | Google Calendar OAuth (read-only, `calendar.readonly` scope)     |
| 4     | 🔲 Planned    | Outlook OAuth + Celery/Redis reminder queue (email + push)       |

---

## Phase 3 — Google Calendar OAuth Setup (when ready)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs** → enable **Google Calendar API**
3. **Credentials** → Create OAuth 2.0 Client ID → Web application
4. Add Authorized redirect URIs:
   - `http://localhost:8000/api/v1/auth/google/callback` (dev)
   - `https://your-api.onrender.com/api/v1/auth/google/callback` (prod)
5. Copy **Client ID** and **Client Secret** to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   ```
6. Required scope: `https://www.googleapis.com/auth/calendar.readonly`

---

## Phase 4 — Microsoft Outlook OAuth Setup (when ready)

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → New registration
2. Set Redirect URI: `http://localhost:8000/api/v1/auth/outlook/callback`
3. **Certificates & secrets** → New client secret → copy the value
4. **API permissions** → Add: `Calendars.Read`, `offline_access`
5. Copy values to `backend/.env`:
   ```
   MICROSOFT_CLIENT_ID=your_client_id_here
   MICROSOFT_CLIENT_SECRET=your_client_secret_here
   MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/auth/outlook/callback
   ```

---

## Deployment

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Set environment variables in the Vercel dashboard:

| Variable              | Value                          |
| --------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Your Render / Railway API URL  |

### Backend → Render

1. Create a new **Web Service** in [Render](https://render.com)
2. Connect your GitHub repo, set **Root Directory** = `backend`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `backend/.env`
6. Set `CORS_ORIGINS` to your Vercel frontend URL
