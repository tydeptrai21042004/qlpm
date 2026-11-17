# Test strategy and evidence

This project has four deliberately distinct test layers. They must not be confused:

| Test | Command | Runs without Neon? | What is actually exercised |
|---|---|---|---|
| Pure validation/unit and room inspection | `npm run test:unit` | Yes, and no `npm install` needed | IDs, text, room rules, announcements, ticket resolution rules, housing-change requests, cookies, password verification |
| Source/structure | `npm run test:source` | Yes, no `npm install` needed | Files, endpoint registration, SQL constraint patterns, frontend integration patterns (not functionality) |
| HTTP API contract | `npm run test:api` | Yes, after `npm install` | **Actual Express request handlers** exercised with a deterministic in-memory SQL adapter; permission checks, statuses, errors, login, staff/student actions |
| Neon transactional integration | `npm run test:integration` | **No**: requires a disposable Neon branch | Real database: applications, allocation, capacity, transfers, checkout, messages, announcements, notifications, access control, concurrent final-bed approvals |
| Frontend browser smoke | `npm run test:ui` | Yes, but requires Python Playwright and Chromium | Renders UI with mocked API responses; views, dialogs, keyboard shortcut, 390px mobile overflow |

## Running tests

```bash
npm install
npm test
npm run test:ui                  # optional Python Playwright + Chromium
```

`npm test` runs the source, unit and HTTP tests. The Neon test is **explicitly skipped** unless `TEST_DATABASE_URL` is set. The HTTP tests are also skipped before `npm install` because Express/Neon packages are not present.

Create a **new, disposable Neon test branch** (do not use production). On Unix/macOS:

```bash
TEST_DATABASE_URL='postgresql://user:pass@host/db?sslmode=require' npm run test:integration
```

On Windows PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
npm run test:integration
```

The database test creates staff, students, rooms, notices, requests and allocations. All of this data persists; **delete the disposable branch after the run**.

The room inspection tests check student permissions, invalid states, client room-id spoofing, server-side allocation lookup, and record visibility.

## What tests cannot prove

- Unit/source tests do not execute the backend's SQL on PostgreSQL.
- HTTP API tests use an in-memory adapter, so they do not prove SQL transactions or migrations work.
- The Neon suite runs on one isolated database and does not simulate Vercel deployment, load testing, or data-center outages.
- The UI smoke script stubs API responses and cannot prove a real frontend-to-Neon workflow.

Before submission, record a passing Neon integration run and a manual/demo run against the deployed Vercel project. Add screenshots and meaningful Git commits as execution evidence for CO3011. Avoid declaring all tests passed if any were skipped.
