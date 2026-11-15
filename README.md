# Campus Housing — CO3011 (v4)

Single-repository student dormitory management application. The same Vercel project serves the frontend and Express API; Neon stores persistent data. It is a **course project with production-oriented engineering practices**, not a certified university production system.

## Tech stack

- Frontend: HTML + CSS + JavaScript (no build pipeline or client framework).
- Backend: Node.js 22+, Express 5 (`server.js`), deployed as Vercel Node.js Functions.
- Database: Neon PostgreSQL through `@neondatabase/serverless`.
- Authentication: scrypt password hashes, server-side session tokens, `HttpOnly` + `SameSite=Strict` cookies; Secure in production.
- One domain, one repository, relative `/api/` URLs, no separate frontend/backend deployment.

## Features

| Student | Residence office |
|---|---|
| Register, sign in and update profile/password | Staff-only sign in and protected dashboard |
| Browse room capacity and availability | Add/edit rooms, update bed capacity and active status |
| Submit housing request with preferred room | Approve/reject with review notes, atomic room assignment |
| Track or withdraw a pending application | View applications, student directory and check out students |
| Submit residence support tickets with priority | Assign tickets, change status/priority, record resolution |
| Exchange replies in a ticket conversation | Reply to students and track request progress |
| Read application/request notifications | View operational events and check-out history |
| Request a room transfer or a managed move-out | Approve/decline requests with transactional occupancy adjustments |
| Read residence announcements and building notices | Publish, edit, pin and archive targeted announcements |
| Browse room status and occupancy | Inspect each room’s current resident roster |
| Search pages, rooms and requests using Ctrl+K | Search, sort, filter and page through records; export filtered CSV |
| Mobile self-service navigation | Operations reports computed from live records |

### Business rules implemented

- A student has at most one pending/approved housing application and at most one active room allocation.
- A preferred room is a request, not a reservation. Staff choose the final room.
- Approval atomically checks that a room is active and has capacity, then creates the allocation. No beds can be overbooked by concurrent approvals.
- An occupied room cannot be disabled or given a capacity below current occupancy.
- Students may withdraw only their own pending applications. Rejections require a staff note.
- Check-out frees the bed, closes the approved application, preserves a checkout-history record, and cancels any pending change request when staff directly checks out a resident.
- Students with a room may request a transfer to a different available room or a move-out. Only one such request may be pending. Staff approvals update room counters and allocation in a single SQL statement. Transfers are recorded in allocation-transfer history.
- Published announcements may target all residents or one building. Building notices are visible only to students currently allocated in that building. Staff can pin and archive notices or set expiry dates.
- A resolved service request requires a resolution note. Students can view and reply to only their own requests.

These are **proposed policies**, not confirmed policies from the lecturer or client. Final acceptance scope must be agreed through the CO3011 client-consultation process.

## Deploy to Vercel and Neon

1. Create a Neon project at https://console.neon.tech/ and copy its pooled PostgreSQL connection URL with `sslmode=require`.
2. Push this folder to GitHub. Keep `.env.local` and `node_modules/` out of Git.
3. Go to https://vercel.com/new, import the GitHub repository, and create **one** project. Set project Root Directory to the directory containing `package.json`. Use Node.js 22 (or a newer supported runtime). No `vercel.json` or frontend build step is needed for this setup.
4. Under Vercel → Project → Settings → Environment Variables, configure:

   | Name | Required | Meaning |
   |---|---|---|
   | `DATABASE_URL` | Yes | Neon PostgreSQL URL, server-side only |
   | `ADMIN_EMAIL` | Yes for staff access | Initial residence staff email |
   | `ADMIN_PASSWORD` | Yes with ADMIN_EMAIL | Strong password (12+ characters, letters and digits) |
   | `ADMIN_NAME` | No | Display name for initial staff account |
   | `SEED_SAMPLE_ROOMS` | No | `true` inserts four example rooms once (per room code) |
   | `PORT` | Local only | Default `3000` |

5. Deploy. On the first API request, the backend creates tables, adds optional columns to a database from the previous version, and creates the first staff account if absent. Visit `https://YOUR-PROJECT.vercel.app/api/health`; expect `{ "ok": true }`. Then open `/`.
6. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Students can register directly through the UI.

**Upgrade from the original ZIP:** Point this version at the same Neon database. The `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements preserve earlier users/rooms/applications/allocations/requests. **Back up your Neon database or create a Neon branch before updating a live deployment.** This is a forward-only schema upgrade; do not roll back code without reviewing schema compatibility.

**Bootstrap note:** Environment variables do not reset an existing staff account password on redeploy. Use Account settings to change it. If you need additional staff accounts, provision them through an approved administrative process; public registration cannot create staff accounts.

## Local development

```bash
cp .env.example .env.local
# Fill DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD in .env.local
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000. Node.js 22+ is required. `npm run db:setup` is optional if the app can initialize on first request. Use a **separate Neon development branch**, not the production database, during local development and integration tests.

## Tests

```bash
npm test
```

Source checks and API/frontend static checks run without a database. Browser rendering can be checked with `python scripts/visual-smoke.py` if Playwright for Python and Chromium are installed; it uses synthetic API data, not a live backend. Full integration tests run only when `TEST_DATABASE_URL` points to a **disposable Neon branch**; they create test data. To enable:

```bash
TEST_DATABASE_URL='postgresql://...' npm test
```

Do not point `TEST_DATABASE_URL` at production. Verification steps for the human acceptance demonstration are in `docs/USE_CASES.md` and `docs/TEST_MATRIX.md`.

## Security and operational considerations

- SQL queries are parameterized; private connection strings stay server-side.
- Students are restricted to their own applications, tickets, messages and notifications by server-side checks.
- Authentication sessions are hashed in the database. Cookie writes are guarded by same-origin checks. Security headers include a restrictive content security policy and frame protection.
- A per-email failed-login lockout reduces password guessing, but is **not** a complete distributed brute-force/DDoS defense. Public sign-up is suitable only for an agreed classroom demo.
- Notifications and activity events are best-effort secondary writes. The activity log is not tamper-proof and is not a substitute for independent project-management records.
- Before using real student records, add managed university SSO, account verification/recovery, institutional privacy/legal review, role provisioning, retention/deletion policy, stronger rate limiting, database migrations managed outside request time, monitoring, backup/recovery drills, accessibility audits, and full database-backed deployment tests.
- Do not store real student personal information for course demonstrations. Use fictional accounts and rooms.

## CO3011 project management obligations

The lecturer assesses planning and execution evidence as well as functioning software. This repository provides an implementation, proposed use cases, proposed traceability and example test cases; it **does not** invent client meetings or actual effort logs. The team must provide its own Client Interaction Log, scope decisions, baseline V1.0 (and approved revisions), PBS/PD/PFD, effort and resource estimates, Gantt/risks, weekly actuals, change analysis, verification evidence, final project report, and individual reflections. The final report must disclose the use of generative AI and the tasks it supported.

See `docs/CO3011_TASK_CHECKLIST.md`, `docs/PROJECT_BRIEF_AND_SCOPE.md`, `docs/PROPOSED_TRACEABILITY.md`, `docs/USE_CASES.md`, `docs/TEST_MATRIX.md`, and `docs/API_REFERENCE.md`.

## New in v4: operational flows and visual design

The resident and staff workspaces are now separate experiences rather than reused tables. The staff homepage prioritizes decisions needing attention and shows factual occupancy by building. The student homepage prioritizes the current room, active issues, and relevant notices. Both now use a light institutional sidebar, mobile navigation drawer, global Ctrl+K command search, readable typography, responsive panels, and consistent dialogs. Long tables support sorting, filtering, ten-row pagination and CSV export of the filtered results.

**Residence announcements:** staff create notices with a title/body, audience (`all` or one building), pin and optional expiry. Student visibility uses the allocation-to-room-building relationship, not a user-entered building label. Archived and expired notices do not appear to students. Residents have read-only access.

**Housing changes:** an allocated student can submit one pending request to move out or transfer to an active room with spare capacity. Staff approve/decline with an optional note (required on rejection). Transfer approval shifts occupancy from one room to another and keeps movement history; move-out approval records an ordinary check-out. A rejected or cancelled request allows another request. The preferred destination can become unavailable before approval, in which case approval fails safely.

**Deployment compatibility:** this version adds `housing_changes`, `allocation_transfers` and `announcements` without dropping the existing dormitory tables. A notification check constraint is widened to allow housing-change update targets. Use a Neon branch/backup to verify the migration before applying to any important database.

**Current verification boundary:** 6 offline source checks passed and the optional database test is skipped without `TEST_DATABASE_URL`. The mocked Chromium test rendered 11 staff and 8 student views with no JavaScript page errors or 390px horizontal overflow. A live Neon/Vercel deployment, transactional behavior under concurrency, and end-to-end institutional security assessment were not verified in this environment. Package installation was not possible here because the registry connection could not be established; run `npm install` on an internet-connected machine or in Vercel.
