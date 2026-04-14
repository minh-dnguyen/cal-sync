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

---

## Phase 3 — Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs** → enable "Google Calendar API"
3. **Credentials** → Create OAuth 2.0 Client ID → Web application
4. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (dev)
   - `https://your-app.vercel.app/api/auth/google/callback` (prod)
5. Copy **Client ID** and **Client Secret** to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. Required scope: `https://www.googleapis.com/auth/calendar.readonly`

---

## Phase 4 — Microsoft Outlook OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → New registration
2. Set Redirect URI: `http://localhost:3000/api/auth/outlook/callback`
3. **Certificates & secrets** → New client secret → copy the value
4. **API permissions** → Add: `Calendars.Read`, `offline_access`
5. Copy values to `backend/.env`:
   ```
   MICROSOFT_CLIENT_ID=...
   MICROSOFT_CLIENT_SECRET=...
   ```

---

## Deployment

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Set environment variable in Vercel dashboard:

- `NEXT_PUBLIC_API_URL` = your Render/Railway backend URL

### Backend → Render

1. Create a new **Web Service** in [Render](https://render.com)
2. Connect your GitHub repo, set **Root Directory** = `backend`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `backend/.env`
6. Set `CORS_ORIGINS` to your Vercel URL

---

## Project Structure

```
calsync/
├── backend/                  # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── core/             # JWT security, route dependencies
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   └── main.py           # App entrypoint
│   └── alembic/              # Database migrations
│
└── frontend/                 # Next.js 14 PWA
    ├── app/                  # App Router pages
    │   ├── (auth)/           # Login + Register
    │   └── (dashboard)/      # Protected calendar view
    ├── components/
    │   ├── calendar/         # FullCalendar + EventModal
    │   ├── layout/           # Header, Sidebar
    │   └── ui/               # ThemeToggle, Modal
    ├── hooks/                # React Query hooks
    ├── store/                # Zustand auth store
    └── types/                # TypeScript interfaces
```

---

## Phase Roadmap

| Phase | Status      | Features                                                    |
| ----- | ----------- | ----------------------------------------------------------- |
| 1     | ✅ Complete | Core UI, local events CRUD, auth, dark/light mode           |
| 2     | 🔲 Next     | RRULE full support, Nager.Date holidays                     |
| 3     | 🔲 Planned  | Google Calendar read-only overlay                           |
| 4     | 🔲 Planned  | Outlook sync, browser push + email reminders (Celery/Redis) |
