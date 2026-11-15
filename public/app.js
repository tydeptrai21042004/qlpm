'use strict';
const root = document.getElementById('root');
const modal = document.getElementById('modal');
const toast = document.getElementById('toast');
const state = {
  user:null, view:'overview', authMode:'login', rooms:[], students:[], staff:[],
  applications:[], allocations:[], requests:[], notifications:[], events:[], history:[],
  announcements:[], changes:[], busy:false
};
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-GB',
    {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
};
const LABELS = {
  pending:'Pending',approved:'Approved',rejected:'Rejected',closed:'Closed',withdrawn:'Withdrawn',
  active:'Active',inactive:'Inactive',open:'Open',in_progress:'In progress',resolved:'Resolved',
  low:'Low',normal:'Normal',high:'High',maintenance:'Maintenance',cleaning:'Cleaning',other:'Other',
  cancelled:'Cancelled',published:'Published',archived:'Archived',transfer:'Room transfer',checkout:'Move out'
};
const label = name => LABELS[name] || String(name).replaceAll('_',' ');
const badge = (key, shown=key) => `<span class="pill ${esc(key)}">${esc(label(shown))}</span>`;
const icons = {
  overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  applications:'<path d="M7 3h9l4 4v14H7z"/><path d="M16 3v5h4M10 12h7M10 16h7"/>',
  rooms:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M15 12h1"/>',
  students:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 8a3 3 0 0 1 0 6M19 20v-2a5 5 0 0 0-2-4"/>',
  requests:'<path d="M14 4a5 5 0 0 0-6 6L3 15l6 6 5-5a5 5 0 0 0 6-6l-4 2-4-4z"/>',
  activity:'<path d="M4 4v16h16M7 15l4-4 3 3 5-7"/>',
  inbox:'<path d="M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3zM10 21h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  logout:'<path d="M10 4H4v16h6M14 8l4 4-4 4m4-4H8"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5M5 10A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 13-3"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  announcements:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h7"/>',
  changes:'<path d="M4 7h16m0 0-4-4m4 4-4 4M20 17H4m0 0 4-4m-4 4 4 4"/>',
  reports:'<path d="M4 20V4m0 16h16M8 16v-4m5 4V8m5 8V5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  close:'<path d="M5 5l14 14M19 5 5 19"/>',
  spark:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  users:'<path d="M16 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-2a4 4 0 0 0-3-3.9M16 3.2a3 3 0 0 1 0 5.7"/>'
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||''}</svg>`;
const action = (name, title, cls='secondary', id='', glyph='') => `<button type="button" class="btn ${cls}" data-action="${esc(name)}"${id!==''?` data-id="${esc(id)}"`:''}>${glyph?icon(glyph):''}${esc(title)}</button>`;
const field = (id,title,type='text',value='',attributes='') => `<div class="field"><label for="${esc(id)}">${esc(title)}</label><input id="${esc(id)}" name="${esc(id)}" type="${esc(type)}" value="${esc(value)}" ${attributes}></div>`;
const textarea = (id,title,attributes='',value='') => `<div class="field"><label for="${esc(id)}">${esc(title)}</label><textarea id="${esc(id)}" name="${esc(id)}" ${attributes}>${esc(value)}</textarea></div>`;
const select = (id,title,options,selected='',extra='') => `<div class="field"><label for="${esc(id)}">${esc(title)}</label><select id="${esc(id)}" name="${esc(id)}" ${extra}>${options.map(([value,text])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(text)}</option>`).join('')}</select></div>`;
const optionsOf = (items) => items.map(i => [i,label(i)]);
const empty = (title,description='') => `<div class="empty-state"><strong>${esc(title)}</strong>${description?`<p>${esc(description)}</p>`:''}</div>`;
const number = n => Number(n||0).toLocaleString('en-US');
const percent = (num,denom) => denom ? Math.round(num / denom * 100) : 0;
const statusApplication = a => a.withdrawn ? badge('closed','withdrawn') : badge(a.status);
let lastFocus;

function showToast(message, isError=false) {
  toast.textContent=message;
  toast.className=isError?'error':'';
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>{toast.textContent='';},4500);
}
async function api(url,method='GET',body) {
  const opt={method,credentials:'same-origin',headers:{}};
  if(body!==undefined){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body);}
  let response;
  try{response=await fetch(url,opt);}catch{throw Error('Unable to connect. Check your connection and try again.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401 && state.user){state.user=null;renderAuth();}
    throw Error(data.error||`Request failed (${response.status})`);
  }
  return data;
}
function navItems(){
  return state.user.role==='staff'
    ? [['overview','Overview'],['applications','Applications'],['changes','Housing changes'],['rooms','Rooms'],['students','Students'],['requests','Service requests'],['announcements','Announcements'],['reports','Reports'],['activity','Activity log'],['inbox','Notifications'],['settings','Settings']]
    : [['overview','Overview'],['applications','Accommodation'],['changes','Housing changes'],['rooms','Rooms'],['requests','Service requests'],['announcements','Announcements'],['inbox','Notifications'],['settings','Settings']];
}
function renderAuth(){
  modal.hidden=true;document.body.classList.remove('modal-open','sidebar-open');
  const register=state.authMode==='register';
  root.innerHTML=`<div class="auth-layout">
    <section class="auth-side"><div class="brand"><span class="brand-mark"><span class="brand-squares"><i></i><i></i><i></i><i></i></span></span><span>Campus Housing<small>RESIDENCE MANAGEMENT</small></span></div>
      <div class="auth-intro"><div class="eyebrow">RESIDENCE SERVICES PORTAL</div>
      <h1>A simpler way to manage campus living.</h1>
      <p>One place for accommodation applications, room assignments, service requests and residence office updates.</p>
      <div class="auth-highlights"><div>${icon('check')} Room applications and allocation</div><div>${icon('check')} Maintenance and service tracking</div><div>${icon('check')} Residence announcements</div></div></div>
      <div class="auth-side-bottom"><span>Campus Housing</span><span>Student & staff access</span></div>
    </section>
    <main class="auth-main"><div class="auth-box"><div class="eyebrow">WELCOME TO CAMPUS HOUSING</div>
      <h2>${register?'Student registration':'Sign in'}</h2><p class="muted">${register?'Create your account to request accommodation and manage your stay.':'Access your accommodation services and residence workspace.'}</p>
      <div class="tab-switch" role="group" aria-label="Account access"><button type="button" class="${register?'':'active'}" data-action="show-login">Sign in</button><button type="button" class="${register?'active':''}" data-action="show-register">Register</button></div>
      <form class="form" id="auth-form">
        ${register?field('name','Full name','text','','required minlength="2" maxlength="80" autocomplete="name"'):''}
        ${field('email','Email address','email','','required autocomplete="username" maxlength="160"')}
        ${field('password','Password','password','','required minlength="8" maxlength="128" autocomplete="'+(register?'new-password':'current-password')+'"')}
        ${register?`<p class="field-help">Use at least 8 characters, including letters and numbers.</p>`:''}
        <button type="submit" class="btn primary block">${register?'Create student account':'Sign in'}${icon('arrow')}</button>
      </form><p class="auth-footnote">Residence office accounts are created by the system administrator.</p>
    </div></main></div>`;
}
async function loadData(){
  const keys=['rooms','applications','allocations','requests','notifications','announcements','housing-changes'];
  if(state.user.role==='staff') keys.push('students','staff');
  const results=await Promise.all(keys.map(k=>api(`/api/${k}`)));
  keys.forEach((key,i)=>state[key==='housing-changes'?'changes':key]=results[i][key==='housing-changes'?'changes':key]);
  if(state.view==='activity') await loadActivity();
  renderApp();
}
async function loadActivity(){
  if(state.user.role!=='staff')return;
  const [a,b]=await Promise.all([api('/api/audit'),api('/api/allocations/history')]);
  state.events=a.events;state.history=b.history;
}
async function navigate(view){
  if(!navItems().some(([name])=>name===view))view='overview';
  state.view=view;
  location.hash=view;
  if(view==='activity')await loadActivity();
  renderApp();
}
function section(title,subtitle='',controls=''){
  return `<div class="section-head"><div><div class="eyebrow">${state.user.role==='staff'?'RESIDENCE OFFICE':'STUDENT SERVICES'}</div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div><div class="header-actions">${controls}</div></div>`;
}
function stat(title,value,detail=''){
  return `<div class="stat"><span>${esc(title)}</span><strong>${esc(value)}</strong>${detail?`<p>${esc(detail)}</p>`:''}</div>`;
}
function panel(title,content,controls='',sub=''){
  return `<section class="panel"><div class="panel-head"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${controls}</div>${content}</section>`;
}
function table(headers,rows,id='data-table'){
  if(!rows.length)return empty('No records found','Records will appear here when available.');
  return `<div class="table-wrap"><table class="table" id="${esc(id)}"><thead><tr>${headers.map((h,i)=>
    `<th>${/^(Action|Manage)$/i.test(h)?esc(h):`<button type="button" class="sort-button" data-action="sort-table" data-id="${esc(id)}" data-index="${i}">${esc(h)}<span class="sort-indicator" aria-hidden="true">↕</span></button>`}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function filters(placeholder, items=[], exportName=''){
  return `<div class="filter-bar"><label class="search-label"><span class="sr-only">Search records</span><input class="table-search" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></label>
    ${items.length?`<label><span class="sr-only">Filter records</span><select class="table-filter"><option value="">All statuses</option>${items.map(([value,title])=>`<option value="${esc(value)}">${esc(title)}</option>`).join('')}</select></label>`:''}
    ${exportName?`<button type="button" class="btn subtle" data-action="export-csv" data-id="${esc(exportName)}">${icon('download')}Export CSV</button>`:''}
  </div>`;
}
function row(inner,search,filter=''){
  return `<tr data-search="${esc(String(search).toLowerCase())}" data-filter="${esc(filter)}">${inner}</tr>`;
}
function progress(used,capacity){
  const value=percent(used,capacity);
  return `<progress class="meter" value="${used}" max="${capacity||1}" aria-label="Occupancy ${value} percent">${value}%</progress>`;
}
function roomTable(staff){
  return table(['Room','Location','Occupancy','Beds free','Availability',...(staff?['Manage']:[])],state.rooms.map(r=>
    row(`<td><strong>${esc(r.code)}</strong></td><td>${esc(r.building)} · Floor ${r.floor}</td>
      <td><div class="occupancy-cell"><span>${r.occupied} / ${r.capacity}</span>${progress(r.occupied,r.capacity)}</div></td>
      <td>${r.active?r.available:'—'}</td><td>${!r.active?badge('inactive'):r.available>0?badge('active','Available'):badge('pending','Full')}</td>
      ${staff?`<td>${action('room-roster','Residents','subtle sm',r.id)} ${action('edit-room','Edit','subtle sm',r.id)}</td>`:''}`,
    `${r.code} ${r.building} ${r.floor}`,!r.active?'inactive':r.available?'available':'full')));
}
function applicationTable(staff){
  if(staff) return table(['Student','Preference','Submitted','Status','Assignment','Action'],state.applications.map(a=>
    row(`<td><strong>${esc(a.student_name)}</strong><div class="cell-sub">${esc(a.student_email)}</div></td>
      <td>${esc(a.preferred_room_code||'No preference')}</td><td>${date(a.created_at)}</td><td>${statusApplication(a)}</td>
      <td>${esc(a.assigned_room||'—')}</td><td>${a.status==='pending'?`<div class="button-row">${action('approve','Review','secondary sm',a.id)}${action('reject','Reject','subtle danger sm',a.id)}</div>`:action('application-details','Details','subtle sm',a.id)}</td>`,
    `${a.student_name} ${a.student_email} ${a.preferred_room_code||''} ${a.note}`,a.withdrawn?'closed':a.status)));
  return table(['Submitted','Preferred room','Status','Assignment','Review note','Action'],state.applications.map(a=>
    row(`<td>${date(a.created_at)}</td><td>${esc(a.preferred_room_code||'No preference')}</td><td>${statusApplication(a)}</td>
      <td>${esc(a.assigned_room||'—')}</td><td class="wrap">${esc(a.review_note||'—')}</td><td>${a.status==='pending'?action('cancel-application','Withdraw','subtle danger sm',a.id):'—'}</td>`,
    `${a.preferred_room_code||''} ${a.note} ${a.review_note}`,a.withdrawn?'closed':a.status)));
}
function requestTable(staff, list=state.requests){
  return table(['Request','Student','Priority','Status','Assigned to','Updated','Action'],list.map(r=>
    row(`<td><strong>${esc(r.title)}</strong><div class="cell-sub">#${r.id} · ${esc(label(r.category))}</div></td>
      <td>${staff?esc(r.student_name):'Me'}</td><td>${badge(r.priority)}</td><td>${badge(r.status)}</td>
      <td>${esc(r.assignee_name||'Unassigned')}</td><td>${date(r.updated_at)}</td>
      <td>${action('open-ticket','View','subtle sm',r.id)}</td>`,
    `${r.id} ${r.student_name} ${r.title} ${r.category} ${r.description} ${r.assignee_name||''}`,r.status)));
}
function studentTicketList(list=state.requests){
  if(!list.length)return empty('No service requests','New requests will appear here.');
  return `<div class="ticket-list">${list.map(r=>`<div class="ticket-item filter-record" data-search="${esc(`${r.id} ${r.title} ${r.category} ${r.description}`.toLowerCase())}" data-filter="${esc(r.status)}">
    <div class="ticket-item-main"><strong>${esc(r.title)}</strong><p>#${r.id} · ${esc(label(r.category))} · ${date(r.created_at)}</p>
    <div class="ticket-status">${badge(r.priority)}${badge(r.status)}</div></div>
    ${action('open-ticket','View details','subtle sm',r.id)}
  </div>`).join('')}</div>`;
}
function applicationForm(){
  const active=state.applications.find(a=>a.status==='pending'||a.status==='approved');
  const allocated=state.allocations.length>0;
  if(active || allocated) return `<div class="notice">${allocated?'You already have a room assignment.':`Application #${active.id} is ${label(active.status).toLowerCase()}.`} You cannot submit another application at this time.</div>`;
  return `<form id="apply-form" class="form">
    ${select('preferred_room_id','Preferred room', [['','No preference'],...state.rooms.filter(r=>r.active&&r.available>0).map(r=>[r.id,`${r.code} · ${r.building} · ${r.available} available`])],'')}
    <p class="field-help">Preferences are considered during review but are not guaranteed.</p>
    ${textarea('note','Additional information (optional)','maxlength="1000" rows="3" placeholder="Any details relevant to your application"')}
    <button type="submit" class="btn primary">Submit application</button>
  </form>`;
}
function requestForm(){
  return `<form id="request-form" class="form">
    <div class="form-cols">${select('category','Category',optionsOf(['maintenance','cleaning','other']),'maintenance')}
      ${select('priority','Priority',optionsOf(['low','normal','high']),'normal')}</div>
    ${field('title','Subject','text','','required minlength="3" maxlength="120" placeholder="e.g. Leaking tap in bathroom"')}
    ${textarea('description','Description','required minlength="5" maxlength="1000" rows="4" placeholder="Describe the issue and its location"')}
    <button type="submit" class="btn primary">Submit request</button>
  </form>`;
}
function announcementCard(a, compact=false) {
  return `<article class="announcement-card ${a.pinned?'is-pinned':''}">
    <div class="notice-meta"><span class="mini-icon">${icon('announcements')}</span>
      <span>${a.audience==='all'?'All residents':`Building ${esc(a.building)}`}</span><span class="meta-sep">·</span><time>${date(a.created_at)}</time>
      ${a.pinned?'<span class="pinned-label">Pinned</span>':''}${a.status==='archived'?badge('archived'):''}</div>
    <h3>${esc(a.title)}</h3><p class="announcement-body ${compact?'clamp-text':''}">${esc(a.body)}</p>
    ${!compact&&state.user.role==='staff'?`<div class="notice-controls">${action('edit-announcement','Edit','subtle sm',a.id)}
      ${action('set-announcement-status',a.status==='published'?'Archive':'Republish','subtle sm',a.id)}</div>`:''}
  </article>`;
}
function announcementPage() {
  const staff=state.user.role==='staff';
  const published=state.announcements.filter(a=>a.status==='published');
  return `${section('Announcements',staff?'Publish notices for all residents or a specific building.':'Updates from the residence office.',staff?action('new-announcement','Create announcement','primary','','plus'):'')}
    <div class="editorial-layout"><div class="feed-list">${state.announcements.length?state.announcements.map(a=>announcementCard(a)).join(''):
      empty('No announcements','Residence office announcements will appear here.')}</div>
      <aside class="aside-stack">${panel('Notice board',`<div class="info-list"><div><span>Published</span><strong>${number(published.length)}</strong></div>
      <div><span>Pinned</span><strong>${number(published.filter(a=>a.pinned).length)}</strong></div><div><span>Audience</span><strong>${staff?'All & buildings':'My residence'}</strong></div></div>`)}
      <div class="support-note"><strong>Residence communications</strong><p>Housing decisions and individual service requests remain in their respective workspaces. Notices are for general information.</p></div></aside></div>`;
}
function announcementDialog(id='') {
  const a=state.announcements.find(x=>x.id===Number(id));
  const buildings=[...new Set(state.rooms.map(x=>x.building))].sort();
  const toLocal=t=>t?new Date(new Date(t).getTime()-new Date(t).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  openModal(`<h2>${a?'Edit announcement':'New announcement'}</h2><p class="modal-sub">Write a clear notice. Published announcements are visible immediately.</p>
    <form id="announcement-form" class="form" data-id="${a?.id||''}">
      ${field('notice_title','Headline','text',a?.title||'','required minlength="4" maxlength="120" placeholder="Example: Building A water shutdown"')}
      ${textarea('notice_body','Notice content','required minlength="10" maxlength="3000" rows="6" placeholder="What residents need to know and any action required"',a?.body||'')}
      <div class="form-cols">${select('notice_audience','Audience',[['all','All residents'],['building','Specific building']],a?.audience||'all')}
      ${select('notice_building','Building',buildings.map(b=>[b,b]),a?.building||buildings[0]||'')}</div>
      <div class="form-cols">${field('notice_expires','Expires (optional)','datetime-local',toLocal(a?.expires_at))}
      <div class="field"><label for="notice_pinned">Position</label><label class="switch-row"><input id="notice_pinned" name="notice_pinned" type="checkbox" ${a?.pinned?'checked':''}>Pin to top of notice board</label></div></div>
      <div class="dialog-actions">${action('close-modal','Cancel','secondary')}<button type="submit" class="btn primary">${a?'Save announcement':'Publish announcement'}</button></div>
    </form>`,a?'Edit announcement':'New announcement');
  syncAudienceField();
}
function syncAudienceField() {
  const box=document.getElementById('notice_building');
  if(box) box.closest('.field').hidden=document.getElementById('notice_audience')?.value!=='building';
}
function changeTable(staff) {
  return table(staff?['Student','Request','Preferred room','Submitted','Status','Action']:['Request','Preferred room','Submitted','Status','Decision','Action'],
    state.changes.map(c=>row(staff?
      `<td><strong>${esc(c.student_name)}</strong><div class="cell-sub">${esc(c.student_email)}</div></td>
       <td>${esc(label(c.kind))}<div class="cell-sub cell-ellipsis">${esc(c.reason)}</div></td>
       <td>${esc(c.target_room_code||'—')}</td><td>${date(c.created_at)}</td><td>${badge(c.status)}</td>
       <td>${action('change-details',c.status==='pending'?'Review':'Details','subtle sm',c.id)}</td>`:
      `<td><strong>${esc(label(c.kind))}</strong></td><td>${esc(c.target_room_code||'—')}</td><td>${date(c.created_at)}</td><td>${badge(c.status)}</td>
       <td class="wrap">${esc(c.review_note||'—')}</td><td>${c.status==='pending'?action('cancel-change','Cancel','subtle danger sm',c.id):action('change-details','Details','subtle sm',c.id)}</td>`,
      `${c.student_name} ${c.kind} ${c.reason} ${c.target_room_code||''}`,c.status)));
}
function housingChangeForm() {
  const assigned=state.allocations[0];
  if(!assigned) return `<div class="context-empty">${icon('rooms')}<strong>Room assignment required</strong><p>You can request a transfer or move-out after your accommodation has been approved.</p>${action('nav','View accommodation','secondary','applications')}</div>`;
  const pending=state.changes.find(c=>c.status==='pending');
  if(pending)return `<div class="context-empty">${icon('clock')}<strong>Request under review</strong><p>Your ${label(pending.kind).toLowerCase()} request is pending. Only one housing change can be active at a time.</p>${action('change-details','View your request','secondary',pending.id)}</div>`;
  const options=state.rooms.filter(r=>r.active&&r.available>0&&r.id!==assigned.room_id).map(r=>[r.id,`${r.code} · Building ${r.building} (${r.available} free)`]);
  return `<form class="form" id="housing-change-form">
    <div class="readonly-line"><span>Current room</span><strong>${esc(assigned.room_code)} · Building ${esc(assigned.building)}</strong></div>
    ${select('change_kind','Request type',options.length?[['transfer','Transfer to another room'],['checkout','Request move-out']]:[['checkout','Request move-out']],options.length?'transfer':'checkout')}
    ${options.length?select('target_room_id','Preferred destination',options,'','required'): '<div class="notice" id="no-destination">No alternative rooms have available beds right now.</div>'}
    ${textarea('reason','Reason','required minlength="8" maxlength="1000" rows="4" placeholder="Explain your request so the residence office can review it"')}
    <p class="field-help">Transfers depend on room availability and staff approval. Move-out approval releases your bed.</p>
    <button type="submit" class="btn primary">Submit request ${icon('arrow')}</button>
  </form>`;
}
function syncChangeType() {
  const fieldEl=document.getElementById('target_room_id')?.closest('.field');
  const unavailable=document.getElementById('no-destination');
  const kind=document.getElementById('change_kind')?.value;
  if(fieldEl){fieldEl.hidden=kind!=='transfer';fieldEl.querySelector('select').required=kind==='transfer';}
  if(unavailable)unavailable.hidden=kind!=='transfer';
}
function changePage() {
  const staff=state.user.role==='staff';
  const pending=state.changes.filter(c=>c.status==='pending');
  if(staff)return `${section('Housing changes','Review transfer and move-out requests from current residents.')}
    <div class="summary-strip"><span class="strip-dot"></span><strong>${pending.length} awaiting review</strong><span>Transfers reserve the new bed and release the previous bed together.</span></div>
    ${panel('Request queue',`${filters('Search students or request notes',[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['cancelled','Cancelled']],'housing-changes')}${changeTable(true)}`,'',`${state.changes.length} recorded requests`)}`;
  return `${section('Housing changes','Request a different room or arrange a move-out.')}
    <div class="grid-narrow">${panel('New housing change',housingChangeForm(),'','Requests must be reviewed by residence staff')}
    ${panel('Request history',`${filters('Search requests',[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['cancelled','Cancelled']])}${changeTable(false)}`)}</div>`;
}
function changeDialog(id) {
  const c=state.changes.find(x=>x.id===Number(id));if(!c)return;
  const staff=state.user.role==='staff';
  openModal(`<h2>${esc(label(c.kind))} · #${c.id}</h2><p class="modal-sub">Submitted ${date(c.created_at)} · ${esc(c.student_name)}</p>
    <div class="detail-grid"><div><span>Status</span>${badge(c.status)}</div><div><span>Destination</span><strong>${esc(c.target_room_code||'Move-out / bed release')}</strong></div>
    <div><span>Current assignment</span><strong>${esc(c.current_room_code||'No active assignment')}</strong></div><div><span>Reviewed by</span><strong>${esc(c.reviewer_name||'—')}</strong></div></div>
    <div class="detail-section"><h3>Student reason</h3><p>${esc(c.reason)}</p></div>
    ${c.review_note?`<div class="detail-section"><h3>Review note</h3><p>${esc(c.review_note)}</p></div>`:''}
    ${staff&&c.status==='pending'?`<form class="form decision-form" id="change-decision-form" data-id="${c.id}">
       ${select('change_decision','Decision',[['approve','Approve request'],['reject','Decline request']],'approve')}
       ${textarea('change_review_note','Decision note','maxlength="1000" rows="3" placeholder="Add a reason or instructions for the resident"')}
       <div class="notice" id="change-warning">${c.kind==='transfer'?'Approval will transfer the student and update occupancy in both rooms.':'Approval will end the current allocation and release the bed.'}</div>
       <div class="dialog-actions">${action('close-modal','Cancel','secondary')}<button class="btn primary" type="submit">Confirm decision</button></div>
     </form>`:`<div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`}`,'Housing change details');
}
async function roomRoster(id) {
  const {room,residents}=await api(`/api/rooms/${id}/residents`);
  openModal(`<h2>Room ${esc(room.code)}</h2><p class="modal-sub">Building ${esc(room.building)} · Floor ${room.floor}</p>
    <div class="detail-grid"><div><span>Capacity</span><strong>${room.capacity} beds</strong></div><div><span>Occupancy</span><strong>${room.occupied} residents</strong></div>
      <div><span>Free beds</span><strong>${room.capacity-room.occupied}</strong></div><div><span>Room state</span>${badge(room.active?'active':'inactive')}</div></div>
    <div class="detail-section"><h3>Current residents</h3>${residents.length?`<div class="resident-list">${residents.map(r=>`<div>
      <span class="list-avatar">${esc(r.name[0]?.toUpperCase()||'?')}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.email)} · Since ${date(r.assigned_at)}</small></span>
      ${action('student-details','Profile','subtle sm',r.student_id)}</div>`).join('')}</div>`:empty('No residents assigned','This room has no current occupants.')}</div>
    <div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`,'Room residents');
}
function studentDetails(id) {
  const s=state.students.find(x=>x.id===Number(id));if(!s)return;
  const apps=state.applications.filter(a=>a.student_id===s.id);
  const tickets=state.requests.filter(r=>r.student_id===s.id);
  const changes=state.changes.filter(c=>c.student_id===s.id);
  openModal(`<div class="profile-detail"><span class="profile-avatar">${esc(s.name.split(' ').map(x=>x[0]).slice(-2).join('').toUpperCase())}</span>
    <div><h2>${esc(s.name)}</h2><p>${esc(s.email)}</p><small>Registered ${date(s.created_at)}</small></div></div>
    <div class="detail-grid"><div><span>Current room</span><strong>${esc(s.room_code||'Not assigned')}</strong></div><div><span>Applications</span><strong>${apps.length}</strong></div>
    <div><span>Service requests</span><strong>${tickets.length}</strong></div><div><span>Housing changes</span><strong>${changes.length}</strong></div></div>
    <div class="detail-section"><h3>Recent activity</h3><div class="timeline-list">${[
      ...apps.map(a=>({when:a.created_at,text:`Housing application · ${label(a.status)}`})),
      ...tickets.map(r=>({when:r.created_at,text:`${r.title} · ${label(r.status)}`})),
      ...changes.map(c=>({when:c.created_at,text:`${label(c.kind)} · ${label(c.status)}`}))
    ].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,6).map(a=>`<div><i></i><span>${esc(a.text)}<small>${date(a.when)}</small></span></div>`).join('')||'<p class="muted">No recent records.</p>'}</div></div>
    <div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`,'Student details');
}
function reportsPage() {
  const active=state.rooms.filter(r=>r.active);
  const total=active.reduce((n,r)=>n+r.capacity,0), used=active.reduce((n,r)=>n+r.occupied,0);
  const types=['maintenance','cleaning','other'];
  const counts=types.map(k=>({name:label(k),n:state.requests.filter(r=>r.category===k).length}));
  const max=Math.max(1,...counts.map(x=>x.n));
  const resolved=state.requests.filter(r=>r.status==='resolved');
  const buildings=[...new Set(active.map(r=>r.building))].sort().map(b=>{
    const rs=active.filter(r=>r.building===b), cap=rs.reduce((n,r)=>n+r.capacity,0), occ=rs.reduce((n,r)=>n+r.occupied,0);
    return {name:b,cap,occ};
  });
  return `${section('Reports','Live operational indicators calculated from current residence records.',action('refresh','Refresh data','secondary','','refresh'))}
  <div class="stats">${stat('Active occupancy',`${percent(used,total)}%`,`${used} / ${total} beds`)}${stat('Approved applications',number(state.applications.filter(a=>a.status==='approved').length),'Current active approvals')}
  ${stat('Requests resolved',number(resolved.length),`${state.requests.length} requests submitted`)}${stat('Pending decisions',number(state.applications.filter(a=>a.status==='pending').length+state.changes.filter(c=>c.status==='pending').length),'Applications & housing changes')}</div>
  <div class="grid-two">${panel('Capacity by building',buildings.length?`<div class="chart-list">${buildings.map(b=>`<div class="chart-row"><div><strong>Building ${esc(b.name)}</strong><span>${b.occ} of ${b.cap} beds · ${percent(b.occ,b.cap)}%</span></div>${progress(b.occ,b.cap)}</div>`).join('')}</div>`:empty('No rooms','Add rooms to see capacity data.'))}
  ${panel('Request categories',counts.some(x=>x.n)?`<div class="chart-list">${counts.map(x=>`<div class="chart-row"><div><strong>${esc(x.name)}</strong><span>${x.n} requests</span></div>${progress(x.n,max)}</div>`).join('')}</div>`:empty('No requests','Service categories appear after students submit requests.'))}</div>
  <div class="mt-panel">${panel('Service outcomes',`<div class="outcome-grid">${['open','in_progress','resolved'].map(status=>`<div><strong>${number(state.requests.filter(r=>r.status===status).length)}</strong><span>${esc(label(status))}</span></div>`).join('')}</div>`,'','Current workflow status; not an SLA measurement')}</div>
  <p class="report-note">Figures reflect the current database snapshot. Export raw tables from the corresponding management pages for project evidence; charts do not represent historical trends.</p>`;
}
function commandItems(query='') {
  const q=query.trim().toLowerCase();
  const nav=navItems().map(([id,title])=>({id,title,kind:'navigation',subtitle:'Go to workspace'}));
  const rooms=state.rooms.slice(0,50).map(r=>({id:r.id,title:`Room ${r.code}`,kind:'room',subtitle:`Building ${r.building} · ${r.available} beds free`}));
  const reqs=state.requests.slice(0,50).map(r=>({id:r.id,title:r.title,kind:'request',subtitle:`Request #${r.id} · ${r.student_name}`}));
  const items=[...nav,...rooms,...reqs].filter(item=>!q||`${item.title} ${item.subtitle}`.toLowerCase().includes(q)).slice(0,12);
  return items.length?items.map(item=>`<button type="button" class="command-item" data-action="command-select" data-kind="${item.kind}" data-id="${esc(item.id)}">
      <span>${icon(item.kind==='room'?'rooms':item.kind==='request'?'requests':'arrow')}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span>${icon('chevron')}</button>`).join(''):
      `<div class="command-empty">No matching pages or records.</div>`;
}
function commandDialog() {
  openModal(`<h2 class="sr-only">Search the workspace</h2><div class="command-search">${icon('search')}<input id="command-input" type="search" aria-label="Search pages and records" placeholder="Search pages, rooms, requests…" autocomplete="off"><kbd>ESC</kbd></div>
    <p class="command-caption">QUICK ACCESS</p><div id="command-results" class="command-list">${commandItems()}</div>
    <div class="command-footer"><span>Use search to navigate to an item</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd> to open</span></div>`,'Search');
  modal.querySelector('.dialog')?.classList.add('command-dialog');
  document.getElementById('command-input')?.focus();
}

function studentPage(){
  const assigned=state.allocations[0];
  const pending=state.applications.find(a=>a.status==='pending');
  const open=state.requests.filter(r=>r.status!=='resolved');
  if(state.view==='overview'){
    const activeNotice=state.announcements.filter(a=>a.status==='published').slice(0,2);
    const name=state.user.name.trim().split(/\s+/).at(-1);
    return `${section(`Welcome back, ${name}`,'Your housing, services and residence updates in one place.',action('nav','New service request','primary','requests','plus'))}
    <div class="student-hero"><div class="student-hero-copy"><div class="eyebrow">MY RESIDENCE</div>
      <h2>${assigned?`You're staying in ${esc(assigned.room_code)}`:pending?'Your application is being reviewed':'Your home on campus starts here'}</h2>
      <p>${assigned?`Building ${esc(assigned.building)} · Floor ${assigned.floor} · Assigned ${date(assigned.assigned_at)}`:
      pending?`Application #${pending.id} is in the residence office queue.`:'Submit an accommodation request to begin the room allocation process.'}</p>
      ${action('nav',assigned?'Manage accommodation':pending?'Track application':'Apply for a room','hero-button','applications','arrow')}
    </div><div class="hero-architecture" aria-hidden="true"><div class="tower one"></div><div class="tower two"></div><div class="tower three"></div></div></div>
    <div class="stats cols-3">${stat('Current room',assigned?assigned.room_code:'—',assigned?`Building ${assigned.building}`:'No current assignment')}
      ${stat('Active requests',open.length,'Awaiting resolution')}${stat('Unread updates',state.notifications.filter(n=>!n.read_at).length,'Your notifications')}</div>
    <div class="grid-two">${panel('Latest announcements',activeNotice.length?activeNotice.map(a=>announcementCard(a,true)).join(''):empty('No new notices','Important residence updates will appear here.'),action('nav','View all','subtle sm','announcements'))}
      ${panel('My recent requests',studentTicketList(state.requests.slice(0,3)),action('nav','All requests','subtle sm','requests'))}</div>`;
  }
  if(state.view==='applications')return `${section('Accommodation','Register for housing and follow your application history.')}
    <div class="grid-narrow">${panel('New application',applicationForm(),'','One active application per student')}
      ${panel('Application history',applicationTable(false),'','Previous reviews and current status')}</div>`;
  if(state.view==='rooms')return `${section('Room availability','Live occupancy information for rooms managed by the residence office.')}
    ${panel('Room directory',`${filters('Search room or building',[['available','Available'],['full','Full'],['inactive','Inactive']])}${roomTable(false)}`,'','Final assignments are made by residence staff')}`;
  if(state.view==='requests')return `${section('Service requests','Submit a maintenance or residence support request and follow staff replies.')}
    <div class="grid-narrow">${panel('New request',requestForm())}
      ${panel('My requests',`${filters('Search requests',[['open','Open'],['in_progress','In progress'],['resolved','Resolved']])}${studentTicketList()}`)}</div>`;
  if(state.view==='changes')return changePage();
  if(state.view==='announcements')return announcementPage();
  return '';
}
function staffPage(){
  const activeRooms=state.rooms.filter(r=>r.active);
  const capacity=activeRooms.reduce((v,r)=>v+r.capacity,0);
  const occupied=activeRooms.reduce((v,r)=>v+r.occupied,0);
  const pending=state.applications.filter(a=>a.status==='pending');
  const queue=state.requests.filter(r=>r.status!=='resolved');
  if(state.view==='overview'){
    const groups=Array.from(new Set(state.rooms.map(r=>r.building))).sort().map(building=>{
      const rs=state.rooms.filter(r=>r.building===building&&r.active);
      const used=rs.reduce((v,r)=>v+r.occupied,0), beds=rs.reduce((v,r)=>v+r.capacity,0);
      return `<div class="building"><div><strong>${esc(building)} block</strong><span>${used} / ${beds} beds · ${percent(used,beds)}%</span></div>${progress(used,beds)}</div>`;
    }).join('');
    const changeQueue=state.changes.filter(c=>c.status==='pending');
    const urgent=state.requests.filter(r=>r.priority==='high'&&r.status!=='resolved');
    const attention=[...pending.slice(0,3).map(a=>({type:'Application',name:a.student_name,detail:a.preferred_room_code?`Preference ${a.preferred_room_code}`:'No room preference',id:a.id,act:'approve',when:a.created_at})),
      ...changeQueue.slice(0,3).map(c=>({type:'Housing change',name:c.student_name,detail:label(c.kind),id:c.id,act:'change-details',when:c.created_at})),
      ...urgent.slice(0,3).map(r=>({type:'High priority request',name:r.student_name,detail:r.title,id:r.id,act:'open-ticket',when:r.created_at}))]
      .sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,5);
    return `${section('Operations overview','A real-time view of occupancy, applications and active service work.',action('new-announcement','Post announcement','primary','','plus'))}
      <div class="dashboard-context"><span class="live-indicator"></span>LIVE RESIDENCE SNAPSHOT <span class="context-divider">/</span> ${esc(new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</div>
      <div class="stats">${stat('Occupied beds',`${percent(occupied,capacity)}%`,`${occupied} of ${capacity} total`)}
      ${stat('Beds available',number(capacity-occupied),`${activeRooms.length} active rooms`)}
      ${stat('Pending decisions',number(pending.length+changeQueue.length),`${pending.length} applications · ${changeQueue.length} housing changes`)}
      ${stat('Active service requests',number(queue.length),`${urgent.length} high priority`)}</div>
      <div class="overview-grid">
        ${panel('Needs attention',attention.length?`<div class="attention-list">${attention.map(x=>`<div class="attention-item">
          <span class="attention-symbol">${icon(x.act==='approve'?'applications':x.act==='open-ticket'?'requests':'changes')}</span>
          <div><span class="task-kind">${esc(x.type)}</span><strong>${esc(x.name)}</strong><p>${esc(x.detail)}</p></div>
          <button type="button" class="icon-action" data-action="${x.act}" data-id="${x.id}" aria-label="Review ${esc(x.type)}">${icon('chevron')}</button></div>`).join('')}</div>`:
          empty('Queue is clear','No pending applications, housing changes or high-priority requests.'),action('nav','View applications','subtle sm','applications'),'Items requiring staff review')}
        ${panel('Bed capacity',groups||empty('No active rooms','Add rooms to begin tracking occupancy.'),action('nav','View inventory','subtle sm','rooms'),'Current allocations by building')}</div>
      <div class="grid-two mt-panel">${panel('Service queue',queue.length?`<div class="attention-list service-list">${queue.slice(0,5).map(r=>`<div class="attention-item">
          <span class="attention-symbol">${icon('requests')}</span><div><span class="task-kind">${esc(label(r.category))} · ${esc(r.student_name)}</span>
          <strong>${esc(r.title)}</strong><p>${esc(label(r.status))} · ${esc(label(r.priority))} priority</p></div>
          ${action('open-ticket','Open','subtle sm',r.id)}</div>`).join('')}</div>`:empty('No open service requests','New student requests will appear here.'),action('nav','Open requests','subtle sm','requests'))}
        ${panel('Residence notice board',state.announcements.filter(a=>a.status==='published').slice(0,2).map(a=>announcementCard(a,true)).join('')||empty('No notices yet','Publish an announcement for residents.'),action('nav','Manage notices','subtle sm','announcements'))}</div>`;
  }
  if(state.view==='applications')return `${section('Applications','Review student requests for accommodation and assign available beds.',action('export-csv','Export CSV','secondary','','download'))}
    ${panel('Application queue',`${filters('Search name, email or room',[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['closed','Closed']])}${applicationTable(true)}`)}`;
  if(state.view==='rooms')return `${section('Rooms','Manage room capacity, location and availability.',action('new-room','Add room','primary','','plus'))}
    ${panel('Room inventory',`${filters('Search room or building',[['available','Available'],['full','Full'],['inactive','Inactive']],'rooms')}${roomTable(true)}`,'',`${activeRooms.length} active rooms · ${capacity} total beds`)}`;
  if(state.view==='students')return `${section('Student directory','Registered students and current room assignments.')}
    ${panel('Students',`${filters('Search by name, email or room',[['assigned','Assigned'],['unassigned','Unassigned']],'students')}
      ${table(['Student','Email','Room','Registered','Action'],state.students.map(s=>row(`<td><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.email)}</td><td>${esc(s.room_code||'Not assigned')}</td><td>${date(s.created_at)}</td>
        <td><div class="button-row">${action('student-details','Profile','subtle sm',s.id)}${s.allocation_id?action('checkout','Check out','subtle danger sm',s.allocation_id):''}</div></td>`,
        `${s.name} ${s.email} ${s.room_code||''}`,s.allocation_id?'assigned':'unassigned')))}`)}`;
  if(state.view==='requests')return `${section('Service requests','Assign, prioritize and resolve maintenance and residence inquiries.')}
    ${panel('Request queue',`${filters('Search subject, student or category',[['open','Open'],['in_progress','In progress'],['resolved','Resolved']],'requests')}${requestTable(true)}`)}`;
  if(state.view==='activity')return `${section('Activity & history','Recent system changes and check-outs available for project verification.')}
    <div class="stack-panels">${panel('Activity log',table(['When','Actor','Action','Details'],state.events.map(e=>
      row(`<td>${date(e.created_at)}</td><td>${esc(e.actor_name)}</td><td>${esc(e.action.replaceAll('_',' '))}</td><td class="wrap">${esc(e.summary)}</td>`,
      `${e.actor_name} ${e.action} ${e.summary}`)),'activity-table'),action('export-activity','Export CSV','subtle sm'))}
      ${panel('Check-out history',table(['Student','Room','Assigned','Checked out','Processed by'],state.history.map(h=>
      row(`<td>${esc(h.student_name)}</td><td>${esc(h.room_code)}</td><td>${date(h.assigned_at)}</td><td>${date(h.checked_out_at)}</td><td>${esc(h.checked_out_by)}</td>`,
      `${h.student_name} ${h.room_code}`)),'history-table'))}</div>`;
  if(state.view==='changes')return changePage();
  if(state.view==='announcements')return announcementPage();
  if(state.view==='reports')return reportsPage();
  return '';
}
function notificationPage(){
  const unread=state.notifications.filter(n=>!n.read_at).length;
  return `${section('Notifications','Application decisions and updates on your service requests.',unread?action('read-all','Mark all as read','secondary','','check'):'')}
    ${panel('Inbox',state.notifications.length?`<div class="notification-list">${state.notifications.map(n=>
      `<div class="notification ${n.read_at?'':'unread'}"><div class="notification-dot"></div><div class="notification-body"><strong>${esc(n.title)}</strong>
      <p>${esc(n.body)}</p><span>${date(n.created_at)}</span></div><div class="notification-actions">${action('notification-open','Open','subtle sm',n.id)}</div></div>`).join('')}</div>`:empty('No notifications yet','Application decisions and staff updates will appear here.'))}`;
}
function settingsPage(){
  return `${section('Account settings','Update your display name or password.')}
    <div class="grid-two settings-grid">${panel('Profile',`<form id="profile-form" class="form">${field('profile_name','Full name','text',state.user.name,'required minlength="2" maxlength="80"')}
      <div class="field"><label>Email address</label><div class="readonly">${esc(state.user.email)}</div></div><p class="field-help">Email changes are not available in this project.</p>
      <div><button type="submit" class="btn primary">Save profile</button></div></form>`)}
    ${panel('Change password',`<form id="password-form" class="form">
      ${field('current_password','Current password','password','','required autocomplete="current-password"')}
      ${field('new_password','New password','password','','required minlength="10" maxlength="128" autocomplete="new-password"')}
      <p class="field-help">At least 10 characters with letters and numbers. Other sessions will be signed out.</p>
      <div><button type="submit" class="btn primary">Update password</button></div></form>`)}</div>`;
}
function sidebarGroup(items,caption){
  const unseen=state.notifications.filter(n=>!n.read_at).length;
  return `<div class="nav-group"><div class="nav-caption">${esc(caption)}</div><nav aria-label="${esc(caption)}">${items.map(([key,text])=>
  `<button type="button" class="nav-link ${state.view===key?'active':''}" data-action="nav" data-id="${key}" ${state.view===key?'aria-current="page"':''}>
    ${icon(key)}<span>${esc(text)}</span>${key==='inbox'&&unseen?`<b class="nav-count">${unseen}</b>`:''}</button>`).join('')}</nav></div>`;
}
function renderApp(){
  if(!state.user)return renderAuth();
  const nav=navItems();
  if(!nav.some(([v])=>v===state.view))state.view='overview';
  const count=state.notifications.filter(n=>!n.read_at).length;
  const current=nav.find(([v])=>v===state.view)[1];
  const staff=state.user.role==='staff';
  const content=state.view==='inbox'?notificationPage():state.view==='settings'?settingsPage():staff?staffPage():studentPage();
  const primary=staff?nav.slice(0,5):nav.slice(0,4);
  const secondary=staff?nav.slice(5,9):nav.slice(4,6);
  const tertiary=staff?nav.slice(9):nav.slice(6);
  const initials=state.user.name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase();
  root.innerHTML=`<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-top"><div class="brand"><span class="brand-mark"><span class="brand-squares"><i></i><i></i><i></i><i></i></span></span><span class="brand-copy">Campus Housing<small>RESIDENCE MANAGEMENT</small></span></div>
        <button type="button" class="sidebar-close" data-action="toggle-sidebar" aria-label="Close navigation">${icon('close')}</button></div>
      <div class="workspace-picker"><span class="workspace-badge">${staff?'RO':'ST'}</span><span><strong>${staff?'Residence office':'Student portal'}</strong><small>${staff?'Staff workspace':'My account'}</small></span>${icon('chevron')}</div>
      <div class="sidebar-nav">${sidebarGroup(primary,staff?'RESIDENCE':'MY HOUSING')}
        ${sidebarGroup(secondary,staff?'OPERATIONS':'RESIDENT SERVICES')}
        ${sidebarGroup(tertiary,'ACCOUNT')}</div>
      <div class="sidebar-bottom"><div class="account-chip"><span class="avatar">${esc(initials)}</span>
        <span><strong>${esc(state.user.name)}</strong><small>${staff?'Residence administrator':'Resident account'}</small></span></div>
        <button type="button" class="logout-link" data-action="logout">${icon('logout')}<span>Sign out</span></button></div>
    </aside><button class="sidebar-scrim" type="button" data-action="toggle-sidebar" aria-label="Close navigation"></button>
    <div class="main"><header class="topbar"><div class="topbar-left">
      <button type="button" class="top-icon mobile-menu" data-action="toggle-sidebar" aria-label="Open navigation">${icon('menu')}</button>
      <div class="breadcrumb"><span>${staff?'Residence office':'Student portal'}</span>${icon('chevron')}<strong>${esc(current)}</strong></div></div>
      <div class="top-actions"><button type="button" class="global-search" data-action="command">${icon('search')}<span>Search anything</span><kbd>Ctrl K</kbd></button>
      <span class="topbar-divider"></span><button type="button" class="top-icon" data-action="refresh" aria-label="Refresh data" title="Refresh data">${icon('refresh')}</button>
      <button type="button" class="top-icon alert-icon" data-action="nav" data-id="inbox" aria-label="Notifications${count?`, ${count} unread`:''}" title="Notifications">${icon('inbox')}${count?`<span class="dot"></span>`:''}</button>
      <button type="button" class="top-account" data-action="nav" data-id="settings" title="Account settings">${esc(initials)}</button></div></header>
      <main id="main-content" class="content">${content}</main><footer class="main-footer"><span>Campus Housing</span><span>Residence operations · ${new Date().getFullYear()}</span></footer></div></div>`;
  applyTableFilters();
  syncChangeType();
}
function applyTableFilters(){
  const main=document.getElementById('main-content');
  if(!main)return;
  main.querySelectorAll('table.table').forEach(t=>{
    const panel=t.closest('.panel')||main;
    const q=panel.querySelector('.table-search')?.value?.toLowerCase().trim()||'';
    const f=panel.querySelector('.table-filter')?.value||'';
    const rows=[...t.querySelectorAll('tbody tr')];
    const matched=rows.filter(r=>(r.dataset.search||'').includes(q)&&(!f||r.dataset.filter===f));
    const size=10;
    const max=Math.max(1,Math.ceil(matched.length/size));
    const page=Math.min(max,Math.max(1,Number(t.dataset.page)||1));
    t.dataset.page=page;
    rows.forEach(r=>{r.hidden=!matched.includes(r)||matched.indexOf(r)<(page-1)*size||matched.indexOf(r)>=page*size;});
    let footer=t.parentElement.nextElementSibling;
    if(!footer?.classList.contains('table-pagination')){
      footer=document.createElement('div');footer.className='table-pagination';t.parentElement.after(footer);
    }
    footer.innerHTML=`<span>${matched.length?`${(page-1)*size+1}–${Math.min(page*size,matched.length)}`:'0'} of ${matched.length} records</span>
      <div class="pager-actions"><button type="button" data-action="table-page" data-id="${esc(t.id)}" data-direction="prev" ${page===1?'disabled':''} aria-label="Previous page">${icon('chevron')}</button>
      <span>Page ${page} of ${max}</span><button type="button" data-action="table-page" data-id="${esc(t.id)}" data-direction="next" ${page===max?'disabled':''} aria-label="Next page">${icon('chevron')}</button></div>`;
    const next=footer.nextElementSibling;
    if(!matched.length){
      if(!next?.classList.contains('filter-empty')){const div=document.createElement('div');div.className='filter-empty';div.textContent='No matching records';footer.after(div);}
    }else if(next?.classList.contains('filter-empty'))next.remove();
  });
  main.querySelectorAll('.ticket-list').forEach(list=>{
    const p=list.closest('.panel')||main;
    const q=p.querySelector('.table-search')?.value?.toLowerCase().trim()||'';
    const f=p.querySelector('.table-filter')?.value||'';
    const rows=[...list.querySelectorAll('.filter-record')];
    let n=0;
    rows.forEach(r=>{r.hidden=!(r.dataset.search||'').includes(q)||Boolean(f&&r.dataset.filter!==f);if(!r.hidden)n++;});
    let message=list.nextElementSibling;
    if(!n&&!message?.classList.contains('filter-empty')){message=document.createElement('div');message.className='filter-empty';message.textContent='No matching requests';list.after(message);}
    else if(n&&message?.classList.contains('filter-empty'))message.remove();
  });
}
function openModal(html,title='Dialog'){
  lastFocus=document.activeElement;
  modal.innerHTML=`<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-top"><span class="eyebrow">CAMPUS HOUSING</span>
    <button type="button" class="dialog-close" data-action="close-modal" aria-label="Close dialog">×</button></div>${html}</div>`;
  modal.hidden=false;document.body.classList.add('modal-open');
  (modal.querySelector('input,select,textarea,button')||modal.querySelector('.dialog'))?.focus();
}
function closeModal(){modal.hidden=true;modal.innerHTML='';document.body.classList.remove('modal-open');lastFocus?.focus?.();}
function reviewDialog(id,decision){
  const a=state.applications.find(x=>x.id===Number(id));if(!a)return;
  const available=state.rooms.filter(r=>r.active&&r.available>0);
  const roomChoices=available.map(r=>[r.id,`${r.code} · Building ${r.building} · ${r.available} free`]);
  roomChoices.sort((x,y)=>Number(y[0]===a.preferred_room_id)-Number(x[0]===a.preferred_room_id));
  const isApprove=decision==='approve';
  openModal(`<h2>${isApprove?'Review application':'Reject application'}</h2>
    <p class="modal-sub">${esc(a.student_name)} · Submitted ${date(a.created_at)}</p>
    <div class="detail-grid"><div><span>Preferred room</span><strong>${esc(a.preferred_room_code||'No preference')}</strong></div><div><span>Student note</span><strong>${esc(a.note||'—')}</strong></div></div>
    ${isApprove&&!available.length?`<div class="notice">No beds are available. Update a room before approving.</div>`:''}
    <form id="decision-form" class="form" data-id="${a.id}" data-decision="${decision}">
      ${isApprove?select('room_id','Assign room',roomChoices,a.preferred_room_id||'','required'):''}
      ${textarea('review_note',isApprove?'Review note (optional)':'Reason for rejection','maxlength="1000" rows="3" '+(isApprove?'':'required minlength="3"'))}
      <div class="dialog-actions">${action('close-modal','Cancel','secondary')}<button type="submit" class="btn ${isApprove?'primary':'danger-btn'}" ${isApprove&&!available.length?'disabled':''}>${isApprove?'Approve & assign':'Reject application'}</button></div>
    </form>`, isApprove?'Approve application':'Reject application');
}
function applicationDetails(id){
  const a=state.applications.find(x=>x.id===Number(id));if(!a)return;
  openModal(`<h2>Application #${a.id}</h2><div class="detail-grid"><div><span>Student</span><strong>${esc(a.student_name)}</strong></div>
    <div><span>Status</span>${statusApplication(a)}</div><div><span>Preferred room</span><strong>${esc(a.preferred_room_code||'—')}</strong></div>
    <div><span>Assigned room</span><strong>${esc(a.assigned_room||'—')}</strong></div><div><span>Note</span><strong>${esc(a.note||'—')}</strong></div>
    <div><span>Review note</span><strong>${esc(a.review_note||'—')}</strong></div></div>
    <div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`,'Application details');
}
function roomDialog(id=''){
  const r=state.rooms.find(x=>x.id===Number(id));
  openModal(`<h2>${r?'Edit room':'Add room'}</h2><p class="modal-sub">${r?`Room ${esc(r.code)} · ${r.occupied} currently assigned`:'Register a room in the inventory.'}</p>
    <form id="room-form" class="form" data-id="${r?.id||''}">
    ${r?'':field('code','Room code','text','','required maxlength="20" placeholder="A103"')}
    <div class="form-cols">${field('building','Building','text',r?.building||'','required maxlength="40"')}${field('floor','Floor','number',r?.floor??1,'required min="0" max="100"')}</div>
    <div class="form-cols">${field('capacity','Bed capacity','number',r?.capacity??2,'required min="1" max="20"')}
      ${r?select('active','Availability',[['true','Active'],['false','Inactive']],String(r.active)):''}</div>
    ${r?'<p class="field-help">Rooms with assigned students cannot be deactivated or reduced below occupancy.</p>':''}
    <div class="dialog-actions">${action('close-modal','Cancel','secondary')}<button type="submit" class="btn primary">${r?'Save changes':'Add room'}</button></div></form>`,'Room details');
}
function confirmDialog(title,message,actionName,id,confirmText){
  openModal(`<h2>${esc(title)}</h2><p class="modal-sub">${esc(message)}</p>
    <div class="dialog-actions">${action('close-modal','Keep','secondary')}${action(actionName,confirmText,'danger-btn',id)}</div>`,title);
}
async function ticketDialog(id){
  const r=state.requests.find(x=>x.id===Number(id));if(!r)return;
  const {messages}=await api(`/api/requests/${r.id}/messages`);
  const staff=state.user.role==='staff';
  openModal(`<h2>${esc(r.title)}</h2><p class="modal-sub">Request #${r.id} · ${esc(label(r.category))} · Submitted ${date(r.created_at)}</p>
    <div class="detail-grid ticket-meta"><div><span>Student</span><strong>${esc(r.student_name)}</strong></div><div><span>Status</span>${badge(r.status)}</div>
      <div><span>Priority</span>${badge(r.priority)}</div><div><span>Assigned staff</span><strong>${esc(r.assignee_name||'Unassigned')}</strong></div></div>
    <div class="ticket-description">${esc(r.description)}</div>
    ${r.resolution_note?`<div class="resolution"><strong>Resolution</strong><p>${esc(r.resolution_note)}</p></div>`:''}
    ${staff?`<form class="form ticket-management" id="ticket-form" data-id="${r.id}"><h3>Manage request</h3>
      <div class="form-cols">${select('ticket_status','Status',optionsOf(['open','in_progress','resolved']),r.status)}
        ${select('ticket_priority','Priority',optionsOf(['low','normal','high']),r.priority)}</div>
      ${select('assigned_to','Assigned to',[['','Not assigned'],...state.staff.map(s=>[s.id,s.name])],r.assigned_to||'')}
      ${textarea('resolution_note','Resolution note (required when resolved)','maxlength="1000" rows="2"',r.resolution_note||'')}
      <div><button class="btn primary" type="submit">Save request</button></div></form>`:''}
    <div class="conversation"><h3>Conversation</h3><div class="message-list">${messages.length?messages.map(m=>`<div class="message ${m.author_role==='staff'?'from-staff':''}">
      <div><strong>${esc(m.author_name)}</strong><span>${date(m.created_at)}</span></div><p>${esc(m.message)}</p></div>`).join(''):empty('No replies yet','Messages between the student and residence office appear here.')}</div>
      <form id="message-form" data-id="${r.id}" class="form">${textarea('message','Reply','required minlength="2" maxlength="1000" rows="2" placeholder="Write an update or question"')}
        <div><button type="submit" class="btn secondary">Send reply</button></div></form></div>`,'Service request');
}
function csvCell(value){
  let s=String(value??'').replace(/\s+/g,' ').trim();
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return `"${s.replaceAll('"','""')}"`;
}
function exportTable(id,filename){
  const table=document.getElementById(id);if(!table)return showToast('Nothing to export.',true);
  const headers=[...table.querySelectorAll('thead th')];
  const included=headers.map((th,i)=>/^(Action|Manage)$/i.test(th.textContent.trim())?null:i).filter(i=>i!==null);
  const panel=table.closest('.panel')||document;
  const q=panel.querySelector('.table-search')?.value?.toLowerCase().trim()||'';
  const f=panel.querySelector('.table-filter')?.value||'';
  const rows=[...table.querySelectorAll('thead tr'),...table.querySelectorAll('tbody tr')].filter(tr=>
    !tr.dataset.search||(tr.dataset.search.includes(q)&&(!f||tr.dataset.filter===f)));
  const text=rows.map(tr=>included.map(i=>csvCell(tr.children[i]?.textContent)).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename+'.csv';document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}
const readForm=form=>Object.fromEntries(new FormData(form).entries());
async function submit(form){
  const d=readForm(form);
  if(form.id==='auth-form'){
    if(state.authMode==='register'){
      await api('/api/auth/register','POST',d);state.authMode='login';renderAuth();showToast('Account created. Sign in to continue.');return;
    }
    const result=await api('/api/auth/login','POST',d);
    state.user=result.user;state.view='overview';location.hash='overview';await loadData();showToast('Signed in.');return;
  }
  if(form.id==='apply-form') await api('/api/applications','POST',{note:d.note||'',preferred_room_id:d.preferred_room_id||null});
  else if(form.id==='request-form') await api('/api/requests','POST',d);
  else if(form.id==='profile-form'){
    const {user}=await api('/api/me','PATCH',{name:d.profile_name});state.user=user;
  }
  else if(form.id==='password-form'){
    await api('/api/me/password','POST',d);form.reset();showToast('Password updated. Other sessions were signed out.');return;
  }
  else if(form.id==='decision-form'){
    await api(`/api/applications/${form.dataset.id}/decision`,'POST',{
      decision:form.dataset.decision,room_id:d.room_id?Number(d.room_id):null,review_note:d.review_note||''});
    closeModal();
  }
  else if(form.id==='room-form'){
    const payload={building:d.building,floor:Number(d.floor),capacity:Number(d.capacity)};
    if(form.dataset.id) await api(`/api/rooms/${form.dataset.id}`,'PUT',{...payload,active:d.active==='true'});
    else await api('/api/rooms','POST',{...payload,code:d.code});
    closeModal();
  }
  else if(form.id==='announcement-form'){
    const expires=d.notice_expires?new Date(d.notice_expires).toISOString():null;
    const body={title:d.notice_title,body:d.notice_body,audience:d.notice_audience,
      building:d.notice_audience==='building'?d.notice_building:null,
      pinned:Boolean(form.querySelector('#notice_pinned')?.checked),expires_at:expires};
    if(form.dataset.id)await api(`/api/announcements/${form.dataset.id}`,'PUT',body);
    else await api('/api/announcements','POST',body);
    closeModal();
  }
  else if(form.id==='housing-change-form'){
    await api('/api/housing-changes','POST',{kind:d.change_kind,reason:d.reason,
      target_room_id:d.change_kind==='transfer'?Number(d.target_room_id):null});
  }
  else if(form.id==='change-decision-form'){
    await api(`/api/housing-changes/${form.dataset.id}/decision`,'POST',
      {decision:d.change_decision,review_note:d.change_review_note||''});
    closeModal();
  }
  else if(form.id==='ticket-form'){
    await api(`/api/requests/${form.dataset.id}`,'PATCH',{
      status:d.ticket_status,priority:d.ticket_priority,assigned_to:d.assigned_to||null,resolution_note:d.resolution_note||''});
    await loadData();await ticketDialog(form.dataset.id);showToast('Request updated.');return;
  }
  else if(form.id==='message-form'){
    await api(`/api/requests/${form.dataset.id}/messages`,'POST',{message:d.message});
    await loadData();await ticketDialog(form.dataset.id);showToast('Reply sent.');return;
  }
  else return;
  await loadData();showToast('Changes saved.');
}
async function handleClick(button){
  const name=button.dataset.action,id=button.dataset.id;
  if(name==='show-login'||name==='show-register'){state.authMode=name==='show-register'?'register':'login';renderAuth();return;}
  if(name==='nav'){document.body.classList.remove('sidebar-open');return navigate(id);}
  if(name==='refresh')return state.user?loadData():location.reload();
  if(name==='logout'){await api('/api/auth/logout','POST');state.user=null;state.authMode='login';location.hash='';document.body.classList.remove('sidebar-open');return renderAuth();}
  if(name==='toggle-sidebar'){
    document.body.classList.toggle('sidebar-open');return;
  }
  if(name==='command')return commandDialog();
  if(name==='command-select'){
    const kind=button.dataset.kind;
    closeModal();
    if(kind==='navigation')return navigate(id);
    if(kind==='request'){await navigate('requests');return ticketDialog(id);}
    if(kind==='room'){
      await navigate('rooms');
      if(state.user.role==='staff')return roomRoster(id);
      const room=state.rooms.find(r=>r.id===Number(id));
      const input=document.querySelector('.table-search');
      if(input&&room){input.value=room.code;applyTableFilters();}return;
    }
  }
  if(name==='sort-table'){
    const tableEl=document.getElementById(id);
    if(!tableEl)return;
    const index=Number(button.dataset.index);
    const asc=tableEl.dataset.sortIndex===String(index)?tableEl.dataset.sortDir!=='asc':true;
    tableEl.dataset.sortIndex=String(index);tableEl.dataset.sortDir=asc?'asc':'desc';
    const body=tableEl.tBodies[0];
    [...body.rows].sort((a,b)=>{
      const va=a.cells[index]?.textContent.trim()||'';
      const vb=b.cells[index]?.textContent.trim()||'';
      return va.localeCompare(vb,undefined,{numeric:true,sensitivity:'base'})*(asc?1:-1);
    }).forEach(row=>body.append(row));
    tableEl.querySelectorAll('.sort-indicator').forEach(el=>el.textContent='↕');
    button.querySelector('.sort-indicator').textContent=asc?'↑':'↓';
    tableEl.dataset.page=1;applyTableFilters();return;
  }
  if(name==='table-page'){
    const tableEl=document.getElementById(id);if(!tableEl)return;
    tableEl.dataset.page=Math.max(1,(Number(tableEl.dataset.page)||1)+(button.dataset.direction==='next'?1:-1));
    applyTableFilters();return;
  }
  if(name==='new-announcement'||name==='edit-announcement')return announcementDialog(name==='new-announcement'?'':id);
  if(name==='set-announcement-status'){
    const a=state.announcements.find(x=>x.id===Number(id));if(!a)return;
    return confirmDialog(a.status==='published'?'Archive announcement':'Republish announcement',
      a.status==='published'?'Archived notices will no longer appear to residents.':'This announcement will be visible to its audience again.',
      'confirm-announcement-status',id,a.status==='published'?'Archive':'Republish');
  }
  if(name==='confirm-announcement-status'){
    const a=state.announcements.find(x=>x.id===Number(id));if(!a)return;
    await api(`/api/announcements/${id}/status`,'POST',{status:a.status==='published'?'archived':'published'});
    closeModal();await loadData();showToast('Announcement updated.');return;
  }
  if(name==='change-details')return changeDialog(id);
  if(name==='room-roster')return roomRoster(id);
  if(name==='student-details')return studentDetails(id);
  if(name==='cancel-change')return confirmDialog('Cancel housing change','You can submit another housing request after cancelling this one.',
    'confirm-cancel-change',id,'Cancel request');
  if(name==='confirm-cancel-change'){
    await api(`/api/housing-changes/${id}/cancel`,'POST',{});
    closeModal();await loadData();showToast('Request cancelled.');return;
  }
  if(name==='close-modal')return closeModal();
  if(name==='new-room'||name==='edit-room')return roomDialog(name==='new-room'?'':id);
  if(name==='approve'||name==='reject')return reviewDialog(id,name);
  if(name==='application-details')return applicationDetails(id);
  if(name==='open-ticket')return ticketDialog(id);
  if(name==='checkout')return confirmDialog('Check out student','This action releases the assigned bed and records the check-out in history.','confirm-checkout',id,'Confirm check-out');
  if(name==='cancel-application')return confirmDialog('Withdraw application','You can apply again after withdrawal. This action cannot be undone.','confirm-withdraw',id,'Withdraw application');
  if(name==='confirm-checkout'){
    await api(`/api/allocations/${id}`,'DELETE');closeModal();await loadData();showToast('Check-out recorded.');return;
  }
  if(name==='confirm-withdraw'){
    await api(`/api/applications/${id}/cancel`,'POST',{});closeModal();await loadData();showToast('Application withdrawn.');return;
  }
  if(name==='notification-open'){
    const n=state.notifications.find(n=>n.id===Number(id));if(!n)return;
    if(!n.read_at)await api(`/api/notifications/${n.id}/read`,'POST',{});
    await loadData();await navigate(n.target_type==='requests'?'requests':n.target_type==='housing_changes'?'changes':'applications');
    if(n.target_type==='requests'&&state.requests.find(r=>r.id===n.target_id))await ticketDialog(n.target_id);
    if(n.target_type==='housing_changes'&&state.changes.find(c=>c.id===n.target_id))changeDialog(n.target_id);
    return;
  }
  if(name==='read-all'){
    await api('/api/notifications/read-all','POST',{});await loadData();return;
  }
  if(name==='export-csv')return exportTable('data-table',`${state.view}-export`);
  if(name==='export-activity')return exportTable('activity-table','activity-history');
}
document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('form'))return;
  event.preventDefault();
  const submitButton=form.querySelector('button[type="submit"]');
  if(submitButton?.disabled)return;
  if(submitButton)submitButton.disabled=true;
  try{await submit(form);}catch(error){showToast(error.message,true);}
  finally{if(submitButton?.isConnected)submitButton.disabled=false;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  button.disabled=true;
  try{await handleClick(button);}catch(error){showToast(error.message,true);}
  finally{if(button.isConnected)button.disabled=false;}
});
document.addEventListener('input',event=>{
  if(event.target.matches('.table-search'))applyTableFilters();
  if(event.target.id==='command-input'){
    const results=document.getElementById('command-results');
    if(results)results.innerHTML=commandItems(event.target.value);
  }
});
document.addEventListener('change',event=>{
  if(event.target.matches('.table-filter')){const table=event.target.closest('.panel')?.querySelector('table.table');if(table)table.dataset.page=1;applyTableFilters();}
  if(event.target.id==='notice_audience')syncAudienceField();
  if(event.target.id==='change_kind')syncChangeType();
});
modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();modal.hidden?commandDialog():closeModal();return;
  }
  if(event.key==='/'&&modal.hidden&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
    event.preventDefault();commandDialog();return;
  }
  if(modal.hidden)return;
  if(event.key==='Escape')closeModal();
  if(event.key==='Tab'){
    const controls=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
    if(!controls.length)return;
    if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  }
});
window.addEventListener('hashchange',async()=>{
  if(state.user && location.hash.slice(1)!==state.view){
    try{await navigate(location.hash.slice(1));}catch(error){showToast(error.message,true);}
  }
});
(async()=>{
  try{
    const {user}=await api('/api/me');
    if(user){state.user=user;state.view=location.hash.slice(1)||'overview';await loadData();}
    else renderAuth();
  }catch(error){root.innerHTML=`<main class="startup-error"><h1>Unable to connect</h1>
    <p>${esc(error.message)}</p><p>Check the Neon connection and server deployment logs.</p>
    <button type="button" class="btn primary" data-action="refresh">Try again</button></main>`;}
})();
