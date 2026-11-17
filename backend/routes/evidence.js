import {createHash} from 'node:crypto';
import {requireUser,fail,safeId} from '../lib/validation.js';
import {EVIDENCE_TYPES,validateEvidence} from '../lib/evidence-spec.js';
import {assessEvidence} from '../lib/evidence-assessment.js';
import {seedDemoEvidence} from '../lib/evidence-seed.js';
import {DEMO_NOTICE} from '../lib/evidence-demo.js';
import {groupAttachmentParts,recordsZip,reportHTML,safeFilename,zipArchive,digest,csv} from '../lib/evidence-export.js';

const PAGE_SIZE=40;
const FILE_MAX=850*1024;
const FILE_TYPES=new Set(['image/png','image/jpeg','application/pdf','text/plain','text/csv']);
const allowedName=/^[\p{L}\p{N}_().\- %]+$/u;
const jsonNoCache=res=>res.set('Cache-Control','private, no-store');
const jsonError=(status,message)=>Object.assign(new Error(message),{status});
const normalizeTotal=rows=>Number(rows[0]?.total||0);
const decodeName=header=>{
  try{return decodeURIComponent(String(header||''));}catch{return '';}
};
function fileName(raw){
  const name=decodeName(raw).trim();
  if(!name||name.length>120||!allowedName.test(name)||name==='.'||name==='..')fail(400,'Invalid filename. Use letters, digits, spaces and ._-()');
  return name;
}
async function getCounts(query){
  const rows=await query('SELECT kind,is_demo,COUNT(*)::int AS total FROM pm_evidence GROUP BY kind,is_demo');
  const counts=Object.fromEntries(Object.keys(EVIDENCE_TYPES).map(k=>[k,0]));
  const demoCounts={...counts};
  for(const r of rows){
    const target=r.is_demo?demoCounts:counts;
    if(r.kind in target)target[r.kind]=Number(r.total);
  }
  return {counts,demoCounts};
}
const recordCount=async(query,isDemo)=>normalizeTotal(await query(
  'SELECT COUNT(*)::int AS total FROM pm_evidence WHERE is_demo=$1',[isDemo]));
async function getOperations(query){
  // Only aggregate operational counts; never export resident names, emails or password hashes.
  const rows=await query(`SELECT
    (SELECT COUNT(*)::int FROM rooms) AS rooms,
    (SELECT COUNT(*)::int FROM allocations) AS occupied_assignments,
    (SELECT COUNT(*)::int FROM applications) AS applications,
    (SELECT COUNT(*)::int FROM requests) AS requests,
    (SELECT COUNT(*)::int FROM room_inspections) AS room_inspections,
    (SELECT COUNT(*)::int FROM audit_events) AS operational_audit_events`);
  return rows[0]||{};
}
async function getFileMetadata(query){
  return query(`SELECT f.id,f.evidence_id,f.original_name,f.mime_type,f.byte_length,f.sha256,f.created_at,
    COALESCE(u.name,'—') AS author_name FROM pm_evidence_files f
    LEFT JOIN users u ON u.id=f.uploaded_by ORDER BY f.id`);
}
async function getAssessment(query){
  const data=await query('SELECT id,kind,data,supersedes_id,is_demo FROM pm_evidence ORDER BY id');
  return assessEvidence(data);
}
async function getAllRecords(query,offset=0,limit=PAGE_SIZE,isDemo=false){
  return query(`SELECT e.id,e.kind,e.title,e.data,e.supersedes_id,e.created_at,e.occurred_on,e.is_demo,
    COALESCE(u.name,'—') AS author_name FROM pm_evidence e
    LEFT JOIN users u ON u.id=e.created_by WHERE e.is_demo=$1 ORDER BY e.id ASC LIMIT $2 OFFSET $3`,[isDemo,limit,offset]);
}
async function attachZipContent(query,metadata){
  const files=[];
  files.push(['files-index.csv',csv(['id','evidence_id','filename','mime','size','sha256','uploaded_at'],metadata.map(f=>[f.id,f.evidence_id,f.original_name,f.mime_type,f.byte_length,f.sha256,f.created_at]))]);
  for(const meta of metadata){
    const rows=await query(`SELECT encode(content,'base64') AS base64 FROM pm_evidence_files WHERE id=$1`,[meta.id]);
    if(!rows[0])continue;
    const body=Buffer.from(rows[0].base64,'base64');
    if(digest(body)!==meta.sha256)throw new Error(`Attachment hash verification failed for #${meta.id}`);
    files.push([`files/${meta.id}_${safeFilename(meta.original_name)}`,body]);
  }
  return zipArchive(files);
}
function sendZip(res,name,bytes){
  if(bytes.length>3900000)fail(413,'Export part exceeds the Vercel response limit. Contact project administrator.');
  res.set('Cache-Control','private, no-store');
  res.set('Content-Disposition',`attachment; filename="${name}"`);
  res.type('application/zip').send(bytes);
}
export function registerEvidenceRoutes(app,{query,audit}){
  // Endpoint access is limited to staff. Student accounts may not list/export PM evidence.
  app.get('/api/evidence/meta',(req,res)=>{
    requireUser(req,'staff');
    jsonNoCache(res).json({types:EVIDENCE_TYPES,maxFileBytes:FILE_MAX,canSeedDemo:process.env.ENABLE_DEMO_EVIDENCE_SEED==='true'||process.env.SEED_SAMPLE_EVIDENCE==='true',demoNotice:DEMO_NOTICE});
  });
  app.get('/api/evidence',async(req,res)=>{
    requireUser(req,'staff');
    const [realTotal,demoTotal,{counts,demoCounts}]=await Promise.all([
      recordCount(query,false),recordCount(query,true),getCounts(query)]);
    const rows=await query(`SELECT e.id,e.kind,e.title,e.data,e.supersedes_id,e.created_at,e.occurred_on,e.is_demo,
      COALESCE(u.name,'—') AS author_name FROM pm_evidence e
      LEFT JOIN users u ON u.id=e.created_by ORDER BY e.id DESC LIMIT 100`);
    jsonNoCache(res).json({records:rows,total:realTotal+demoTotal,realTotal,demoTotal,counts,demoCounts,files:await getFileMetadata(query)});
  });
  app.post('/api/evidence/demo-seed',async(req,res)=>{
    const user=requireUser(req,'staff');
    if(process.env.ENABLE_DEMO_EVIDENCE_SEED!=='true'&&process.env.SEED_SAMPLE_EVIDENCE!=='true')
      fail(403,'Demo seeding is disabled. Set ENABLE_DEMO_EVIDENCE_SEED=true in Vercel and redeploy.');
    const result=await seedDemoEvidence(query,Number(user.id));
    if(result.inserted)await audit(user.id,'evidence_demo_seeded','pm_evidence',0,`Created ${result.inserted} illustrative records`);
    jsonNoCache(res).json({...result,demo_only:true,warning:DEMO_NOTICE});
  });
  app.get('/api/evidence/assessment',async(req,res)=>{
    requireUser(req,'staff');
    jsonNoCache(res).json(await getAssessment(query));
  });
  app.post('/api/evidence',async(req,res)=>{
    const user=requireUser(req,'staff');
    const item=validateEvidence(req.body);
    if(item.supersedes_id){
      const original=await query('SELECT id,kind,is_demo FROM pm_evidence WHERE id=$1',[item.supersedes_id]);
      if(original[0]?.is_demo)fail(409,'Demo templates cannot be revised into genuine evidence. Create a new real record.');
      if(!original.length||original[0].kind!==item.kind)fail(400,'Revision must reference an existing record of the same type.');
      if(item.kind==='baseline')fail(409,'Baseline records are immutable. Add a NEW version instead (for example V2.0).');
    }
    const created=await query(`INSERT INTO pm_evidence(kind,title,data,created_by,supersedes_id)
      VALUES($1,$2,$3::jsonb,$4,$5) RETURNING id,created_at`,
      [item.kind,item.title,JSON.stringify(item.data),user.id,item.supersedes_id]);
    await audit(user.id,'evidence_created','pm_evidence',created[0].id,`${item.kind}: ${item.title}`);
    jsonNoCache(res).status(201).json({id:created[0].id,created_at:created[0].created_at});
  });
  // Binary attachment upload uses Neon BYTEA: Vercel runtime filesystem is not persistent.
  // Only audited/authorized staff can upload. A strict MIME + size cap prevents huge payloads.
  app.post('/api/evidence/:id/file',async(req,res)=>{
    const user=requireUser(req,'staff'),recordId=safeId(req.params.id);
    const mime=(req.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!FILE_TYPES.has(mime))fail(415,'Supported evidence files: PDF, PNG, JPG, TXT, CSV.');
    const chunks=[];let byteCount=0;
    for await (const part of req){
      byteCount+=part.length;
      if(byteCount>FILE_MAX)fail(413,'Attachment exceeds 850 KB limit.');
      chunks.push(part);
    }
    const body=Buffer.concat(chunks);
    if(!body.length||body.length>FILE_MAX)fail(400,'File is empty or too large (850 KB max).');
    const originalName=fileName(req.get('x-file-name'));
    const validSignature=(mime==='image/png'&&body.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))
      ||(mime==='image/jpeg'&&body[0]===0xff&&body[1]===0xd8)
      ||(mime==='application/pdf'&&body.subarray(0,5).toString()==='%PDF-')
      ||(mime==='text/plain'||mime==='text/csv');
    if(!validSignature)fail(400,'File content does not match its MIME type.');
    const found=await query('SELECT id,is_demo FROM pm_evidence WHERE id=$1',[recordId]);
    if(!found.length)fail(404,'Evidence record not found.');
    if(found[0].is_demo)fail(409,'Demo templates cannot have evidence attachments. Create a real record first.');
    const sha256=createHash('sha256').update(body).digest('hex');
    const rows=await query(`INSERT INTO pm_evidence_files(evidence_id,uploaded_by,original_name,mime_type,byte_length,sha256,content)
      VALUES($1,$2,$3,$4,$5,$6,decode($7,'base64')) RETURNING id`,
      [recordId,user.id,originalName,mime,body.length,sha256,body.toString('base64')]);
    await audit(user.id,'evidence_file_uploaded','pm_evidence_files',rows[0].id,`Evidence file #${recordId}`);
    jsonNoCache(res).status(201).json({id:rows[0].id,sha256,byte_length:body.length});
  });
  app.get('/api/evidence/files/:id',async(req,res)=>{
    requireUser(req,'staff');
    const id=safeId(req.params.id);
    const rows=await query(`SELECT original_name,mime_type,sha256,encode(content,'base64') AS base64
      FROM pm_evidence_files WHERE id=$1`,[id]);
    if(!rows.length)fail(404,'File not found.');
    const data=Buffer.from(rows[0].base64,'base64');
    if(digest(data)!==rows[0].sha256)fail(500,'Attachment checksum mismatch.');
    res.set('Cache-Control','private, no-store');
    res.set('Content-Disposition',`attachment; filename="${safeFilename(rows[0].original_name)}"`);
    res.type('application/octet-stream').send(data);
  });
  app.get('/api/evidence/export/manifest',async(req,res)=>{
    requireUser(req,'staff');
    const [realTotal,demoTotal,files,{counts,demoCounts}]=await Promise.all([
      recordCount(query,false),recordCount(query,true),getFileMetadata(query),getCounts(query)]);
    const fileParts=groupAttachmentParts(files);
    const realParts=Math.max(1,Math.ceil(realTotal/PAGE_SIZE));
    const demoParts=Math.ceil(demoTotal/PAGE_SIZE);
    const parts=[...Array.from({length:realParts},(_,i)=>({
      label:`Bằng chứng THẬT ${i+1}/${realParts}`,name:`co3011-evidence-records-${i+1}.zip`,url:`/api/evidence/export/records/${i}`,scope:'real'})),
      ...fileParts.map((_,i)=>({label:`Tệp đính kèm thật ${i+1}/${fileParts.length}`,name:`co3011-evidence-files-${i+1}.zip`,url:`/api/evidence/export/files/${i}`,scope:'real'})),
      ...Array.from({length:demoParts},(_,i)=>({
        label:`MẪU DEMO (không nộp) ${i+1}/${demoParts}`,name:`co3011-DEMO-NOT-FOR-SUBMISSION-${i+1}.zip`,url:`/api/evidence/export/demo/${i}`,scope:'demo'}))];
    jsonNoCache(res).json({total:realTotal+demoTotal,realTotal,demoTotal,files:files.length,counts,demoCounts,
      parts,demoWarning:demoTotal?DEMO_NOTICE:null,assessment:await getAssessment(query),
      missing:Object.entries(EVIDENCE_TYPES).filter(([k])=>!counts[k]).map(([kind,v])=>({kind,label:v.label}))});
  });
  async function recordsArchive(req,res,isDemo){
    requireUser(req,'staff');
    const part=Number(req.params.part);
    const total=await recordCount(query,isDemo);
    const totalParts=isDemo?Math.ceil(total/PAGE_SIZE):Math.max(1,Math.ceil(total/PAGE_SIZE));
    if(!Number.isSafeInteger(part)||part<0||part>=totalParts)fail(404,'Unknown export part.');
    const [records,{counts,demoCounts},operations,assessment]=await Promise.all([
      getAllRecords(query,part*PAGE_SIZE,PAGE_SIZE,isDemo),getCounts(query),getOperations(query),getAssessment(query)]);
    const zip=recordsZip({records,counts,demoCounts,operations,assessment,part,totalParts,
      generatedAt:new Date().toISOString(),isDemo});
    sendZip(res,isDemo?`co3011-DEMO-NOT-FOR-SUBMISSION-${part+1}.zip`:`co3011-evidence-records-${part+1}.zip`,zip);
  }
  app.get('/api/evidence/export/records/:part',async(req,res)=>recordsArchive(req,res,false));
  app.get('/api/evidence/export/demo/:part',async(req,res)=>recordsArchive(req,res,true));
  app.get('/api/evidence/export/files/:part',async(req,res)=>{
    requireUser(req,'staff');
    const part=Number(req.params.part);
    const groups=groupAttachmentParts(await getFileMetadata(query));
    if(!Number.isSafeInteger(part)||part<0||part>=groups.length)fail(404,'Unknown file archive part.');
    const zip=await attachZipContent(query,groups[part]);
    sendZip(res,`co3011-evidence-files-${part+1}.zip`,zip);
  });
  app.get('/api/evidence/report',async(req,res)=>{
    requireUser(req,'staff');
    const total=await recordCount(query,false);
    const page=Number(req.query.page||0);
    const totalParts=Math.max(1,Math.ceil(total/PAGE_SIZE));
    if(!Number.isSafeInteger(page)||page<0||page>=totalParts)fail(404,'Invalid report page.');
    const records=await getAllRecords(query,page*PAGE_SIZE,PAGE_SIZE);
    const [{counts},operations]=await Promise.all([getCounts(query),getOperations(query)]);
    res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
    res.set('Cache-Control','private, no-store');
    res.type('html').send(reportHTML({records,counts,operations,part:page,totalParts,generatedAt:new Date().toISOString()}));
  });
}
