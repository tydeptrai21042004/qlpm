# Campus Housing

A student residence management application for CO3011 Software Project Management. The system contains a browser frontend, an Express API, and a Neon PostgreSQL database. **There is a real backend; it is not a static frontend or a localStorage demo.** Version 5 makes that backend visible and adds automated API, validation, and database tests.

## Architecture

```
CO3011_Campus_Housing_Pro_V5/
├── server.js                     Node/Vercel entrypoint (exports Express app)
├── backend/
│   ├── app.js                    App factory, security middleware, error handler
│   ├── db/index.js               Neon driver, SQL schema and bootstrap
│   ├── domain/policies.js        Request validation and business input rules
│   ├── lib/context.js            Authentication session and side effects
│   ├── lib/password.js           Scrypt password hashing
│   ├── lib/validation.js         IDs, text, cookie and authorization rules
│   └── routes/
│       ├── auth.js               Sign-in, registration, profile, password
│       ├── rooms.js              Rooms and resident rosters
│       ├── people.js             Student/staff directories
│       ├── applications.js       Dormitory applications and decisions
│       ├── allocations.js        Room assignment and check-out history
│       ├── housing.js            Room transfers and move-out requests
│       ├── announcements.js      Staff notices and residence audience rules
│       ├── requests.js           Maintenance requests and conversations
│       ├── notifications.js      Inbox and read receipts
│       └── audit.js              Staff activity history
├── db/index.js                   Legacy compatibility re-export
├── public/                       Browser frontend: HTML, CSS, JavaScript
├── tests/
│   ├── unit.test.js              Executable domain/validation tests
│   ├── api.test.js               Real Express HTTP tests with fake SQL driver
│   ├── integration.test.js       Real Neon end-to-end workflow (opt-in)
│   ├── source.test.js            Source/structure consistency checks
│   └── README.md                 Test prerequisites and limitations
├── scripts/setup-db.js          Initialize schema and staff bootstrap
├── scripts/visual-smoke.py      Browser smoke tests with synthetic data
├── .github/workflows/ci.yml     Unit and mock API checks in GitHub Actions
└── docs/                         API reference, scope, traceability, use cases
```

**Request path:** browser `fetch('/api/...')` → Express security middleware → session loaded from Neon → role/ownership checks → route handler → parameterized PostgreSQL query → JSON response. The frontend does not receive a database connection string.

## Current functions

| Student | Residence staff |
|---|---|
| Register and sign in | Sign in as staff (bootstrapped from environment variables) |
| View rooms and current capacity | Create, edit, activate/deactivate rooms, inspect resident roster |
| Submit/withdraw accommodation application | Review pending applications and allocate rooms |
| View own room assignment | Check out residents with history retained |
| Submit room transfer or move-out request | Review transfer/move-out requests |
| Open and reply to maintenance tickets | Assign, prioritize and resolve service tickets |
| Read personal notifications and relevant notices | Publish and archive notices by building or whole residence |
| Change profile name and password | View student directory, reports and audit log |

**Important domain rules:** only one active accommodation application or allocation per student; capacity-checked approval; pending housing change limited to one per resident; no unauthorized student access to staff operations or other students' requests; resolution notes required when closing service requests. These are *proposed rules for the assignment*, not policies confirmed by the client.

## Local setup

Install Node.js 22+ and connect a **development Neon branch**. Do not commit secrets or use a production database for test data.

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:setup
npm run dev
```

Visit http://localhost:3000. The initial staff account is created when its configured email does not yet exist. Subsequent redeployments do **not** reset its password.

### Backend verification

After starting the application, open:

- `http://localhost:3000/api/health` — HTTP process alive, does not require the database
- `http://localhost:3000/api/ready` — actually verifies Neon connectivity and schema initialization
- `http://localhost:3000/api/me` — returns `{"user":null}` until logged in

The complete endpoint reference is in [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md).

## Tests

```bash
npm run check                # syntax + dependency-free unit/source checks
npm test                     # all Node tests; Neon test skipped without a test URL
npm run test:api             # actual HTTP requests against Express and a fake SQL adapter
npm run test:coverage        # coverage for actually executed tests
npm run test:ui              # needs Python Playwright + local Chromium
```

For an end-to-end test against an **isolated/disposable Neon branch**:

```bash
TEST_DATABASE_URL='postgresql://...' npm run test:integration
```

Use PowerShell `$env:TEST_DATABASE_URL="..."` on Windows. The integration suite creates persistent test accounts and room records. Delete the disposable branch when finished. See [`tests/README.md`](tests/README.md) for a clear separation between unit, mocked HTTP, real database, and browser tests.

**What has been checked here:** JavaScript syntax; 12 unit test groups; 6 source/structure groups; 11 staff + 8 student browser views using synthetic responses and mobile widths. **What has not been checked here:** installed-dependency HTTP tests, real Neon transactions, Vercel deployment, or a live user journey. Package installation was unavailable in the execution environment because the npm registry was unreachable. Do not claim those tests passed.

## Deploy as one Vercel project

1. Push the extracted folder to a Git repository (without `.env.local`).
2. Import the repository into one Vercel project, pointing its root to this folder.
3. Set Vercel environment variables `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and optional `ADMIN_NAME` / `SEED_SAMPLE_ROOMS`.
4. Deploy, open `/api/ready` and confirm Neon is ready, then sign in to the UI.
5. Test on a Neon branch before connecting a database containing important records.

The root `server.js` default-exports the Express app and Vercel can detect it without a separate frontend/backend deployment. Database tables are created by `npm run db:setup` (or on the first database-backed request). Prefer explicit database migration management for any later production expansion.

## Release and security limitations

This is a course-project implementation, not a university-certified service. Before using real student information, add verified university identity/SSO, staff account lifecycle procedures, persistent rate limiting, monitored migration jobs, backup/recovery tests, retention policies, accessibility checks, and independent security review. The audit log is best-effort, not an immutable ledger.

## CO3011 assessment evidence

The assignment requires genuine client consultation, project baseline V1.0, revised baseline when approved, PBS/PFD, estimates, risks, resources, weekly actuals, change decisions, verification evidence and individual contributions. The code and draft traceability files are useful starting points; they are **not substitutes for actual project-management evidence**. Disclose AI-assisted development in the final report as required by the assignment.
