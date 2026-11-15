# Revision 5.0 — Explicit backend structure and test coverage

- Moved the real Express API into `backend/` route modules. The root `server.js` remains a thin Vercel entrypoint. The Neon driver and database schema now live at `backend/db/index.js` with a compatibility import from `db/index.js`.
- Introduced `createApp(adapter)` dependency injection for real HTTP route tests that use a deterministic SQL test adapter, without touching production credentials.
- Extracted business input policies from handlers for direct unit testing (rooms, announcements, tickets, housing changes).
- Added 12 executable unit test groups, 6 source checks, an HTTP contract suite with 13 subtests after `npm install`, and a real-Neon concurrency regression case for last-bed approvals.
- Added CI on push/pull request, a test strategy guide, and dedicated liveness (`/api/health`) and Neon readiness (`/api/ready`) endpoints.
- Strengthened integer and announcement-flag validation.
- Original client UI and core database workflows are retained; no real student data was imported.
- Verification here: unit/source checks and mocked-browser smoke passed. Live Neon and installed-dependency HTTP tests were not run in this environment.

---

# Revision 4.0 — Residence workflows and product UI

The existing single Vercel Express project and Neon schema have been retained and extended.

## New workflows

- Student room transfers and move-out requests; pending/cancelled/approved/rejected states, optional staff decisions, notifications, capacity-checked atomic approvals, and transfer history.
- Staff-to-resident announcements with building targeting, pinned notices, expiry, edit/republish/archive controls and role-based visibility.
- Staff-only room resident roster and expanded student profile/activity details.
- Computed operational reports for occupancy and service activity.

## User interface

- Rebuilt staff and student overview screens with separate information priorities.
- Light institutional sidebar and grouped navigation, compact workspace header, mobile slide-out drawer.
- Global searchable command menu (`Ctrl+K` or `/`), real table sorting/pagination, filtering, complete filtered CSV export, improved empty states, dialogs, and readable form controls.
- Added detailed desktop/mobile browser rendering checks using synthetic data.

## Data and quality

- Added backward-compatible `housing_changes`, `allocation_transfers` and `announcements` tables and widened the notification target constraint.
- Expanded API references, use cases and the Neon integration test with new permission and occupancy assertions.
- No uploaded real student data is included. Live Neon integration remains unverified without test credentials.

---

# Revision 3.0 — Campus Housing

Upgraded from the supplied `CO3011_Dormitory_Vercel_Neon_FullStack` project. The single Vercel Express deployment and Neon PostgreSQL architecture are preserved.

## Functional additions

- Student accommodation room preference and pending application withdrawal.
- Staff review details, required rejection notes, and room/building/floor updates.
- Check-out history retained independently of active allocations.
- Service request priority, staff assignment, resolution notes, and student/staff replies.
- In-app notifications for application decisions, staff replies and request changes.
- Student profile update and authenticated password change with other-session revocation.
- Residence office operational activity view and CSV export.

## UI changes

- Replaced the original generic landing/dashboard layouts with a compact university administration workspace.
- Clearer navigation, active states, occupancy meters, searchable tables, status filters, accessible dialogs, and mobile layouts.
- Escaped server-derived content; prevented spreadsheet formula execution on CSV export fields.

## Backend and data changes

- Added `request_messages`, `notifications`, `audit_events`, `allocation_history`, and `login_attempts` tables.
- Added backward-compatible columns to `applications` and `requests` through `ALTER TABLE ... IF NOT EXISTS`.
- Maintained the original capacity-checked atomic allocation and release logic.
- Added security headers, staff/owner access checks for new endpoints and account lockout on repeated failed sign-ins.

## Verification boundary

Static tests and JavaScript syntax checks run locally. Browser rendering was checked with synthetic API responses (no JS runtime errors observed). The database integration test requires a disposable Neon test branch and has not been run here. Real production deployment/security testing remains necessary.
