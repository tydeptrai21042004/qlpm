/* CO3011 Project Evidence Center, staff-only, backed by Neon. No fake/seeded evidence. */
'use strict';
const EVIDENCE_MAX_UPLOAD = 850*1024;
const evidenceKeys = {consultation:'M1',initiation:'M1',product:'M2',activity:'M2',checkpoint:'M2',risk:'M2/M3',weekly_log:'M3',change:'M3',test:'M3',traceability:'All',baseline:'M2/M3',artifact:'All',closure:'Final',contribution:'Final',ai_usage:'Final'};
async function loadEvidence(){
  if(state.user?.role!=='staff')return;
  const [meta,stored,assessment]=await Promise.all([api('/api/evidence/meta'),api('/api/evidence'),api('/api/evidence/assessment')]);
  state.evidence={...stored,types:meta.types,maxFileBytes:meta.maxFileBytes,assessment};
  if(!state.evidenceFilter)state.evidenceFilter='all';
}
function evidenceTemplate(field,value=''){
  const key=`e_${field.key}`,caption=field.label,required=field.required?'required':'';
  if(field.type==='select')return select(key,caption,field.options.map(x=>[x,x.replaceAll('_',' ')]),value,required);
  if(field.type==='textarea')return textarea(key,caption,`${required} maxlength="2500" rows="3"`,value);
  if(field.type==='date')return fieldTextEvidence(key,caption,'date',value,required);
  if(field.type==='number'||field.type==='rating')return fieldTextEvidence(key,caption,'number',value,`${required} step="${field.type==='rating'?'1':'0.25'}" min="${field.type==='rating'?'1':'0'}" max="${field.type==='rating'?'5':'1000000000'}"`);
  return fieldTextEvidence(key,caption,'text',value,`${required} maxlength="2500"`);
}
function fieldTextEvidence(key,labelText,inputType,value='',attributes=''){
  return `<div class="field"><label for="${esc(key)}">${esc(labelText)}</label><input id="${esc(key)}" name="${esc(key)}" type="${esc(inputType)}" value="${esc(value)}" ${attributes}></div>`;
}
function evidenceForm(kind='consultation',revision=null){
  const types=state.evidence?.types||{},spec=types[kind];if(!spec)return;
  const original=revision&&state.evidence.records.find(x=>x.id===Number(revision));
  const data=original?.data||{};
  const form=`<div class="ev-modal-title"><span class="ev-kicker">${esc(spec.milestone)} · ${esc(spec.task)}</span><h2>${original?'Bổ sung bản sửa đổi':'Tạo minh chứng dự án'}</h2><p>${esc(spec.label)}</p></div>
  <form id="evidence-form" data-kind="${esc(kind)}" ${original?`data-supersedes="${original.id}"`:''} class="form ev-form">
    <div class="ev-modal-fields">${select('ev_kind','Nhóm minh chứng',Object.entries(types).map(([k,v])=>[k,v.label]),kind)}
    ${fieldTextEvidence('ev_title','Tiêu đề bản ghi','text',original?.title||'','required minlength="3" maxlength="150"')}
    ${spec.fields.map(f=>evidenceTemplate(f,data[f.key]??'')).join('')}
    <div class="ev-upload"><label for="ev_file">Tệp minh chứng (không bắt buộc)</label><input id="ev_file" name="ev_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,application/pdf,image/png,image/jpeg,text/plain,text/csv"><p>Tối đa 850 KB/tệp; lưu trên Neon, không lưu trên filesystem Vercel. Có thể đính kèm thêm sau.</p></div></div>
    ${kind==='baseline'?'<p class="ev-hint">Baseline là bản ghi bất biến. V1.0 không bị ghi đè; thay đổi kế hoạch phải có version mới và căn cứ phê duyệt.</p>':'<p class="ev-hint">Mỗi lần sửa tạo một bản ghi mới và giữ lịch sử bản gốc.</p>'}
    <div class="ev-actions"><button class="btn primary" type="submit">${icon('check')}Lưu bằng chứng</button>${action('close-modal','Hủy','secondary')}</div>
  </form>`;
  openModal(form,'CO3011 Evidence');
}
function evidenceFilesHtml(recordId){
  const files=(state.evidence?.files||[]).filter(f=>Number(f.evidence_id)===Number(recordId));
  if(!files.length)return '<p class="muted ev-muted">Chưa đính kèm tệp.</p>';
  return `<ul class="ev-files">${files.map(f=>`<li><span>${icon('download')} <strong>${esc(f.original_name)}</strong><small>${(Number(f.byte_length)/1024).toFixed(0)} KB · SHA-256 ${esc(String(f.sha256).slice(0,12))}…</small></span><a class="btn subtle sm" href="/api/evidence/files/${f.id}">Tải tệp</a></li>`).join('')}</ul>`;
}
function viewEvidence(id){
  const item=state.evidence?.records.find(x=>x.id===Number(id));if(!item)return;
  const type=state.evidence.types[item.kind];
  const blocks=type.fields.filter(f=>item.data?.[f.key]!==undefined).map(f=>`<div class="ev-detail-row"><dt>${esc(f.label)}</dt><dd>${esc(item.data[f.key])}</dd></div>`).join('');
  openModal(`<div class="ev-modal-title"><span class="ev-kicker">${esc(type.label)} · #${item.id}</span><h2>${esc(item.title)}</h2><p>Người nhập: ${esc(item.author_name)} · ${date(item.created_at)}</p></div>
    ${item.supersedes_id?`<p class="ev-hint">Bản sửa đổi từ #${esc(item.supersedes_id)}. Lịch sử trước đó được giữ nguyên.</p>`:''}
    <dl class="ev-details">${blocks}</dl><div class="ev-file-heading"><h3>Tệp đính kèm</h3><span class="muted">Bản gốc được lưu trên Neon</span></div>${evidenceFilesHtml(item.id)}
    <div class="ev-upload ev-upload-compact"><label for="ev_append_file">Thêm ảnh / PDF / CSV / TXT</label><input type="file" id="ev_append_file" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"><div class="ev-actions">${action('ev-upload-file','Đính kèm tệp','secondary',item.id,'plus')}</div></div>
    <div class="ev-actions">${item.kind!=='baseline'?action('ev-revise','Tạo bản sửa đổi','primary',item.id):''}${action('close-modal','Đóng','secondary')}</div>`,'Project evidence detail');
}
function evBar(labelText,value,total){
  const n=Math.max(0,Number(value)||0),pct=total?Math.min(100,Math.round(n/total*100)):0;
  return `<div class="ev-bar"><div><strong>${esc(labelText)}</strong><b>${n}</b></div><progress max="100" value="${pct}">${pct}%</progress></div>`;
}
function evidencePage(){
  const ev=state.evidence;
  if(!ev)return `${section('Hồ sơ quản lý dự án','Đang tải bằng chứng từ Neon…')}`;
  const kinds=Object.entries(ev.types),missing=kinds.filter(([kind])=>!Number(ev.counts[kind]||0));
  const total=Number(ev.total||0),latest=ev.records||[],filter=state.evidenceFilter||'all',visible=filter==='all'?latest:latest.filter(e=>e.kind===filter);
  const revisions=new Set(latest.map(x=>Number(x.supersedes_id)).filter(Boolean));
  const activities=latest.filter(x=>x.kind==='activity'&&!revisions.has(Number(x.id)));
  const planned=activities.reduce((sum,a)=>sum+Number(a.data.planned_hours||0),0);
  const actual=activities.reduce((sum,a)=>sum+Number(a.data.actual_hours||0),0);
  const covered=kinds.length-missing.length;
  const baseline=latest.filter(x=>x.kind==='baseline').map(x=>x.data?.version).filter(Boolean).join(' · ')||'Chưa có';
  const recent=visible.slice(0,150);
  return `${section('Project Evidence Center','CO3011 · Theo dõi công việc, kiểm thử và xuất hồ sơ quản lý dự án từ Neon.',
    `${action('ev-add','Thêm bằng chứng','primary','','plus')}${action('ev-export','Xuất bộ bằng chứng','secondary','','download')}`)}
    <div class="ev-header"><div><span>PROJECT CONTROL · CO3011</span><h2>Một nguồn dữ liệu. Một bộ bằng chứng.</h2><p>Lưu lịch sử thực hiện và xuất bộ ZIP có CSV, JSON, báo cáo HTML cùng tệp đính kèm. Bản ghi chưa nhập không tự được xem là đã hoàn tất.</p>
    <div class="ev-header-actions">${action('ev-add','Ghi nhận mới','primary','','plus')}<a class="btn secondary" href="/api/evidence/report" target="_blank" rel="noopener noreferrer">${icon('download')}Bản in / PDF</a></div></div><div class="ev-header-count"><strong>${covered}<small>/${kinds.length}</small></strong><span>nhóm đã có dữ liệu</span></div></div>
    <div class="ev-stat-row">${stat('Bản ghi đã lưu',number(total),'Bao gồm lịch sử sửa đổi')}${stat('Tệp đính kèm',number(ev.files.length),'PDF · PNG · JPG · TXT · CSV')}${stat('Baseline hiện có',baseline,'Không ghi đè bản V1.0')}${stat('Giờ công thực tế',number(actual),'Kế hoạch: '+number(planned)+' giờ (các activity hiển thị)')}</div>
    <div class="ev-grid">
      ${panel('Độ phủ bằng chứng',`<div class="ev-progress-head"><strong>${covered}/${kinds.length} nhóm có dữ liệu</strong><span>Chưa đủ nghĩa vụ nộp nếu thiếu chất lượng / phê duyệt</span></div><progress class="ev-main-progress" max="${kinds.length}" value="${covered}">${covered}</progress>
        <div class="ev-coverage">${kinds.map(([key,val])=>`<button type="button" class="ev-cover-item ${ev.counts[key]?'has':'missing'}" data-action="ev-kind-filter" data-id="${esc(key)}"><span class="ev-cover-dot"></span><span>${esc(val.label)}<small>${esc(val.task)} · ${Number(ev.counts[key]||0)} bản ghi</small></span>${icon('chevron')}</button>`).join('')}</div>`,'','Phân nhóm bám theo Milestone 1, 2, 3 và Final của CO3011.')}
      ${panel('Theo dõi thực hiện',`${evBar('Client consultation',ev.counts.consultation,Math.max(1,total))}${evBar('Activity + Weekly Log',Number(ev.counts.activity||0)+Number(ev.counts.weekly_log||0),Math.max(1,total))}${evBar('Risk + Change',Number(ev.counts.risk||0)+Number(ev.counts.change||0),Math.max(1,total))}${evBar('Testing / Quality',ev.counts.test,Math.max(1,total))}
        <div class="ev-effort"><div><span>Kế hoạch</span><strong>${number(planned)} h</strong></div><div><span>Thực tế</span><strong>${number(actual)} h</strong></div></div>
        <p class="ev-hint">Biểu đồ phản ánh số bản ghi, không phải % hoàn thành đồ án. Giờ công chỉ tính các hoạt động có trong danh sách đang hiển thị.</p>
        <div class="ev-mini-actions">${action('ev-add','Thêm Weekly Log','subtle','weekly_log','plus')}${action('ev-export','Tải hồ sơ','subtle','','download')}</div>`,'','Chỉ dựa trên dữ liệu nhóm đã ghi nhận.')}
    </div>
    ${panel('CO3011 · Checklist theo yêu cầu đề bài',`<div class="ev-checklist">${(ev.assessment?.checks||[]).map(c=>`<div class="ev-check ${esc(c.status)}"><span class="ev-check-icon">${c.status==='recorded'?'✓':c.status==='conditional'?'~':'!'}</span><span><strong>${esc(c.task)} · ${esc(c.label)}</strong><small>${esc(c.hint)}</small></span><em>${c.status==='recorded'?'Có bản ghi':c.status==='conditional'?'Có điều kiện':'Chưa có'}</em></div>`).join('')}</div>`, '', 'Chỉ kiểm tra sự tồn tại của bản ghi; không tự xác nhận đúng/đủ hay đã được giảng viên duyệt.')}
    ${panel('Kho bằng chứng',`<div class="ev-toolbar"><div class="field"><label for="ev_filter">Lọc theo danh mục</label><select id="ev_filter"><option value="all">Tất cả · ${total} bản ghi</option>${kinds.map(([kind,v])=>`<option value="${esc(kind)}" ${filter===kind?'selected':''}>${esc(v.label)} · ${Number(ev.counts[kind]||0)}</option>`).join('')}</select></div><span class="ev-record-note">Hiển thị tối đa 80 bản ghi gần nhất. Tất cả được xuất theo phần ZIP.</span></div>
      ${recent.length?`<div class="ev-list">${recent.map(item=>`<button type="button" class="ev-record" data-action="ev-view" data-id="${item.id}"><span class="ev-record-icon">${icon('checklist')}</span><span class="ev-record-main"><strong>${esc(item.title)}</strong><small>${esc(ev.types[item.kind]?.label||item.kind)} · ${esc(item.author_name)} · ${date(item.created_at)}${item.supersedes_id?` · Sửa từ #${item.supersedes_id}`:''}</small></span><span class="ev-record-num">#${item.id}</span>${icon('chevron')}</button>`).join('')}</div>`:empty('Chưa có bằng chứng','Tạo bản ghi đầu tiên từ buổi họp hoặc công việc thực tế của nhóm.')}`,
      `${action('ev-add','Tạo bản ghi','secondary','','plus')}`)}
    <div class="ev-note"><strong>Lưu ý học thuật:</strong> Bản xuất phản ánh dữ liệu đã lưu. Chưa có Client Interaction Log, baseline hoặc test thực tế thì hệ thống hiển thị trống; không tự sinh phản hồi giả, không tự xác nhận nghiệm thu. Đính kèm sơ đồ Gantt/PBS/PFD và ảnh kiểm thử sau khi nhóm tạo thật.</div>`;
}
async function uploadEvidenceFile(recordId,file){
  if(!file||!file.size)return;
  if(file.size>EVIDENCE_MAX_UPLOAD)throw Error('Tệp tối đa 850 KB. Hãy nén PDF/ảnh trước khi tải.');
  const valid=new Set(['application/pdf','image/png','image/jpeg','text/plain','text/csv']);
  let mime=file.type;
  if(!mime&&/\.csv$/i.test(file.name))mime='text/csv';
  if(!mime&&/\.txt$/i.test(file.name))mime='text/plain';
  if(!valid.has(mime))throw Error('Chỉ hỗ trợ PDF, PNG, JPG, TXT, CSV.');
  let result;
  try{result=await fetch(`/api/evidence/${recordId}/file`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':mime,'X-File-Name':encodeURIComponent(file.name)},body:file});}
  catch{throw Error('Không kết nối được máy chủ để tải tệp.');}
  if(!result.ok){const error=await result.json().catch(()=>({}));throw Error(error.error||`Lỗi tải tệp: ${result.status}`);}
}
async function submitEvidenceForm(form){
  const kind=form.dataset.kind,meta=state.evidence?.types?.[kind];
  if(!meta)throw Error('Loại bằng chứng không hợp lệ.');
  const data={};
  for(const field of meta.fields){const el=form.elements.namedItem('e_'+field.key);if(!el)continue;const raw=el.value;
    if(raw!=='')data[field.key]=field.type==='number'||field.type==='rating'?Number(raw):raw;
  }
  const payload={kind,title:form.elements.namedItem('ev_title')?.value||'',data};
  if(form.dataset.supersedes)payload.supersedes_id=Number(form.dataset.supersedes);
  const created=await api('/api/evidence','POST',payload);
  const file=form.elements.namedItem('ev_file')?.files?.[0];
  let fileFailed='';
  if(file){try{await uploadEvidenceFile(created.id,file);}catch(error){fileFailed=error.message;}}
  closeModal();await loadEvidence();renderApp();
  showToast(fileFailed?`Đã lưu bản ghi #${created.id}, nhưng tải tệp thất bại: ${fileFailed}`:`Đã lưu minh chứng #${created.id} trên Neon.`,Boolean(fileFailed));
}
async function evidenceExportDialog(){
  const manifest=await api('/api/evidence/export/manifest');
  openModal(`<div class="ev-modal-title"><span class="ev-kicker">EXPORT · VERCEL → NEON</span><h2>Gói bằng chứng CO3011</h2><p>${number(manifest.total)} bản ghi · ${number(manifest.files)} tệp · ${manifest.parts.length} phần ZIP</p></div>
    <p class="ev-hint">Các phần ZIP chứa mọi bản ghi cùng lịch sử, CSV theo từng danh mục, JSON, báo cáo HTML và ảnh/PDF đã tải lên. Xuất thành nhiều phần để tránh giới hạn response của Vercel. Tải <strong>tất cả các phần</strong> bên dưới.</p>
    <div class="ev-download-list">${manifest.parts.map((part,i)=>`<a class="ev-download-link" href="${part.url}"><span class="ev-download-number">${i+1}</span><span><strong>${esc(part.label)}</strong><small>${esc(part.name)}</small></span>${icon('download')}</a>`).join('')}</div>
    ${manifest.missing.length?`<div class="ev-missing"><strong>Danh mục chưa có dữ liệu:</strong><p>${manifest.missing.map(x=>esc(x.label)).join(' · ')}</p></div>`:'<p class="ev-hint">Tất cả nhóm đã có ít nhất một bản ghi; nhóm vẫn phải kiểm tra độ chính xác và đủ minh chứng.</p>'}
    <div class="ev-actions"><a href="/api/evidence/report" target="_blank" rel="noopener noreferrer" class="btn secondary">Mở bản in (Save as PDF)</a>${action('close-modal','Đóng','secondary')}</div>`,'Export evidence archive');
}
async function handleEvidenceAction(name,id,button){
  if(!name.startsWith('ev-'))return false;
  if(state.user?.role!=='staff')throw Error('Chỉ nhân viên được truy cập hồ sơ dự án.');
  if(name==='ev-add'){evidenceForm(state.evidence?.types?.[id]?id:(state.evidenceFilter!=='all'?state.evidenceFilter:'consultation'));return true;}
  if(name==='ev-view'){viewEvidence(id);return true;}
  if(name==='ev-revise'){
    const item=state.evidence.records.find(x=>x.id===Number(id));if(item)evidenceForm(item.kind,id);return true;
  }
  if(name==='ev-kind-filter'){state.evidenceFilter=id;renderApp();return true;}
  if(name==='ev-export'){await evidenceExportDialog();return true;}
  if(name==='ev-upload-file'){
    const file=document.getElementById('ev_append_file')?.files?.[0];if(!file)throw Error('Vui lòng chọn tệp đính kèm.');
    await uploadEvidenceFile(id,file);await loadEvidence();viewEvidence(id);showToast('Đã lưu tệp minh chứng trên Neon.');return true;
  }
  return false;
}
