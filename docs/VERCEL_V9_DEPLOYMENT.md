# Deploy & acceptance checklist – V9 (Vercel + Neon)

**Project:** CO3011 Student Dormitory Management System – simulated KTX Khu A, not an official KTX service.

## 1. Prepare

- Node.js 22 or newer. Install dependencies with `npm install` on an internet-connected device.
- Before upgrading a working Neon database, take a backup/snapshot or create a Neon branch. No existing table is dropped by V9. New tables: `pm_evidence`, `pm_evidence_files`; index `pm_evidence_baseline_version_idx`.
- Never commit `.env.local` or passwords. Set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optionally `ADMIN_NAME`; keep `SEED_SAMPLE_ROOMS=false` for deployed environments.
- Do **not** configure email tokens, Resend, cron or object storage; they are not used.

## 2. Local acceptance

```bash
cp .env.example .env.local
npm install
npm run db:setup
npm run check
npm test
npm run test:api
npm run test:ui
npm run test:ui:evidence
# TEST_DATABASE_URL must point to a disposable Neon branch for this command:
npm run test:integration
npm run dev
```

Expected: `/api/ready` returns `{"ok":true,"database":"ready"}` only after Neon schema setup. Test both student and staff end-to-end workflows, especially full allocation and room capacity. Staff should see **Hồ sơ CO3011**; student must not see or access `/api/evidence`.

## 3. Vercel configuration

- Import this source repository and choose the folder with `server.js` and `package.json` as **Root Directory**. Keep the existing `vercel.json` and default Express auto-detection.
- Configure the Neon pooled `DATABASE_URL` in the Vercel dashboard for the intended environment; create an isolated database branch for Preview.
- Set the staff login variables with a strong secret. Deploy. Open `https://<deployment>/api/health` and `https://<deployment>/api/ready`.
- Log in as staff, add **one real** weekly log, one test record and one small PDF/PNG; download the original via the evidence details dialog. Open Export and download both ZIP portions; verify contents with `unzip -l` or Python `zipfile`.
- Test `/api/evidence` access while logged in as student (should return 403), signed out (401), and as staff (200). Test HTTP origin policy and Content-Security-Policy with browser devtools.
- Confirm that V1.0 baseline cannot be revised/overwritten; new version V2.0 can be created after approval.
- Set external backup/retention policies separately if the team plans to host real personal data. The demo itself should use fictitious residents and clearly display its simulation status.

## 4. Academic release evidence

Save the actual Vercel URL, Git commit SHA, version/tag, deployment timestamp, screenshot of `/api/ready`, actual test output logs and (where appropriate) screenshots of the live portal. Enter only the real results into the Evidence Center and retain baseline versions. Do not label synthetic Playwright fixtures as client consultations or operational test results.

The downloadable HTML is print-ready but is **not** a substitute for the final management analysis/report. The course requires a human-reviewed project-management report PDF, a repository with run instructions, baseline comparisons, interaction/weekly logs, diagrams, risk register and traceability; check the LMS for dates.

## 5. Failure modes

- `503 DATABASE_URL is missing`: set Vercel env var, redeploy.
- `500 schema failed`: check Neon role privileges and Vercel logs; run `npm run db:setup` on the testing branch.
- Upload `413`: shrink file to <=850 KB. Images can be reduced in resolution; use actual source reference for a larger artifact.
- ZIP `413`: rare highly incompressible oversized record page. Reduce individual record text or export fewer records per page (lower `PAGE_SIZE` constant); do not strip evidence silently.
- If evidence ZIP is incomplete, verify you downloaded **all** numbered record and file archives from the manifest.
- Browser PDF print output: open `report.html`, select Print → Save as PDF; check Vietnamese text is readable, page breaks and tables before final submission.
