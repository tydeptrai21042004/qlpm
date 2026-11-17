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
    if(s.startsWith('SELECT COUNT(*)::int AS total FROM pm_evidence'))return [{total:rows.length}];
    if(s.startsWith('SELECT kind,COUNT(*)::int AS total'))return Object.entries(Object.groupBy(rows,r=>r.kind)).map(([kind,rs])=>({kind,total:rs.length}));
    if(s.startsWith('SELECT id,kind,data,supersedes_id FROM pm_evidence'))return rows;
    if(s.startsWith('SELECT e.id,e.kind,e.title'))return s.includes('DESC')?[...rows].reverse():rows.slice(p[1],p[1]+p[0]);
    if(s.startsWith('SELECT f.id,f.evidence_id'))return files.map(f=>({...f,author_name:'Staff'}));
    if(s.startsWith('SELECT (SELECT COUNT(*)'))return [{rooms:4,occupied_assignments:2,applications:2,requests:1,room_inspections:0,operational_audit_events:2}];
    if(s.startsWith('INSERT INTO pm_evidence(')){
      const r={id:rows.length+1,kind:p[0],title:p[1],data:JSON.parse(p[2]),created_by:p[3],supersedes_id:p[4],created_at:'2026-11-17T08:00:00Z',author_name:'Staff'};
      rows.push(r);return [{id:r.id,created_at:r.created_at}];
    }
    if(s.startsWith('SELECT id,kind FROM pm_evidence'))return rows.filter(r=>r.id===p[0]).map(r=>({id:r.id,kind:r.kind}));
    if(s.startsWith('SELECT id FROM pm_evidence WHERE id='))return rows.filter(r=>r.id===p[0]).map(r=>({id:r.id}));
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
