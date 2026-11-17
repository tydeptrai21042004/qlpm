import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {inflateRawSync} from 'node:zlib';
import {registerEvidenceRoutes} from '../backend/routes/evidence.js';

function fixture(){
  const handlers=new Map(),rows=[],files=[];
  const app={get:(path,fn)=>handlers.set('GET '+path,fn),post:(path,fn)=>handlers.set('POST '+path,fn)};
  const query=async(sql,p=[])=>{
    const s=sql.replace(/\s+/g,' ').trim();
    if(s.startsWith('SELECT COUNT(*)::int AS total FROM pm_evidence'))return [{total:rows.filter(r=>Boolean(r.is_demo)===Boolean(p[0])).length}];
    if(s.startsWith('SELECT kind,is_demo,COUNT(*)::int AS total'))return Object.entries(Object.groupBy(rows,r=>`${r.kind}::${Boolean(r.is_demo)}`)).map(([key,rs])=>({kind:rs[0].kind,is_demo:Boolean(rs[0].is_demo),total:rs.length}));
    if(s.startsWith('SELECT id,kind,data,supersedes_id,is_demo FROM pm_evidence'))return rows;
    if(s.startsWith('SELECT e.id,e.kind,e.title'))return s.includes('DESC')?[...rows].reverse().slice(0,100):rows.filter(r=>Boolean(r.is_demo)===Boolean(p[0])).slice(p[2],p[2]+p[1]);
    if(s.startsWith('SELECT f.id,f.evidence_id'))return files.map(f=>({...f,author_name:'Staff'}));
    if(s.startsWith('SELECT (SELECT COUNT(*)'))return [{rooms:4,occupied_assignments:2,applications:2,requests:1,room_inspections:0,operational_audit_events:2}];
    if(s.startsWith('INSERT INTO pm_evidence (kind,title,data,created_by,is_demo,demo_seed_key)')){
      const payload=JSON.parse(p[0]),added=[];
      for(const row of payload){if(rows.some(r=>r.demo_seed_key===row.seed_key))continue;
        const record={...row,demo_seed_key:row.seed_key,id:rows.length+1,is_demo:true,created_at:'2026-11-17T08:00:00Z',author_name:'Staff'};
        rows.push(record);added.push({id:record.id});}
      return added;
    }
    if(s.startsWith('INSERT INTO pm_evidence(')){
      const r={id:rows.length+1,kind:p[0],title:p[1],data:JSON.parse(p[2]),created_by:p[3],supersedes_id:p[4],is_demo:false,created_at:'2026-11-17T08:00:00Z',author_name:'Staff'};
      rows.push(r);return [{id:r.id,created_at:r.created_at}];
    }
    if(s.startsWith('SELECT id,kind,is_demo FROM pm_evidence'))return rows.filter(r=>r.id===p[0]).map(r=>({id:r.id,kind:r.kind,is_demo:Boolean(r.is_demo)}));
    if(s.startsWith('SELECT id,is_demo FROM pm_evidence WHERE id='))return rows.filter(r=>r.id===p[0]).map(r=>({id:r.id,is_demo:Boolean(r.is_demo)}));
    if(s.startsWith('INSERT INTO pm_evidence_files(')){
      const r={id:files.length+1,evidence_id:p[0],uploaded_by:p[1],original_name:p[2],mime_type:p[3],byte_length:p[4],sha256:p[5],created_at:'2026-11-17T08:01:00Z',base64:p[6]};
      files.push(r);return [{id:r.id}];
    }
    if(s.startsWith('SELECT encode(content,\'base64\') AS base64 FROM pm_evidence_files'))return files.filter(f=>f.id===p[0]).map(f=>({base64:f.base64}));
    if(s.startsWith('SELECT original_name,mime_type,sha256,encode(content'))return files.filter(f=>f.id===p[0]);
    throw Error('Fixture SQL missing: '+s);
  };
  registerEvidenceRoutes(app,{query,audit:async()=>{}});
  const invoke=async(method,path,{user={id:1,role:'staff'},body={},params={},headers={},queryParams={}}={})=>{
    const fn=handlers.get(method+' '+path);assert.ok(fn,`${method} ${path} is wired`);
    const req=Object.assign(Readable.from(Buffer.isBuffer(body)?[body]:[]),{user,body:Buffer.isBuffer(body)?undefined:body,params,query:queryParams,get:name=>headers[name.toLowerCase()]});
    const res={statusCode:200,headers:{},set(name,v){this.headers[name.toLowerCase()]=v;return this;},type(v){this.contentType=v;return this;},status(s){this.statusCode=s;return this;},json(v){this.payload=v;return this;},send(v){this.payload=v;return this;}};
    await fn(req,res);return res;
  };
  return {invoke,rows,files};
}
function getNames(zip){
  const found=[];let p=0;while(p+30<=zip.length&&zip.readUInt32LE(p)===0x04034b50){
    const n=zip.readUInt16LE(p+26),e=zip.readUInt16LE(p+28),z=zip.readUInt32LE(p+18);
    found.push(zip.subarray(p+30,p+30+n).toString());p+=30+n+e+z;
  }return found;
}
const weekly={kind:'weekly_log',title:'Week 3 actual',data:{week_start:'2026-11-16',member:'Dev A',planned_work:'Create endpoints',actual_work:'Ran tests',planned_hours:10,actual_hours:8,action:'Merge PR after review'}};
test('staff-only CRUD, missing evidence and Vercel ZIP end-to-end via injected query adapter',async()=>{
  const {invoke,rows}=fixture();
  await assert.rejects(()=>invoke('GET','/api/evidence',{user:null}),{status:401});
  await assert.rejects(()=>invoke('GET','/api/evidence',{user:{id:2,role:'student'}}),{status:403});
  await assert.rejects(()=>invoke('POST','/api/evidence',{body:{kind:'weekly_log',title:'Invalid',data:{}}}),{status:400});
  assert.equal((await invoke('GET','/api/evidence')).payload.total,0);
  const created=await invoke('POST','/api/evidence',{body:weekly});
  assert.equal(created.statusCode,201);
  assert.equal(created.payload.id,1);
  assert.equal(rows.length,1);
  const list=await invoke('GET','/api/evidence');
  assert.equal(list.payload.total,1);
  assert.equal(list.payload.counts.weekly_log,1);
  const assessed=await invoke('GET','/api/evidence/assessment');
  assert.equal(assessed.payload.checks.find(x=>x.task==='3.2').status,'recorded');
  const manifest=await invoke('GET','/api/evidence/export/manifest');
  assert.equal(manifest.payload.parts.length,1);
  assert.ok(manifest.payload.missing.length>10);
  const archive=await invoke('GET','/api/evidence/export/records/:part',{params:{part:'0'}});
  assert.equal(archive.contentType,'application/zip');
  assert.ok(Buffer.isBuffer(archive.payload));
  assert.ok(getNames(archive.payload).includes('csv/weekly_log.csv'));
  assert.ok(getNames(archive.payload).includes('coverage.json'));
  await assert.rejects(()=>invoke('GET','/api/evidence/export/records/:part',{user:{id:2,role:'student'},params:{part:'0'}}),{status:403});
  await assert.rejects(()=>invoke('GET','/api/evidence/export/records/:part',{params:{part:'999'}}),{status:404});
  const report=await invoke('GET','/api/evidence/report',{queryParams:{page:'0'}});
  assert.match(report.payload,/Week 3 actual/);
  assert.match(report.headers['content-security-policy'],/default-src 'none'/);
});
test('baseline is append-only and cannot be revised in place',async()=>{
  const {invoke}=fixture();
  const base={kind:'baseline',title:'Project Baseline V1.0',data:{version:'V1.0',status:'draft',scope:'KTX core workflows',schedule:'Weeks 1–8',planned_hours:150,quality:'Test acceptance'}};
  assert.equal((await invoke('POST','/api/evidence',{body:base})).statusCode,201);
  await assert.rejects(()=>invoke('POST','/api/evidence',{body:{...base,supersedes_id:1}}),{status:409});
  assert.equal((await invoke('POST','/api/evidence',{body:{...base,title:'Project Baseline V2.0',data:{...base.data,version:'V2.0'}}})).statusCode,201);
});
test('binary attachment goes into DB, downloads with checksum, and appears in separate ZIP part',async()=>{
  const {invoke,files}=fixture();
  await invoke('POST','/api/evidence',{body:weekly});
  const pdf=Buffer.from('%PDF-1.4\nmock evidence\n');
  const posted=await invoke('POST','/api/evidence/:id/file',{params:{id:'1'},body:pdf,headers:{'content-type':'application/pdf','x-file-name':encodeURIComponent('Báo cáo.pdf')}});
  assert.equal(posted.statusCode,201);
  assert.equal(files.length,1);
  await assert.rejects(()=>invoke('POST','/api/evidence/:id/file',{user:{id:3,role:'student'},params:{id:'1'},body:pdf,headers:{'content-type':'application/pdf','x-file-name':'A.pdf'}}),{status:403});
  const result=await invoke('GET','/api/evidence/files/:id',{params:{id:'1'}});
  assert.equal(result.contentType,'application/octet-stream');
  assert.deepEqual(result.payload,pdf);
  const manifest=await invoke('GET','/api/evidence/export/manifest');
  assert.equal(manifest.payload.parts.length,2);
  const part=await invoke('GET','/api/evidence/export/files/:part',{params:{part:'0'}});
  assert.ok(getNames(part.payload).some(x=>x.endsWith('.pdf')));
  assert.ok(getNames(part.payload).includes('files-index.csv'));
});
function readZipEntry(zip,name){
  let offset=0;
  while(offset+30<=zip.length&&zip.readUInt32LE(offset)===0x04034b50){
    const label=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28),length=zip.readUInt32LE(offset+18);
    const current=zip.subarray(offset+30,offset+30+label).toString('utf8');
    const body=zip.subarray(offset+30+label+extra,offset+30+label+extra+length);
    if(current===name)return inflateRawSync(body).toString('utf8');
    offset+=30+label+extra+length;
  }
  throw Error('ZIP entry not found: '+name);
}
test('demo seed fills 15 sample categories idempotently without creating genuine evidence or fake coverage',async()=>{
  const old=process.env.ENABLE_DEMO_EVIDENCE_SEED;
  process.env.ENABLE_DEMO_EVIDENCE_SEED='true';
  try {
    const {invoke,rows}=fixture();
    await assert.rejects(()=>invoke('POST','/api/evidence/demo-seed',{user:null}),{status:401});
    await assert.rejects(()=>invoke('POST','/api/evidence/demo-seed',{user:{id:2,role:'student'}}),{status:403});
    const seeded=(await invoke('POST','/api/evidence/demo-seed')).payload;
    assert.equal(seeded.inserted,74);
    assert.equal(seeded.seeded_total,74);
    assert.equal((await invoke('POST','/api/evidence/demo-seed')).payload.inserted,0);
    assert.equal(rows.length,74);
    assert.ok(rows.every(r=>r.is_demo&&r.title.includes('[DEMO]')));
    const list=(await invoke('GET','/api/evidence')).payload;
    assert.equal(list.realTotal,0);
    assert.equal(list.demoTotal,74);
    assert.deepEqual(Object.keys(list.demoCounts).length,15);
    assert.ok(Object.values(list.demoCounts).every(v=>v>0));
    assert.ok(Object.values(list.counts).every(v=>v===0));
    const check=(await invoke('GET','/api/evidence/assessment')).payload;
    assert.equal(check.recorded,0);
    assert.equal(check.checks.find(x=>x.task==='2.12'&&x.label.includes('V1.0')).status,'missing');
    const manifest=(await invoke('GET','/api/evidence/export/manifest')).payload;
    assert.equal(manifest.parts.filter(p=>p.scope==='real').length,1);
    assert.equal(manifest.parts.filter(p=>p.scope==='demo').length,2);
    assert.equal(manifest.missing.length,15);
    const real=(await invoke('GET','/api/evidence/export/records/:part',{params:{part:'0'}})).payload;
    const realJson=JSON.parse(readZipEntry(real,'evidence.json'));
    assert.equal(realJson.records.length,0);
    const demo=(await invoke('GET','/api/evidence/export/demo/:part',{params:{part:'0'}})).payload;
    const demoJson=JSON.parse(readZipEntry(demo,'evidence.json'));
    assert.equal(demoJson.records.length,40);
    assert.equal(demoJson.demo_only,true);
    assert.match(readZipEntry(demo,'README.txt'),/DO NOT SUBMIT AS EVIDENCE/);
    assert.match(readZipEntry(demo,'report.html'),/KHÔNG DÙNG ĐỂ NỘP/);
    assert.deepEqual(Object.values(JSON.parse(readZipEntry(demo,'coverage.json')).counts).filter(Boolean),[]);
    await assert.rejects(()=>invoke('POST','/api/evidence',{body:{...weekly,supersedes_id:1}}),{status:409});
    const pdf=Buffer.from('%PDF-1.4\nmock evidence\n');
    await assert.rejects(()=>invoke('POST','/api/evidence/:id/file',{
      params:{id:'1'},body:pdf,headers:{'content-type':'application/pdf','x-file-name':'sample.pdf'}}),{status:409});
    await invoke('POST','/api/evidence',{body:weekly});
    const realAfter=(await invoke('GET','/api/evidence')).payload;
    assert.equal(realAfter.realTotal,1);
    assert.equal(realAfter.counts.weekly_log,1);
    assert.equal(realAfter.demoTotal,74);
  } finally {
    if(old===undefined)delete process.env.ENABLE_DEMO_EVIDENCE_SEED;
    else process.env.ENABLE_DEMO_EVIDENCE_SEED=old;
  }
});
