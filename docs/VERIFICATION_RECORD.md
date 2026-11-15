# Verification record — 2026-11-15

This file distinguishes **tests actually executed in the preparation environment** from tests that are only packaged for later execution. Evidence is from the commands run on the v5 source tree.

| Check | Command | Result | Important boundary |
|---|---|---|---|
| Node syntax for backend modules and entrypoint | `node --check` on every backend `.js` and `server.js` | Passed | Does not verify live route behavior |
| Pure validation and session/audit tests | `npm run test:unit` | **12 groups passed** | No Express or database needed |
| Source and architecture checks | `npm run test:source` | **6 groups passed** | Checks source structure and SQL patterns, not transactions |
| Combined test command | `npm test` | **18 passed, 2 skipped, 0 failed** | API test skipped because dependencies unavailable; Neon integration skipped without `TEST_DATABASE_URL` |
| UI smoke in Chromium/Playwright | `python scripts/visual-smoke.py` | **19 views rendered** (11 staff, 8 student); no JS page errors or 390px overflow | Uses synthetic API responses, not live backend |
| Actual Express HTTP contract suite | `npm run test:api` | **Not executed** | Requires `npm install` to make Express/Neon packages available; 13 subtests are included |
| Actual Neon end-to-end transactions including race on last bed | `npm run test:integration` | **Not executed** | Requires an isolated, disposable Neon `TEST_DATABASE_URL` |
| Vercel deployment | Deploy via Vercel | **Not executed** | Requires authenticated project configuration and Neon credentials |

During preparation, an attempted `npm install --no-audit --no-fund --prefer-offline --fetch-retries=0` returned `EAI_AGAIN` because the npm registry could not be resolved. Do not report the HTTP API tests as passed until dependencies have been installed and they are executed.

## Required release checklist

1. On an internet-connected machine: run `npm install`, `npm test`, `npm run test:coverage`, and examine all skipped tests.
2. Create a disposable Neon branch; run the database suite; confirm its concurrency and no-overbooking assertions succeed.
3. Deploy to Vercel with server-side `DATABASE_URL`, verify `/api/ready`, and manually exercise student/staff authentication, application, allocation and maintenance flows.
4. Record dated screenshots, server logs and Git commit references for the CO3011 project execution evidence.
