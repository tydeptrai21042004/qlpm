# Proposed test and acceptance matrix

Status: tests below are **planned acceptance cases**, not proof that a Neon-backed deployment has passed. `npm test` includes executable validation/unit tests, Express HTTP-contract tests (after dependencies are installed), source checks, and optional real-Neon integration coverage. See `tests/README.md`. Record manual run date, tester, evidence and outcome once performed.

| Test | Use case | Condition | Expected result |
|---|---|---|---|
| T01 | UC-01 | Register valid student then sign in | Student session active |
| T02 | UC-01 | Wrong password repeatedly | Rejected; temporary email lockout |
| T03 | UC-02 | Student chooses room preference and submits | Pending application stored with preference |
| T04 | UC-02 | Submit a second active application | HTTP 409; no duplicate |
| T05 | UC-03 | Student withdraws own pending application | Closed/withdrawn and allowed to reapply |
| T06 | UC-03 | Different student tries to withdraw it | Rejected; record unchanged |
| T07 | UC-04 | Staff approves into a room with one free bed | Allocation created and capacity reduced by one |
| T08 | UC-04 | Two approvals compete for last bed | Only one succeeds; no overbooking |
| T09 | UC-05 | Reject without a reason | HTTP 400 |
| T10 | UC-06 | Disable room with assigned students | HTTP 409 |
| T11 | UC-07 | Staff checks out student | Bed released; history inserted; application closed |
| T12 | UC-08 | Student creates issue with priority | Request persists with correct owner/priority |
| T13 | UC-09 | Resolve issue without resolution note | HTTP 400 |
| T14 | UC-09 | Staff resolves with note | Student sees status and resolution |
| T15 | UC-10 | Student/staff add messages | Chronological discussion visible to both |
| T16 | UC-10 | Unrelated student reads another ticket | HTTP 404 |
| T17 | UC-11 | Student reads notification | Read timestamp set for owner only |
| T18 | UC-12 | Update password | Existing other sessions invalidated |
| T19 | UC-13 | Staff opens activity & history | Latest events and checkouts visible; student forbidden |
| T20 | UC-14 | Search/filter then export | All matching rows across pages exported; CSV fields escaped |
| T21 | Crosscutting | Bad JSON, invalid types, forbidden roles | Rejected with explicit status and error |
| T22 | UI | View on desktop and small mobile viewport | Navigation, forms, tables usable without clipping main content |
| T23 | UC-15 | Resident requests an available different room | Pending transfer created with target room and reason |
| T24 | UC-15 | Student submits another request while one pending | HTTP 409; single pending request enforced |
| T25 | UC-16 | Staff approves transfer to a room with a free bed | Target occupancy +1, previous occupancy −1, transfer history stored |
| T26 | UC-16 | Staff approves transfer after destination filled | HTTP 409; room counters unchanged |
| T27 | UC-17 | Student cancels own pending transfer | Request cancelled; another request can be created |
| T28 | UC-18 | Staff approves resident move-out | Allocation ended, approved application closed and history retained |
| T29 | UC-19 | Staff publishes a building-only announcement | Notice is stored with audience and optional expiry |
| T30 | UC-20 | Student allocated to other building reads announcements | Building notice not returned; all-resident notice returned |
| T31 | UC-20 | Archive/expire a published notice | Notice disappears from resident feed |
| T32 | UC-21 | Student requests a resident roster | HTTP 403; staff can inspect the roster |
| T33 | UC-22 | Open Reports and compare counts with raw tables | Only actual current database counts shown, no unsupported trends |
| T34 | UC-23 | Press Ctrl+K and search a room/request | Only authorized records and navigable pages appear |
| T35 | UI | Use keyboard/modal/mobile sidebar and paginate | Focus, keyboard shortcuts, drawer and table controls function |
| T36 | Access control | Student attempts publication or transfer approval | HTTP 403; changes refused |

### Actual execution record (to be filled by the project team)

| Test ID | Date | Tester | Pass/Fail | Evidence link | Defect / follow-up |
|---|---|---|---|---|---|
| | | | | | |

Do not mark tests as executed until they have actually run. In particular, the optional database integration suite is skipped when `TEST_DATABASE_URL` is absent.
