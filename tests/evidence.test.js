import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EVIDENCE_TYPES,validateEvidence} from '../backend/lib/evidence-spec.js';
import {zipArchive,recordsZip,groupAttachmentParts,ganttSvg,effortTrendSvg,reportHTML,getMissingKinds} from '../backend/lib/evidence-export.js';

const bad=(fn,pattern)=>assert.throws(fn,err=>err.status===400&&pattern.test(err.message));
const example=(overrides={})=>({kind:'weekly_log',title:'Actual weekly review',data:{
  week_start:'2026-11-16',member:'Dev A',planned_work:'Build allocation tests',actual_work:'Ran unit tests',
  planned_hours:10,actual_hours:8,action:'Close blocker on next review',...overrides}});
function unzipSimple(buffer){
  const result=new Map();let p=0;
  while(p+30<=buffer.length && buffer.readUInt32LE(p)===0x04034b50){
    const compressed=buffer.readUInt32LE(p+18),nameLength=buffer.readUInt16LE(p+26),extra=buffer.readUInt16LE(p+28);
    const name=buffer.subarray(p+30,p+30+nameLength).toString('utf8');
    const body=buffer.subarray(p+30+nameLength+extra,p+30+nameLength+extra+compressed);
    result.set(name,inflateRawSync(body));p+=30+nameLength+extra+compressed;
  }
  return result;
}
test('CO3011 full category coverage, with no seeded evidence',()=>{
  assert.equal(Object.keys(EVIDENCE_TYPES).length,15);
  for(const required of ['consultation','initiation','product','activity','checkpoint','risk','weekly_log','change','test','traceability','baseline','artifact','closure','contribution','ai_usage'])assert.ok(EVIDENCE_TYPES[required]);
  assert.equal(getMissingKinds({}).length,15);
});
test('validation prevents invented/invalid field data and malformed dates',()=>{
  const correct=validateEvidence(example());assert.equal(correct.data.actual_hours,8);
  bad(()=>validateEvidence({...example(),kind:'unknown'}),/Unknown/);
  bad(()=>validateEvidence(example({week_start:'2026-02-30'})),/invalid date/i);
  bad(()=>validateEvidence(example({planned_hours:-2})),/invalid number/);
  bad(()=>validateEvidence(example({random_field:'invalid'})),/Unknown/);
  bad(()=>validateEvidence({...example(),title:'x'}),/Title/);
  bad(()=>validateEvidence({...example(),supersedes_id:'!'}),/revision/);
  bad(()=>validateEvidence({kind:'risk',title:'Risk 1',data:{risk_id:'R01',description:'A risk',probability:6,impact:5,owner:'Dev',mitigation:'Plan',contingency:'Backup',status:'open'}}),/invalid number/);
});
test('baseline approval requires identifiable reviewer; syntax and data are checked',()=>{
  const base={kind:'baseline',title:'Baseline proposal V1.0',data:{version:'V1.0',status:'draft',scope:'Minimal accommodation system',schedule:'Weeks 1–8',planned_hours:120,quality:'Pass acceptance tests'}};
  assert.equal(validateEvidence(base).data.version,'V1.0');
  bad(()=>validateEvidence({...base,data:{...base.data,version:'Final'}}),/Version/);
  bad(()=>validateEvidence({...base,data:{...base.data,status:'approved'}}),/reviewer/i);
  assert.equal(validateEvidence({...base,data:{...base.data,status:'approved',approved_by:'Course client',approved_on:'2026-11-17'}}).data.status,'approved');
});
test('ZIP exports all typed CSV and JSON with sanitization, report and manifests',()=>{
  const records=[{id:1,kind:'weekly_log',title:'Sprint effort',created_at:'2026-11-17T01:00:00Z',author_name:'Dev A',supersedes_id:null,data:{...example().data,actual_work:'=HYPERLINK("http://malicious")'}},
    {id:2,kind:'consultation',title:'Client & scope',created_at:'2026-11-17T01:00:00Z',author_name:'PM',data:{consulted_on:'2026-11-15',client:'Real client',question:'scope <img onerror=alert(1)>',response:'Confirmed',impact:'No email notifications'}}];
  const buffer=recordsZip({records,counts:{weekly_log:1,consultation:1},operations:{rooms:4},part:0,totalParts:1,generatedAt:'2026-11-17T08:00:00Z'});
  assert.equal(buffer.readUInt32LE(0),0x04034b50);
  const files=unzipSimple(buffer);
  for(const name of ['README.txt','evidence.json','report.html','coverage.json','all-records.csv','csv/weekly_log.csv','csv/consultation.csv','csv/baseline.csv','file-manifest.json'])assert.ok(files.has(name),name);
  assert.ok(files.get('report.html').toString().includes('&lt;img'));
  assert.ok(!files.get('report.html').toString().includes('<img onerror'));
  assert.ok(files.get('csv/weekly_log.csv').toString().includes("'=HYPERLINK"));
  assert.deepEqual(JSON.parse(files.get('evidence.json')).records.length,2);
  assert.equal(JSON.parse(files.get('coverage.json')).operations.rooms,4);
  assert.ok(buffer.length<3900000);
});
test('ZIP path traversal rejected and binary extraction intact',()=>{
  assert.throws(()=>zipArchive([['../secret.txt','bad']]),/Unsafe/);
  const raw=Buffer.from('Vietnamese: Ký túc xá','utf8');
  assert.deepEqual(unzipSimple(zipArchive([['data/evidence.txt',raw]])).get('data/evidence.txt'),raw);
});
test('file chunking stays under Vercel payload budget',()=>{
  const files=Array.from({length:7},(_,i)=>({id:i+1,byte_length:800000}));
  const groups=groupAttachmentParts(files);
  assert.equal(groups.length,4);
  assert.ok(groups.every(g=>g.reduce((sum,f)=>sum+f.byte_length,0)<=2200000));
});
test('real-record charts are omitted when no logs and escaped when present',()=>{
  assert.equal(ganttSvg([]),'');assert.equal(effortTrendSvg([]),'');
  const gantt=ganttSvg([{id:1,kind:'activity',data:{activity_id:'A01 <script>',planned_start:'2026-11-15',planned_finish:'2026-11-20',actual_start:'2026-11-16',actual_finish:'2026-11-21'}}]);
  assert.match(gantt,/Gantt/);assert.match(gantt,/&lt;script&gt;/);assert.doesNotMatch(gantt,/<script>/);
  const trend=effortTrendSvg([{id:1,kind:'weekly_log',data:{week_start:'2026-11-16',planned_hours:10,actual_hours:8}}]);
  assert.match(trend,/Weekly effort/);
});
test('backend and UI are wired to restricted, persistent evidence routes',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const app=readFileSync(path.join(root,'backend/app.js'),'utf8');
  const db=readFileSync(path.join(root,'backend/db/index.js'),'utf8');
  const routes=readFileSync(path.join(root,'backend/routes/evidence.js'),'utf8');
  const frontend=readFileSync(path.join(root,'public/app.js'),'utf8');
  assert.match(app,/registerEvidenceRoutes\(app, context\)/);
  assert.match(app,/\/evidence\\\/\\d\+\\\/file/);
  assert.match(db,/CREATE TABLE IF NOT EXISTS pm_evidence/);
  assert.match(db,/CREATE TABLE IF NOT EXISTS pm_evidence_files/);
  assert.match(db,/pm_evidence_baseline_version_idx/);
  for(const api of ['/api/evidence/meta','/api/evidence/export/manifest','/api/evidence/export/records/:part','/api/evidence/export/files/:part','/api/evidence/report'])assert.ok(routes.includes(api));
  assert.match(routes,/requireUser\(req,'staff'\)/);
  assert.match(routes,/decode\(\$7,'base64'\)/);
  assert.match(frontend,/evidencePage\(\)/);
});

test('assignment checklist reports missing work honestly, including five product descriptions',async()=>{
  const {assessEvidence}=await import('../backend/lib/evidence-assessment.js');
  const blank=assessEvidence([]);
  assert.ok(blank.missing>15);
  assert.equal(blank.checks.find(x=>x.task==='2.2').status,'missing');
  assert.equal(blank.checks.find(x=>x.task==='3.6').status,'conditional');
  const records=Array.from({length:5},(_,i)=>({id:i+1,kind:'product',data:{product_id:`P${i+1}`}}));
  assert.equal(assessEvidence(records).checks.find(x=>x.task==='2.2').status,'recorded');
});
