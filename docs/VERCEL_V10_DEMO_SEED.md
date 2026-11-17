# CO3011 V10 – Demo evidence seed on Neon/Vercel

## Vì sao ZIP trước đó rỗng?

V9 only had `SEED_SAMPLE_ROOMS=true`, which adds four sample rooms. It did **not** create rows in `pm_evidence`. Thus `evidence.json` in `co3011-evidence-records-1.zip` contained zero records even though the room count was nonzero. The export was working correctly; the underlying evidence table was empty.

V10 adds **74 explicitly labelled DEMO entries across all 15 CO3011 categories**, a separate demo export, and a real-only coverage/assessment view. It is **not** a tool that fabricates submissions or asserts tasks were completed. A sample client response explicitly states the client has *not* responded, tests state *not executed*, sample baseline status is *draft*, and all dates/estimates are placeholders.

## Recommended approach: seed with one click (Preview / test database)

1. In Neon, **create a separate Preview/test branch**. Never test on a database containing genuine student data.
2. Upload V10 source to GitHub (use **full source** or patch V9→V10).
3. In Vercel → Project → Settings → Environment Variables (Preview environment):

```env
DATABASE_URL=postgresql://...your-test-Neon-branch...
ADMIN_EMAIL=your-staff-email@example.com
ADMIN_PASSWORD=your-strong-password-12-plus-characters
ENABLE_DEMO_EVIDENCE_SEED=true
SEED_SAMPLE_EVIDENCE=false
SEED_SAMPLE_ROOMS=true
```

4. Redeploy Preview. Check `https://your-preview-domain/api/ready` for a successful database connection.
5. Log in as staff → **Hồ sơ CO3011** → **Seed dữ liệu DEMO** → confirm. The page will display **74 demo records across 15 categories** and **0 real records** until genuine data is entered.
6. Click **Xuất bộ bằng chứng**. ZIPs are split clearly:
   - `co3011-evidence-records-*.zip`: **real records only**; ready for further human review, not automatically approved.
   - `co3011-evidence-files-*.zip`: actual uploaded attachments only.
   - `co3011-DEMO-NOT-FOR-SUBMISSION-*.zip`: demo examples, **NEVER submit as project evidence**.
7. Change `ENABLE_DEMO_EVIDENCE_SEED=false` after preview, then redeploy. Previously created demo records remain visible in the Preview database; they are excluded from official exports and assessment.

**Idempotent:** clicking Seed again adds **0** records because every sample has a unique `demo_seed_key`. Existing real records and baseline versions are never overwritten.

## Alternative: automatic seed when the backend initializes

If you prefer seed data on first successful startup, set `SEED_SAMPLE_EVIDENCE=true` together with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Schema creation then inserts the 74 sample records with one idempotent SQL statement. This runs on Vercel cold starts but does not create duplicates. Set it back to `false` and redeploy after initializing the Preview branch. `SEED_SAMPLE_ROOMS` controls rooms **only**, and is independent of the evidence seed.

**Important:** use this automatic option only on an isolated Preview/test branch. On live production, leave both `ENABLE_DEMO_EVIDENCE_SEED=false` and `SEED_SAMPLE_EVIDENCE=false`, and enter real logs, tests, decisions, signatures and attachments manually.

## Data structure and integrity protections

- New database columns `pm_evidence.is_demo BOOLEAN DEFAULT false`, `pm_evidence.demo_seed_key`; unique demo key prevents duplicates.
- Baseline uniqueness applies **only to genuine non-demo baselines**, so demo V1.0 cannot block a real V1.0. Existing real baseline remains immutable.
- Demo entries cannot be revised into a real record or receive evidence file attachments. Use **Tạo bản ghi thật** from the demo detail (opens a clean form); enter verified information and attach real proof.
- Genuine record counts, `coverage.json`, the assignment checklist, hours, and official ZIP exports **exclude** demo entries. Demo records never count toward course completion.
- The export is generated in memory by the Vercel route; Neon persists the records. There is no cron, mail provider, or local file dependency.

## How to clean up demo records (database administrator, Preview branch only)

After setting `SEED_SAMPLE_EVIDENCE=false` and redeploying, you may run this command on **the disposable Preview Neon branch**, not a database containing important data:

```sql
DELETE FROM pm_evidence
WHERE is_demo = true
  AND demo_seed_key LIKE 'co3011-demo-v1-%';
```

The command targets seeded examples only, not genuine manual records. Make a backup before any manual SQL deletion.

## Verify locally

```bash
npm install
npm run check
npm test
npm run test:ui:evidence
```

The route-level seed test checks all 15 categories, idempotency, staff authorization, demo/real separation, attachments, ZIP content, and that V1.0 templates are not counted as baselines. The UI smoke test checks the seed action, visual warning and responsive layout with a mocked backend. A live Neon/Vercel test **must** still be performed before claiming production readiness.

## What must still be collected for the assignment

Client-confirmed interaction logs; a genuine approved Baseline V1.0; product descriptions and diagrams created by the team; time-tracked weekly logs; verified QA runs and screenshots; the lecturer's actual change/event; handover/closure documents; individual contribution evidence; truthful AI use declaration; and a reviewed Final Report PDF. The seed does **not** create any of these.
