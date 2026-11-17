# API reference

All endpoints use same-origin `/api/...` and JSON. Mutating endpoints other than logout require `Content-Type: application/json`; pass `{}` if the request has no fields. Authenticated calls use the `HttpOnly` session cookie. Student-owned data is protected by server-side role/owner checks.

| Method | Endpoint | Role | Input / purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness check, independent of database
| GET | `/api/ready` | Public | Neon connectivity and schema initialization/readiness |
| POST | `/api/auth/register` | Public | `{name,email,password}`; always student |
| POST | `/api/auth/login` | Public | `{email,password}`; email lockout after repeated failures |
| POST | `/api/auth/logout` | Any | Revoke session |
| GET | `/api/me` | Public | Current user or null |
| PATCH | `/api/me` | Authenticated | `{name}` |
| POST | `/api/me/password` | Authenticated | `{current_password,new_password}` |
| GET | `/api/rooms` | Authenticated | Capacity and available beds |
| POST | `/api/rooms` | Staff | `{code,building,floor,capacity}` |
| PUT | `/api/rooms/:id` | Staff | `{capacity,active,building?,floor?}` |
| GET | `/api/rooms/:id/residents` | Staff | Current room resident roster |
| GET | `/api/students` | Staff | Student directory and allocation |
| GET | `/api/staff` | Staff | Staff names for request assignment |
| GET | `/api/applications` | Authenticated | Staff: all; student: own |
| POST | `/api/applications` | Student | `{note?,preferred_room_id?}` |
| POST | `/api/applications/:id/cancel` | Student owner | `{}`; only pending; marks closed/withdrawn |
| POST | `/api/applications/:id/decision` | Staff | `{decision:'approve',room_id,review_note?}` or `{decision:'reject',review_note}` |
| GET | `/api/allocations` | Authenticated | Staff: all; student: own |
| DELETE | `/api/allocations/:id` | Staff | Check out, release bed, preserve history |
| GET | `/api/allocations/history` | Staff | Last 100 checkouts |
| GET | `/api/housing-changes` | Authenticated | Staff: all; student: own |
| POST | `/api/housing-changes` | Student resident | `{kind:'transfer',target_room_id,reason}` or `{kind:'checkout',reason}` |
| POST | `/api/housing-changes/:id/cancel` | Student owner | Cancel own pending request |
| POST | `/api/housing-changes/:id/decision` | Staff | `{decision:'approve'|'reject',review_note?}` |
| GET | `/api/announcements` | Authenticated | Staff: all; student: published, unexpired notices for all or their allocated building |
| POST | `/api/announcements` | Staff | `{title,body,audience:'all'|'building',building?,pinned?,expires_at?}` |
| PUT | `/api/announcements/:id` | Staff | Update notice fields |
| POST | `/api/announcements/:id/status` | Staff | `{status:'published'|'archived'}` |
| GET | `/api/requests` | Authenticated | Staff: all; student: own |
| POST | `/api/requests` | Student | `{category,priority?,title,description}` |
| PATCH | `/api/requests/:id` | Staff | `{status,priority,assigned_to?,resolution_note?}` |
| GET | `/api/requests/:id/messages` | Staff / student owner | Latest 200 replies |
| POST | `/api/requests/:id/messages` | Staff / student owner | `{message}` |
| GET | `/api/notifications` | Authenticated | Own last 50 notifications |
| POST | `/api/notifications/:id/read` | Recipient | `{}` |
| POST | `/api/notifications/read-all` | Authenticated | `{}` |
| GET | `/api/audit` | Staff | Last 100 actions |

Status values: housing changes `pending`, `approved`, `rejected`, `cancelled` (kinds `transfer`, `checkout`); notices `published`, `archived` (audiences `all`, `building`); applications `pending`, `approved`, `rejected`, `closed` (`withdrawn=true` distinguishes self-withdrawal); service requests `open`, `in_progress`, `resolved`; priorities `low`, `normal`, `high`; categories `maintenance`, `cleaning`, `other`.

API responses use `error` for failures. Expected status codes are 200/201, 400, 401, 403, 404, 409 and 429. Database queries are parameterized. Capacity reservation, allocation, room-transfer approval and move-out checkout use atomic PostgreSQL CTE statements. Audit and notification inserts run as best-effort secondary writes; they do not constitute an immutable audit ledger.


## V6 — KTX Khu A demo extensions

See [`KTX_A_REFERENCE_AND_IMPLEMENTATION.md`](KTX_A_REFERENCE_AND_IMPLEMENTATION.md) for business rules and V7 changes. New routes: `GET /api/room-inspections` (authenticated; students see their own records, staff see all), `POST /api/room-inspections` (assigned students only). `POST /api/requests/:id/feedback` remains supported. All email notification routes from V6 have been removed; the existing `/api/notifications` system remains in-app only.

## CO3011 Project Evidence Center (V9, staff-only)

Every route below requires a valid staff session cookie. Evidence entries use an append-only Neon JSONB table, and binary attachments are stored in Neon BYTEA rather than Vercel ephemeral storage.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/evidence/meta` | Fields and CO3011 evidence categories |
| GET | `/api/evidence` | Recent 80 records, all category counts and file metadata |
| GET | `/api/evidence/assessment` | Evidence-coverage checklist, not approval of authenticity |
| POST | `/api/evidence` | Create a record or a historical revision (`supersedes_id`) |
| POST | `/api/evidence/:id/file` | Binary file upload with `Content-Type` and percent-encoded `X-File-Name`, maximum 850 KB |
| GET | `/api/evidence/files/:id` | Download original file with checksum validation |
| GET | `/api/evidence/export/manifest` | Enumerate all ZIP parts needed to export the project evidence |
| GET | `/api/evidence/export/records/:part` | 0-based record ZIP (40 per archive), with typed CSV, JSON, HTML and optional Gantt/effort SVG |
| GET | `/api/evidence/export/files/:part` | 0-based attachment ZIP parts, with original file contents and manifest |
| GET | `/api/evidence/report?page=0` | Human-readable, print-to-PDF report preview (40 records per page) |

**Caveat:** A project-management report still requires human review and interpretation. The server never creates simulated consultations, fabricated test outcomes or fictional effort data.
