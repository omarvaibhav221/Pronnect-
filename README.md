# Pronnect — Real-Time Client Project Dashboard

Role-based (Admin / PM / Developer) project & task tracker with a live,
role-filtered activity feed over WebSockets.

---

## 1. What is Pronnect?

**Pronnect** is a real-time, role-based project and task tracking dashboard built for software agencies. It allows **Admins**, **Project Managers (PMs)**, and **Developers** to collaborate on client projects with live status updates, notifications, and an activity feed powered by WebSockets.

---

## 2. High-Level Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Port 5173)                      │
│             React + TypeScript + Vite + Socket.io            │
└──────────────────────────────▲───────────────────────────────┘
                               │ HTTP REST API & WebSockets
┌──────────────────────────────▼───────────────────────────────┐
│                    Backend (Port 4000)                       │
│        Node.js + Express + TypeScript + Socket.io Server     │
│             Background Cron Job (every 5 minutes)            │
└──────────────────────────────▲───────────────────────────────┘
                               │ Prisma ORM
┌──────────────────────────────▼───────────────────────────────┐
│                 PostgreSQL (Port 5432)                       │
│     Database: velozity_dashboard (Users, Tasks, Projects)    │
└──────────────────────────────────────────────────────────────┘
```

- **Frontend:** [`frontend/src`](frontend/src) — Responsive dashboard that automatically adapts its layout based on who is logged in.
- **Backend:** [`backend/src`](backend/src) — Express API handling authentication, task management, WebSockets, and background jobs.
- **Database:** PostgreSQL storing users, clients, projects, tasks, activity logs, and notifications.

---

## 3. User Roles & What Each Role Does

The project implements strict **Role-Based Access Control (RBAC)**. Depending on who logs in, the dashboard switches views:

| Role | Seeded Email | Password | What They See & Can Do |
|---|---|---|---|
| **Admin** | `admin@pronnect.dev` | `Password123!` | **Company-wide overview:** sees all clients, all projects, all tasks across the agency, and an unfiltered, global real-time activity feed. |
| **Project Manager (PM)** | `pm1@pronnect.dev`<br>`pm2@pronnect.dev` | `Password123!` | **Project management view:** manages specific client projects, creates tasks, assigns tasks to developers, sets deadlines/priorities, and gets notified when a task is moved to `IN_REVIEW`. |
| **Developer** | `dev1@pronnect.dev`<br>… `dev4@pronnect.dev` | `Password123!` | **Personal workbench:** only sees tasks assigned to them, can update task statuses (`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`), and receives assignment/overdue alerts. |

---

## 4. Step-by-Step: How to Log In & Test

### Step 1: Open the App
In your web browser, navigate to:  
👉 **`http://localhost:5173`**

### Step 2: Log in as the Admin
- **Email:** `admin@pronnect.dev`
- **Password:** `Password123!`
- Click **Sign in**.
- **What to explore:**
  - Notice the high-level summary cards (Total Projects, Tasks In Progress, Overdue Tasks).
  - Look at the **Live Activity Feed** on the right side.
  - Click on any project (e.g. *Storefront Relaunch*) to inspect tasks and assignments.

### Step 3: Switch to a Developer Account
1. Click the **Sign out** button in the top navigation bar.
2. Sign in as Developer 1:
   - **Email:** `dev1@pronnect.dev`
   - **Password:** `Password123!`
3. **What to explore:**
   - Notice how the screen changes: it now displays **"My Tasks"** (only tasks assigned to Ravi Shah).
   - Change the status of a task from `IN_PROGRESS` to `IN_REVIEW`.
   - The status change is saved to the database and broadcast in real time!

### Step 4: Switch to a Project Manager Account
1. Sign out, then sign in as PM 1:
   - **Email:** `pm1@pronnect.dev`
   - **Password:** `Password123!`
2. **What to explore:**
   - Priya Menon manages *Storefront Relaunch* and *Support Portal Migration*.
   - Check the **Notification Bell** in the top right to see task review alerts and overdue alerts.

---

## 5. Key Features & How They Work Under the Hood

### A. Real-Time Socket.io Activity Feed
- Located in [`backend/src/sockets/index.ts`](backend/src/sockets/index.ts) and [`frontend/src/components/ActivityFeed.tsx`](frontend/src/components/ActivityFeed.tsx).
- When a task status changes, the backend writes an audit row to the `ActivityLog` table.
- Socket.io then pushes that event only to the rooms that are allowed to see it (e.g. the Admin room, the PM's room, and the assigned Developer's room).
- **Try this:** Open two browser tabs side-by-side (one logged in as Admin, one logged in as Dev). Update a task in the Dev tab, and watch the Admin feed update instantly without refreshing the page!

### B. Automated Overdue Task Detection (Cron Job)
- Located in [`backend/src/jobs/overdueJob.ts`](backend/src/jobs/overdueJob.ts).
- Every 5 minutes (`*/5 * * * *`), the server scans the database for any task where `dueDate < now` that isn't `DONE`.
- It marks them as `isOverdue: true` and dispatches notifications to both the PM and the assigned Developer.

### C. Secure Authentication (JWT + Rotating Refresh Tokens)
- Located in [`backend/src/controllers/authController.ts`](backend/src/controllers/authController.ts).
- The short-lived **Access Token** (15 minutes) is kept in memory.
- The **Refresh Token** (7 days) is stored in a secure, `httpOnly` cookie.
- Every time a refresh token is used, it is rotated (revoked and replaced with a new one) to prevent replay attacks.

---

## Stack

- **Backend:** Node.js + Express, TypeScript, Prisma ORM, PostgreSQL, Socket.io, node-cron
- **Frontend:** React + TypeScript (Vite), react-router, socket.io-client, axios
- **Auth:** JWT access token (memory, 15 min) + rotating refresh token (httpOnly cookie, 7 days)

## Local setup (Docker, preferred)

```bash
# 1. Start Postgres + API
docker compose up --build -d

# 2. Run migrations + seed data (first time only)
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed

# 3. Frontend (not containerized, for fast HMR during review)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173 — Backend: http://localhost:4000

### Without Docker

```bash
# Postgres running locally, then:
cd backend
cp .env.example .env        # point DATABASE_URL at your local Postgres
npm install
npx prisma migrate dev
npm run seed
npm run dev

# in a second terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Seeded accounts (password for all: `Password123!`)

| Role | Email |
|---|---|
| Admin | admin@pronnect.dev |
| PM | pm1@pronnect.dev, pm2@pronnect.dev |
| Developer | dev1@pronnect.dev … dev4@pronnect.dev |

3 projects, 5 tasks each, 2 already overdue, and pre-existing activity log
entries so the feed isn't empty on first load.

## Deploying

- **Frontend → Vercel:** import `/frontend`, set `VITE_API_URL` to your API's
  public URL. Framework preset: Vite.
- **API → Vercel is a poor fit** here: this API holds a persistent Socket.io
  connection and a running `node-cron` process, neither of which survive on
  Vercel's serverless functions. Deploy `/backend` to a long-running host
  instead (Render, Railway, Fly.io, or a small VPS via the included
  `Dockerfile`), and point the frontend's `VITE_API_URL` at it. This is
  called out explicitly so it isn't a silent surprise at deploy time.
- Managed Postgres: Neon, Supabase, or Railway all work — set `DATABASE_URL`
  accordingly and run `npx prisma migrate deploy` once against it.

## Database schema

See `backend/prisma/schema.prisma` for the source of truth. Summary:

- **User** (`role`: ADMIN/PM/DEVELOPER) — owns Projects (as PM), is assigned
  Tasks, has Notifications and RefreshTokens.
- **RefreshToken** — one row per issued refresh token, so any individual
  session can be revoked without invalidating every device. Rotated on every
  use (old one revoked, new one issued) to limit replay if a cookie leaks.
- **Client** — the agency's customer; has many Projects.
- **Project** — belongs to one Client and one PM (`pmId`).
- **Task** — belongs to a Project, optionally assigned to a Developer.
  Carries `status`, `priority`, `dueDate`, and a denormalized `isOverdue`
  flag that the cron job maintains (see below).
- **ActivityLog** — append-only. Never derived from a Task's current state;
  it's the audit trail and the source for both the live feed and the
  missed-event catchup, so it must survive independent of what happens to
  the task afterward.
- **Notification** — per-user, DB-backed, with `read` and `createdAt`.

### Indexing decisions

- `Task(projectId)`, `Task(assignedToId)` — every task list is either
  "tasks in project X" or "tasks assigned to user Y"; these are the two hot
  lookup paths and both are foreign keys used in `WHERE` clauses on nearly
  every request.
- `Task(status)`, `Task(priority)`, `Task(dueDate)`, `Task(isOverdue)` — each
  is an independent, combinable filter exposed via query params
  (`?status=&priority=&dueBefore=&dueAfter=`); Postgres can use these
  individually or let the planner combine them via bitmap index scans.
- `ActivityLog(projectId, createdAt)` — composite index backing "last 20
  events for project X" (the project room catchup query), ordered so no
  separate sort step is needed.
- `ActivityLog(createdAt)` — backs the admin's unfiltered global feed
  catchup.
- `Notification(userId, read)` — backs both "list my notifications" and
  "count my unread", the two queries the bell component runs constantly.
- `Project(pmId)`, `Project(clientId)` — PM-scoped project listing and
  client rollups.

## Architectural decisions

**WebSocket library — Socket.io, not raw WebSocket or SSE.** The feed needs
per-project rooms (only viewers of project X get X's updates), per-role
broadcast rooms (`feed:admin`, `feed:pm:<id>`, `user:<id>`), presence
tracking, and reconnect-with-rejoin — all built into Socket.io's room model.
Raw WebSocket would mean hand-rolling a pub/sub + room layer for no benefit
at this scale. SSE is one-directional and can't carry the client's
`project:watch` / `activity:catchup` requests back to the server.

**Role-filtered feed, concretely:** every task status change writes one
`ActivityLog` row, then `activityService.recordActivity` emits that single
event into up to four rooms: the project's room (anyone currently viewing
it, any role), `feed:admin` (global), `feed:pm:<ownerId>` (only that PM's
own projects), and `user:<assigneeId>` (only that developer's own task).
Socket.io's rooms mean this is "emit to N room names", not "loop over
connected sockets and decide per-socket" — the fan-out is O(rooms), not
O(all connected users). On (re)connection or when opening a project, the
client calls `activity:catchup`, which runs the same role-scoped Prisma
query as the initial feed load, straight from the database, so a user who
was offline sees the same last-20 events whether they were gone five
minutes or five hours — nothing depends on an in-memory buffer that would
be empty after a server restart.

**Job queue — node-cron, not Bull.** The overdue sweep is a single
idempotent query on a fixed schedule with no need for retries, priorities,
or cross-instance coordination. Bull would add a Redis dependency to solve
problems this job doesn't have. If the API is ever run as multiple
instances, the honest upgrade is either Bull (real distributed queue) or a
Postgres advisory lock around the cron tick — noted below as a known gap.

**Refresh token storage.** Access tokens live in memory only, on both client
and this explanation: never localStorage, never a JS-readable cookie.
Refresh tokens are httpOnly, `sameSite=lax`, scoped to `/api/auth`, stored
server-side in a `RefreshToken` table, and rotated on every use — so a
stolen refresh token has a bounded lifetime and reuse of an already-rotated
one is detectable (its `revoked` flag will already be true).

## Known limitations

- **Cron + multiple instances:** if the API is horizontally scaled, every
  instance runs its own `node-cron` schedule and could double-flag/double-notify.
  Fine for one instance (as deployed here); would need a distributed lock or
  a move to Bull before scaling out.
- **Socket auth token freshness:** the socket connects once with whatever
  access token is in memory at connect time. If that token expires mid-session
  the HTTP API silently refreshes via the interceptor, but the existing socket
  connection is not proactively re-authenticated — it will only reconnect
  with a fresh token on the next full page load or explicit reconnect. A
  production fix would re-emit a fresh token to the live socket on refresh.
- **Refresh-token reuse detection** revokes the reused token but doesn't yet
  cascade to revoke every other token for that user, which is the stronger
  response once reuse is detected.
- **No project-level task pagination on the detail page** beyond the shared
  `/api/tasks` page size — fine at seed-data scale, would want infinite
  scroll or server-side virtualization for a project with hundreds of tasks.
- **Presence count is process-local** (an in-memory `Map`), which is correct
  for a single API instance but would need a shared store (Redis) to stay
  correct across multiple instances.
