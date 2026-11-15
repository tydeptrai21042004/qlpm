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
