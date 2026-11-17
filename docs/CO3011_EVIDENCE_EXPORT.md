> **V10 update:** This document covers V9 behavior. V10 adds staff-only demo seeding with 74 **non-submittable** examples. Official records ZIPs and completeness checks exclude all demos; sample ZIPs are labelled `DEMO-NOT-FOR-SUBMISSION`. See [VERCEL_V10_DEMO_SEED.md](VERCEL_V10_DEMO_SEED.md).

# CO3011 – Evidence Center and Vercel export (V9)

## What the implementation does

The KTX portal remains a **Student Dormitory Management System**. Staff accounts now have a **Hồ sơ CO3011** tab for the **software-project management evidence** required by the eight-page CO3011 assignment. It is a working record system, not an artificial evidence generator.

- Store records in `pm_evidence` (JSONB, author, created timestamp, revision reference). There are 15 categories: `consultation`, `initiation`, `product`, `activity`, `checkpoint`, `risk`, `weekly_log`, `change`, `test`, `traceability`, `baseline`, `artifact`, `closure`, `contribution`, `ai_usage`.
- Keep every record immutable. A correction creates a new record that references the older one. Baseline revisions **cannot** refer to an existing baseline: use a new version like V2.0. Neon has a unique partial index on baseline version, so V1.0 cannot be silently replaced or duplicated.
- Store attachments in `pm_evidence_files` with original filename, MIME, SHA-256, creator, size and BYTEA. An uploaded file must be no more than **850 KB**. Accepted formats: PDF, PNG, JPG, TXT, CSV. Files are not stored on the Vercel filesystem.
- Staff authorization is enforced server-side for listing, writing, file download, report and export. Students are denied access. Operational snapshot exports only aggregate counts; student names/emails are not exported by this new module.
- The `Assessment` checklist checks whether required categories/metadata have been *recorded*, not whether client statements are genuine or the lecturer accepted them. The design never inserts invented consultations, baselines, test results, effort figures or approval.

## Assignment mapping

| Task | Evidence Center category or derived output |
|---|---|
| 1.1 | Client Interaction Log: date, question, real response, impact, source |
| 1.2–1.8 | `initiation` topics: business case, scope, objective, stakeholder, authority, communication, lifecycle, feasibility |
| 2.1–2.3 | `product` descriptions (at least 5), `artifact` PBS and PFD diagram files |
| 2.4–2.7 | `activity` dependencies/effort, `checkpoint`, activity network diagram |
| 2.8–2.9 | `risk` with likelihood/impact (1–5), owner, mitigation, contingency |
| 2.10–2.12 | Resource and quality plan artifacts, schedule and cost, Gantt SVG, approved Baseline V1.0 |
| 3.1–3.5 | Repository/demo reference, weekly logs, actual vs planned, updated risk, verification `test` records |
| 3.6–3.8 | Real lecturer-issued event in `change`, optional new approved baseline, lower-level plan evidence |
| Final 4.1–4.6 | `closure`, objectives evaluation, handover, lessons learned, `contribution`, `ai_usage` |
| Mandatory | `traceability` mapping objective → product → activity → resource → risk → test → checkpoint |

### Real evidence to enter

1. **Client consultation:** paste questions and actual replies with date/source. If consultation has not happened, leave the record absent. Website research does not equal client interaction.
2. **Baseline:** prepare and agree a first plan before marking V1.0 approved. Record approval name/date accurately. Change requests need their actual lecturer/client origin and decision, not fabricated scenarios.
3. **Activity:** assign stable IDs like A01 and product IDs like P01. Enter actual effort/dates from the team's time tracking; planned and actual are different fields.
4. **Test:** create records with test ID, requirement ID, expected/actual, tester, date and genuine result; attach a screenshot/log PDF or reference a repository commit.
5. **Artifact:** use PBS/PFD/Gantt/network/quality/resource/cost tags and upload small diagrams or provide stable repository links. A diagram is not generated if it is not present or derived from valid data.
6. **Traceability:** use exactly the IDs used in the Product/Activity/Test/Risk/Checkpoint registers.
7. **Closure:** complete acceptance/handover, objective evaluation, scope status, outstanding issues and lessons learned with supporting sources; fill individual contribution and AI-declaration entries.

## Export procedure from the deployed Vercel site

1. Open the deployed site over HTTPS and sign in as **staff**.
2. Select **Hồ sơ CO3011** → **Xuất bộ bằng chứng**.
3. Download **every** `co3011-evidence-records-*.zip` and `co3011-evidence-files-*.zip` link in the manifest. These are separate archives rather than a single huge response because Vercel has a response-size limit. Every archive is generated from Neon data at request time.
4. The records ZIP contains `README.txt`, `coverage.json`, `evidence.json`, `all-records.csv`, `csv/*.csv`, `report.html`, `file-manifest.json`, and optionally `charts/gantt.svg` and `charts/weekly-effort.svg`. Each file archive contains `files-index.csv` plus the actual uploaded attachments (original filenames prefixed with record ID).
5. Open `report.html` in a browser and print/save it as **PDF**. There is a direct `Bản in / PDF` preview endpoint, but it presents up to 40 records at once. For more records, use the individual exported HTML reports and compile your human-reviewed Final Report PDF separately.
6. Keep the original baseline and any revised baseline(s) visible for comparison; include source repository link, running instructions, client logs, weekly logs and diagrams in the academic submission package.
7. Verify hashes, dates and authenticity before submitting. Exporting files is not the same as demonstrating completion of CO3011 requirements.

## Limits and release notes

- **850 KB maximum per attachment**; compress scans/diagrams or store larger originals in a private repository and record stable references.
- The server exports at most **40 evidence records per ZIP** and ~2.2 MB original binary attachments per ZIP. Exported responses are capped at 3.9 MB. This prevents the Vercel 4.5 MB response limit from silently truncating a large archive.
- The on-screen list shows the most recent **80** records, while exports include all records. Each ZIP page is generated independently at download time. Avoid editing evidence during multi-part export; download everything before continuing entry. Retain exports in your project repository for an auditable submission snapshot.
- No automated email, cron, cloud storage bucket, external chart service or persistent local disk.
- Requires **Neon PostgreSQL** configured as `DATABASE_URL`; schema is additive via `ensureDatabase()` and two new tables/indexes. Keep database backups before upgrading.
- The PDF report is not generated by a server-side Chromium/LaTeX job; `report.html` is print-ready and user prints to PDF. The final report still requires human-written justification/analysis rather than simply reprinting this archive.
- **No claim of completed Vercel/Neon live tests** is made unless you actually deploy, upload/download files and exercise the end-to-end workflow on a test branch.

## Endpoints (staff role required)

```
GET  /api/evidence/meta
GET  /api/evidence
GET  /api/evidence/assessment
POST /api/evidence                      application/json
POST /api/evidence/:id/file             binary PDF/PNG/JPG/TXT/CSV, X-File-Name: encodeURIComponent(name)
GET  /api/evidence/files/:id
GET  /api/evidence/export/manifest
GET  /api/evidence/export/records/:part
GET  /api/evidence/export/files/:part
GET  /api/evidence/report?page=0
```

Never post file bytes as JSON; the upload route consumes the raw request body, validates MIME/signature and SHA-256, stores bytea with `decode(base64,'base64')`, and returns a file ID. Downloads use `attachment`/`application/octet-stream` to prevent execution of untrusted HTML.
