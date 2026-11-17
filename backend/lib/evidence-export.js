import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {EVIDENCE_TYPES} from './evidence-spec.js';

// Standards-compliant ZIP writer. Pure Node, no disk writes, safe in Vercel functions.
const table=Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);return c>>>0;});
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
export function zipArchive(files){
  const parts=[],central=[];let offset=0;
  for(const [name,raw] of files){
    if(!/^[\w.\-/]+$/.test(name)||name.includes('..')||name.startsWith('/'))throw Error('Unsafe ZIP entry name');
    const label=Buffer.from(name,'utf8'),plain=Buffer.isBuffer(raw)?raw:Buffer.from(String(raw),'utf8');
    const packed=deflateRawSync(plain),crc=crc32(plain);
    const head=Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(8,8);
    head.writeUInt32LE(crc,14);head.writeUInt32LE(packed.length,18);head.writeUInt32LE(plain.length,22);head.writeUInt16LE(label.length,26);
    parts.push(head,label,packed);
    const dir=Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);dir.writeUInt16LE(8,10);
    dir.writeUInt32LE(crc,16);dir.writeUInt32LE(packed.length,20);dir.writeUInt32LE(plain.length,24);dir.writeUInt16LE(label.length,28);dir.writeUInt32LE(offset,42);
    central.push(dir,label);offset+=head.length+label.length+packed.length;
  }
  if(files.length>65535)throw Error('Too many ZIP entries');
  const centralBytes=central.reduce((v,b)=>v+b.length,0),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(centralBytes,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...parts,...central,end]);
}
export const digest=buf=>createHash('sha256').update(buf).digest('hex');
export const safeFilename=str=>String(str).replace(/[^\w.\-]/g,'_').slice(0,100)||'evidence';
const csvCell=value=>'"'+String(value??'').replaceAll('"','""').replace(/^([=+\-@\t\r])/,'\x27$1')+'"';
export const csv=(head,rows)=>'\uFEFF'+[head,...rows].map(a=>a.map(csvCell).join(',')).join('\r\n')+'\r\n';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function getMissingKinds(counts){return Object.entries(EVIDENCE_TYPES).filter(([key])=>!Number(counts[key]||0)).map(([key,v])=>({kind:key,label:v.label,task:v.task}));}
export function groupAttachmentParts(files,maxBytes=2200000){
  const groups=[];let current=[],size=0;
  for(const file of files){
    if(current.length&&size+Number(file.byte_length)>maxBytes){groups.push(current);current=[];size=0;}
    current.push(file);size+=Number(file.byte_length);
  }
  if(current.length)groups.push(current);
  return groups;
}
function currentEntries(records){
  const old=new Set(records.map(r=>Number(r.supersedes_id)).filter(Boolean));
  return records.filter(r=>!old.has(Number(r.id)));
}
const dateNumber=x=>{if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x))return null;const t=Date.parse(x+'T00:00:00Z');return Number.isFinite(t)?t:null;};
export function ganttSvg(records){
  const tasks=currentEntries(records).filter(r=>r.kind==='activity').map(r=>({
    label:String(r.data?.activity_id||r.title).slice(0,34),
    planStart:dateNumber(r.data?.planned_start),planEnd:dateNumber(r.data?.planned_finish),
    actualStart:dateNumber(r.data?.actual_start),actualEnd:dateNumber(r.data?.actual_finish)
  })).filter(r=>r.planStart!==null&&r.planEnd!==null&&r.planEnd>=r.planStart).slice(0,50);
  if(!tasks.length)return '';
  const bounds=tasks.flatMap(t=>[t.planStart,t.planEnd,t.actualStart,t.actualEnd].filter(x=>x!==null));
  const start=Math.min(...bounds),finish=Math.max(...bounds,start+86400000),left=245,plot=760,w=1060;
  const x=time=>left+Math.round((time-start)/(finish-start)*plot);
  const height=96+tasks.length*34;
  const lines=tasks.map((t,i)=>{
    const y=81+i*34,pX=x(t.planStart),pW=Math.max(3,x(t.planEnd)-pX);
    const actual=t.actualStart!==null?`<rect x="${x(t.actualStart)}" y="${y+11}" width="${Math.max(3,x(t.actualEnd??t.actualStart)-x(t.actualStart))}" height="7" rx="3" fill="#127a62"/>`:'';
    return `<line x1="${left}" y1="${y+26}" x2="${left+plot}" y2="${y+26}" stroke="#e8eee9"/><text x="15" y="${y+15}" font-size="13" fill="#28483b">${escapeHtml(t.label)}</text><rect x="${pX}" y="${y}" width="${pW}" height="9" rx="4" fill="#97bfc8"/>${actual}`;
  }).join('');
  const from=new Date(start).toISOString().slice(0,10),to=new Date(finish).toISOString().slice(0,10);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height}" width="100%" role="img" aria-label="Gantt planned and actual dates">
  <rect width="${w}" height="${height}" fill="white"/><text x="15" y="27" font-size="17" font-weight="bold" fill="#174c3d">Gantt · Planned vs Actual</text>
  <rect x="650" y="15" width="16" height="8" rx="3" fill="#97bfc8"/><text x="674" y="23" font-size="11" fill="#456254">Plan</text><rect x="750" y="15" width="16" height="8" rx="3" fill="#127a62"/><text x="775" y="23" font-size="11" fill="#456254">Actual</text>
  <text x="${left}" y="55" font-size="12" fill="#739185">${from}</text><text x="${left+plot}" y="55" text-anchor="end" font-size="12" fill="#739185">${to}</text>
  <line x1="${left}" y1="65" x2="${left+plot}" y2="65" stroke="#bed9c9"/>${lines}</svg>`;
}
export function effortTrendSvg(records){
  const grouped=new Map();
  for(const entry of currentEntries(records).filter(r=>r.kind==='weekly_log')){
    const week=entry.data?.week_start;if(dateNumber(week)===null)continue;
    const v=grouped.get(week)||{planned:0,actual:0};
    v.planned+=Number(entry.data.planned_hours||0);v.actual+=Number(entry.data.actual_hours||0);grouped.set(week,v);
  }
  const weeks=[...grouped].sort(([a],[b])=>a.localeCompare(b)).slice(0,40);
  if(!weeks.length)return '';
  let plan=0,actual=0;
  const values=weeks.map(([week,v])=>({week,plan:plan+=v.planned,actual:actual+=v.actual}));
  const max=Math.max(1,...values.flatMap(v=>[v.plan,v.actual]));const w=980,h=270,left=73,top=64,plotW=840,plotH=153;
  const x=i=>left+(values.length===1?plotW/2:i*plotW/(values.length-1));
  const y=v=>top+plotH-(v/max)*plotH;
  const dots=(key,color)=>`<polyline points="${values.map((v,i)=>`${x(i)},${y(v[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v[key])}" r="4" fill="${color}"/>`).join('')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Cumulative weekly effort chart">
  <rect width="${w}" height="${h}" fill="white"/><text x="15" y="27" font-size="17" fill="#174c3d" font-weight="bold">Weekly effort · Cumulative hours</text>
  <line x1="${left}" y1="${top+plotH}" x2="${left+plotW}" y2="${top+plotH}" stroke="#b1cabf"/>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${top+plotH}" stroke="#b1cabf"/>
  <text x="15" y="${top+7}" font-size="12" fill="#739185">${max.toFixed(1)} h</text><text x="48" y="${top+plotH+5}" font-size="12" fill="#739185">0</text>
  ${dots('plan','#8cabbf')}${dots('actual','#158168')}
  <text x="${left}" y="${h-20}" font-size="12" fill="#739185">${escapeHtml(values[0].week)}</text><text x="${left+plotW}" y="${h-20}" text-anchor="end" font-size="12" fill="#739185">${escapeHtml(values.at(-1).week)}</text>
  <rect x="590" y="15" width="16" height="8" rx="3" fill="#8cabbf"/><text x="614" y="23" font-size="11">Planned</text><rect x="705" y="15" width="16" height="8" rx="3" fill="#158168"/><text x="729" y="23" font-size="11">Actual</text></svg>`;
}
export function reportHTML({records,counts,generatedAt,part,totalParts,operations}){
  const missing=getMissingKinds(counts);
  const gantt=ganttSvg(records),effort=effortTrendSvg(records);
  const byKind=Object.entries(EVIDENCE_TYPES).map(([kind,spec])=>{
    const entries=records.filter(x=>x.kind===kind);
    const header=`<h2>${escapeHtml(spec.label)} <small>${escapeHtml(spec.task)}</small></h2>`;
    if(!entries.length)return `${header}<p class="muted">${counts[kind]?'Không có bản ghi trong phần ZIP này.':'Chưa có bằng chứng được nhập.'}</p>`;
    return header+entries.map(e=>`<article><h3>#${e.id} – ${escapeHtml(e.title)}</h3><p class="muted">${escapeHtml(e.author_name||'—')} · ${escapeHtml(e.created_at)} · ${e.supersedes_id?`Sửa từ #${e.supersedes_id}`:'Bản ghi gốc'}</p><dl>${spec.fields.map(f=>e.data?.[f.key]!==undefined?`<dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(e.data[f.key])}</dd>`:'').join('')}</dl></article>`).join('');
  }).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CO3011 – Project Evidence – Part ${part+1}</title>
<style>*{box-sizing:border-box}body{font:14px/1.6 Arial,sans-serif;max-width:960px;margin:40px auto;color:#203d35;padding:0 24px}h1{font-size:28px;margin:0}h2{color:#11644d;margin:38px 0 10px;padding-bottom:10px;border-bottom:2px solid #c9e3d6}h2 small{color:#678479;font-size:12px;margin-left:8px}h3{font-size:16px;margin:0}.muted{color:#6d8179}.lead{background:#f0f8f3;padding:18px;border-left:4px solid #168364}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #dce7df;padding:8px;text-align:left}article{margin:13px 0 20px;border:1px solid #e0e7e2;padding:15px;border-radius:8px;break-inside:avoid}dl{display:grid;grid-template-columns:190px 1fr;gap:7px 12px}dt{color:#608275;font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.warning{color:#984e20}@media print{body{margin:0;padding:0}h2{break-after:avoid}article{break-inside:avoid}a{color:inherit}}</style>
<h1>CO3011 · Project Evidence Report</h1><p class="muted">Student Dormitory Management System · Export ${escapeHtml(generatedAt)} · Records part ${part+1}/${totalParts}</p>
<p class="lead">Đây là bằng chứng nhóm đã nhập, KHÔNG phải báo cáo cuối kỳ được tự động xác nhận. Lịch sử chỉnh sửa được giữ bằng bản ghi mới; không có nhật ký hoặc kết quả kiểm thử giả.</p>
<h2>Checklist evidence</h2><table><thead><tr><th>Milestone / category</th><th>Stored entries (all parts)</th></tr></thead><tbody>${Object.entries(EVIDENCE_TYPES).map(([k,v])=>`<tr><td>${escapeHtml(v.milestone)} – ${escapeHtml(v.label)}</td><td>${Number(counts[k]||0)}</td></tr>`).join('')}</tbody></table>
${missing.length?`<p class="warning"><strong>Missing sections:</strong> ${missing.map(v=>escapeHtml(v.label)).join('; ')}.</p>`:'<p>All categories have at least one entry. Check quality and completeness manually.</p>'}
<h2>Operational snapshot (not test results)</h2><p class="muted">Đếm các bản ghi hiện có trên Neon tại thời điểm xuất. Không thay thế project logs hoặc test evidence.</p>
<table><tbody>${Object.entries(operations||{}).map(([key,val])=>`<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(val)}</td></tr>`).join('')}</tbody></table>
${gantt?`<h2>Gantt · Activity records (this part)</h2>${gantt}`:''}${effort?`<h2>Weekly effort (this part)</h2>${effort}`:''}${byKind}<hr><p class="muted">Trước khi nộp: kiểm tra log client, xác nhận baseline, đủ số Product Descriptions, đối chiếu planned/actual, liên kết artefact thực và khai báo AI. Trong trình duyệt chọn Print → Save as PDF.</p></html>`;
}
export function recordsZip({records,counts,operations,assessment=null,part,totalParts,generatedAt}){
  const files=[['README.txt',`CO3011 EVIDENCE EXPORT\nGenerated: ${generatedAt}\nPart: ${part+1}/${totalParts}\nScope: content entered in Project Evidence Center plus Neon operational counts.\nNo fabricated entries. Missing categories are reported in coverage.json.\nImage/PDF attachments are supplied in evidence-files-*.zip parts, if uploaded.\nPrint report.html to PDF in your browser; review and write final academic narrative separately.\nOriginal V1.0 and revisions are append-only.\n`],
    ['evidence.json',JSON.stringify({generatedAt,part:part+1,totalParts,records},null,2)],
    ['report.html',reportHTML({records,counts,operations,part,totalParts,generatedAt})],
    ['coverage.json',JSON.stringify({counts,missing:getMissingKinds(counts),operations,assessment},null,2)],
    ['all-records.csv',csv(['id','kind','title','created_at','author','supersedes_id','data_json'],records.map(r=>[r.id,r.kind,r.title,r.created_at,r.author_name,r.supersedes_id||'',JSON.stringify(r.data)]))]];
  const gantt=ganttSvg(records),effort=effortTrendSvg(records);
  if(gantt)files.push(['charts/gantt.svg',gantt]);
  if(effort)files.push(['charts/weekly-effort.svg',effort]);
  for(const [kind,spec] of Object.entries(EVIDENCE_TYPES)){
    const related=records.filter(r=>r.kind===kind);
    files.push([`csv/${kind}.csv`,csv(['id','title','created_at','author','supersedes_id',...spec.fields.map(f=>f.key)],related.map(r=>[r.id,r.title,r.created_at,r.author_name,r.supersedes_id||'',...spec.fields.map(f=>r.data?.[f.key]??'')]))]);
  }
  const manifest=files.map(([name,body])=>({name,sha256:digest(Buffer.from(body))}));
  files.push(['file-manifest.json',JSON.stringify(manifest,null,2)]);
  return zipArchive(files);
}
