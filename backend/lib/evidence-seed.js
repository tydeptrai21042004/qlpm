import {DEMO_EVIDENCE,DEMO_TOTAL} from './evidence-demo.js';

// A single idempotent SQL statement avoids partial batches and works on Vercel.
// No external API, files or clock-dependent pseudo-events are needed.
export async function seedDemoEvidence(query,staffId) {
  if (!Number.isSafeInteger(Number(staffId)) || Number(staffId)<1) throw new Error('Seed requires an existing staff user.');
  const rows=await query(`INSERT INTO pm_evidence (kind,title,data,created_by,is_demo,demo_seed_key)
    SELECT sample.kind,sample.title,sample.data,$2,TRUE,sample.seed_key
    FROM jsonb_to_recordset($1::jsonb)
      AS sample(seed_key text,kind text,title text,data jsonb)
    ON CONFLICT (demo_seed_key) DO NOTHING RETURNING id`,
  [JSON.stringify(DEMO_EVIDENCE.map(({seed_key,kind,title,data})=>({seed_key,kind,title,data}))),Number(staffId)]);
  return {inserted:rows.length,seeded_total:DEMO_TOTAL};
}
