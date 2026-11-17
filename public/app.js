'use strict';
const root = document.getElementById('root');
const modal = document.getElementById('modal');
const toast = document.getElementById('toast');
const state = {
  user:null, view:'overview', authMode:'login', rooms:[], students:[], staff:[],
  applications:[], allocations:[], requests:[], notifications:[], events:[], history:[],
  announcements:[], changes:[], inspections:[], busy:false, syncedAt:null
};
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('vi-VN',
    {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
};
const LABELS = {
 pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',closed:'Đã đóng',withdrawn:'Đã rút',
 active:'Hoạt động',inactive:'Tạm dừng',open:'Mới tiếp nhận',in_progress:'Đang xử lý',resolved:'Hoàn tất',
 low:'Thấp',normal:'Bình thường',high:'Khẩn',maintenance:'Sửa chữa',cleaning:'Vệ sinh',other:'Hỗ trợ khác',
 cancelled:'Đã hủy',published:'Đang đăng',archived:'Lưu trữ',transfer:'Chuyển phòng',checkout:'Trả phòng',
 residence_certificate:'Xác nhận nội trú',resident_card:'Cấp lại thẻ nội trú',late_return:'Về trễ / ra sớm',
 semester_payment:'Đóng phí theo học kỳ',equipment_move:'Mang thiết bị ra/vào',security:'An ninh',
 available:'Còn chỗ',full:'Hết chỗ',ok:'Hoạt động tốt',issue:'Cần xử lý',unchecked:'Chưa kiểm tra'
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
  inspections:'<path d="M8 3H5v18h14V3h-3M9 3h6v4H9zM8 12l2 2 4-4M8 18h7"/>',
  checklist:'<path d="M9 3H4v18h16V3h-5M9 3V2h6v1M8 12l2 2 4-4M8 18h8"/>',
  guide:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 3c-2 1-2 2-2 3m0 3h.01"/>',
  link:'<path d="M14 4h6v6m-10 4L20 4M20 14v5H5V4h5"/>',
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
const number = n => Number(n||0).toLocaleString('vi-VN');
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
  try{response=await fetch(url,opt);}catch{throw Error('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401 && state.user){state.user=null;renderAuth();}
    throw Error(data.error||`Request failed (${response.status})`);
  }
  return data;
}
function navItems(){
  return state.user.role==='staff'
    ? [['overview','Tổng quan'],['applications','Đăng ký nội trú'],['changes','Chuyển / trả phòng'],['rooms','Phòng ở'],['students','Sinh viên'],['requests','Yêu cầu Một cửa'],['announcements','Bảng tin'],['reports','Thống kê'],['activity','Nhật ký'],['inspections','Kiểm tra phòng'],['inbox','Thông báo'],['guide','Cẩm nang KTX'],['settings','Cài đặt']]
    : [['overview','Tổng quan'],['applications','Đăng ký nội trú'],['changes','Chuyển / trả phòng'],['rooms','Phòng trống'],['requests','Yêu cầu Một cửa'],['announcements','Bảng tin'],['inbox','Thông báo'],['checklist','Nhận phòng'],['inspections','Kiểm tra phòng'],['guide','Cẩm nang KTX'],['settings','Cài đặt']];
}
function renderAuth(){
  modal.hidden=true;document.body.classList.remove('modal-open','sidebar-open');
  const register=state.authMode==='register';
  root.innerHTML=`<div class="auth-layout">
    <section class="auth-side"><div class="brand"><span class="brand-mark"><span class="brand-squares"><i></i><i></i><i></i><i></i></span></span><span>KTX Khu A<small>CỔNG NỘI TRÚ · MÔ PHỎNG</small></span></div>
      <div class="auth-intro"><div class="eyebrow">HỆ THỐNG QUẢN LÝ NỘI TRÚ · KHU A</div>
      <h1>Không gian sống sinh viên, kết nối trong một nền tảng.</h1>
      <p>Đăng ký phòng ở, tiếp nhận yêu cầu Một cửa, theo dõi tiến độ và nhận thông báo từ ban quản lý ngay trên một cổng thông tin.</p>
      <div class="auth-highlights"><div>${icon('check')} Đăng ký và xét duyệt nội trú</div><div>${icon('check')} Hỗ trợ dịch vụ Một cửa</div><div>${icon('check')} Thông báo trực tiếp trong hệ thống</div></div></div>
      <div class="auth-side-bottom"><span>CO3011 · Đồ án mô phỏng</span><span>Không phải cổng chính thức của KTX</span></div>
    </section>
    <main class="auth-main"><div class="auth-box"><div class="eyebrow">CHÀO MỪNG ĐẾN KTX KHU A</div>
      <h2>${register?'Tạo tài khoản sinh viên':'Đăng nhập'}</h2><p class="muted">${register?'Đăng ký để theo dõi hồ sơ và dịch vụ nội trú.':'Truy cập thông tin phòng ở và các dịch vụ dành cho sinh viên.'}</p>
      <div class="tab-switch" role="group" aria-label="Account access"><button type="button" class="${register?'':'active'}" data-action="show-login">Đăng nhập</button><button type="button" class="${register?'active':''}" data-action="show-register">Đăng ký</button></div>
      <form class="form" id="auth-form">
        ${register?field('name','Họ và tên','text','','required minlength="2" maxlength="80" autocomplete="name"'):''}
        ${field('email','Địa chỉ email','email','','required autocomplete="username" maxlength="160"')}
        ${field('password','Mật khẩu','password','','required minlength="8" maxlength="128" autocomplete="'+(register?'new-password':'current-password')+'"')}
        ${register?`<p class="field-help">Ít nhất 8 ký tự, gồm chữ và số.</p>`:''}
        <button type="submit" class="btn primary block">${register?'Tạo tài khoản':'Đăng nhập'}${icon('arrow')}</button>
      </form><p class="auth-footnote">Tài khoản cán bộ do quản trị viên hệ thống cấp. Dự án độc lập, không liên kết tài khoản KTX chính thức.</p>
    </div></main></div>`;
}
async function loadData(){
  const keys=['rooms','applications','allocations','requests','notifications','announcements','housing-changes','room-inspections'];
  if(state.user.role==='staff') keys.push('students','staff');
  const results=await Promise.all(keys.map(k=>api(`/api/${k}`)));
  keys.forEach((key,i)=>state[key==='housing-changes'?'changes':key==='room-inspections'?'inspections':key]=results[i][key==='housing-changes'?'changes':key==='room-inspections'?'inspections':key]);
  if(state.view==='activity') await loadActivity();
  state.syncedAt=new Date();
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
  return `<div class="section-head"><div><div class="eyebrow">${state.user.role==='staff'?'BAN QUẢN LÝ KÝ TÚC XÁ':'DỊCH VỤ SINH VIÊN KHU A'}</div><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><div class="header-actions">${controls}</div></div>`;
}
function stat(title,value,detail=''){
  return `<div class="stat"><span>${esc(title)}</span><strong>${esc(value)}</strong>${detail?`<p>${esc(detail)}</p>`:''}</div>`;
}
function panel(title,content,controls='',sub=''){
  return `<section class="panel"><div class="panel-head"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>${controls}</div>${content}</section>`;
}
function table(headers,rows,id='data-table'){
  if(!rows.length)return empty('Chưa có dữ liệu','Các bản ghi sẽ xuất hiện tại đây.');
  return `<div class="table-wrap"><table class="table" id="${esc(id)}"><thead><tr>${headers.map((h,i)=>
    `<th>${/^(Action|Manage)$/i.test(h)?esc(h):`<button type="button" class="sort-button" data-action="sort-table" data-id="${esc(id)}" data-index="${i}">${esc(h)}<span class="sort-indicator" aria-hidden="true">↕</span></button>`}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function filters(placeholder, items=[], exportName=''){
  return `<div class="filter-bar"><label class="search-label"><span class="sr-only">Search records</span><input class="table-search" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></label>
    ${items.length?`<label><span class="sr-only">Filter records</span><select class="table-filter"><option value="">Tất cả trạng thái</option>${items.map(([value,title])=>`<option value="${esc(value)}">${esc(title)}</option>`).join('')}</select></label>`:''}
    ${exportName?`<button type="button" class="btn subtle" data-action="export-csv" data-id="${esc(exportName)}">${icon('download')}Xuất CSV</button>`:''}
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
  return table(['Phòng','Vị trí','Đã sử dụng','Giường trống','Tình trạng',...(staff?['Quản lý']:[])],state.rooms.map(r=>
    row(`<td><strong>${esc(r.code)}</strong></td><td>${esc(r.building)} · Floor ${r.floor}</td>
      <td><div class="occupancy-cell"><span>${r.occupied} / ${r.capacity}</span>${progress(r.occupied,r.capacity)}</div></td>
      <td>${r.active?r.available:'—'}</td><td>${!r.active?badge('inactive'):r.available>0?badge('active','Còn chỗ'):badge('pending','Hết chỗ')}</td>
      ${staff?`<td>${action('room-roster','Sinh viên nội trú','subtle sm',r.id)} ${action('edit-room','Chỉnh sửa','subtle sm',r.id)}</td>`:''}`,
    `${r.code} ${r.building} ${r.floor}`,!r.active?'inactive':r.available?'available':'full')));
}
function applicationTable(staff){
  if(staff) return table(['Sinh viên','Nguyện vọng','Ngày gửi','Trạng thái','Phòng được xếp','Thao tác'],state.applications.map(a=>
    row(`<td><strong>${esc(a.student_name)}</strong><div class="cell-sub">${esc(a.student_email)}</div></td>
      <td>${esc(a.preferred_room_code||'Không chọn phòng')}</td><td>${date(a.created_at)}</td><td>${statusApplication(a)}</td>
      <td>${esc(a.assigned_room||'—')}</td><td>${a.status==='pending'?`<div class="button-row">${action('approve','Xét duyệt','secondary sm',a.id)}${action('reject','Từ chối','subtle danger sm',a.id)}</div>`:action('application-details','Chi tiết','subtle sm',a.id)}</td>`,
    `${a.student_name} ${a.student_email} ${a.preferred_room_code||''} ${a.note}`,a.withdrawn?'closed':a.status)));
  return table(['Ngày gửi','Nguyện vọng phòng','Trạng thái','Phòng được xếp','Ghi chú xét duyệt','Thao tác'],state.applications.map(a=>
    row(`<td>${date(a.created_at)}</td><td>${esc(a.preferred_room_code||'Không chọn phòng')}</td><td>${statusApplication(a)}</td>
      <td>${esc(a.assigned_room||'—')}</td><td class="wrap">${esc(a.review_note||'—')}</td><td>${a.status==='pending'?action('cancel-application','Rút hồ sơ','subtle danger sm',a.id):'—'}</td>`,
    `${a.preferred_room_code||''} ${a.note} ${a.review_note}`,a.withdrawn?'closed':a.status)));
}
function requestTable(staff, list=state.requests){
  return table(['Yêu cầu','Sinh viên','Mức ưu tiên','Trạng thái','Phụ trách','Cập nhật','Thao tác'],list.map(r=>
    row(`<td><strong>${esc(r.title)}</strong><div class="cell-sub">#${r.id} · ${esc(label(r.category))}</div></td>
      <td>${staff?esc(r.student_name):'Tôi'}</td><td>${badge(r.priority)}</td><td>${badge(r.status)}</td>
      <td>${esc(r.assignee_name||'Chưa phân công')}</td><td>${date(r.updated_at)}</td>
      <td>${action('open-ticket','Xem','subtle sm',r.id)}</td>`,
    `${r.id} ${r.student_name} ${r.title} ${r.category} ${r.description} ${r.assignee_name||''}`,r.status)));
}
function studentTicketList(list=state.requests){
  if(!list.length)return empty('Chưa có yêu cầu','Yêu cầu mới sẽ hiển thị tại đây.');
  return `<div class="ticket-list">${list.map(r=>`<div class="ticket-item filter-record" data-search="${esc(`${r.id} ${r.title} ${r.category} ${r.description}`.toLowerCase())}" data-filter="${esc(r.status)}">
    <div class="ticket-item-main"><strong>${esc(r.title)}</strong><p>#${r.id} · ${esc(label(r.category))} · ${date(r.created_at)}</p>
    <div class="ticket-status">${badge(r.priority)}${badge(r.status)}</div></div>
    ${action('open-ticket','Chi tiết','subtle sm',r.id)}
  </div>`).join('')}</div>`;
}
function applicationForm(){
  const active=state.applications.find(a=>a.status==='pending'||a.status==='approved');
  const allocated=state.allocations.length>0;
  if(active || allocated) return `<div class="notice">${allocated?'Bạn đã được xếp phòng.':`Hồ sơ #${active.id}: ${label(active.status)}.`} Bạn chưa thể gửi hồ sơ đăng ký khác tại thời điểm này.</div>`;
  return `<form id="apply-form" class="form">
    ${select('preferred_room_id','Nguyện vọng phòng', [['','Không chọn phòng'],...state.rooms.filter(r=>r.active&&r.available>0).map(r=>[r.id,`${r.code} · ${r.building} · ${r.available} giường trống`])],'')}
    <p class="field-help">Nguyện vọng được xem xét khi xét duyệt, không đảm bảo được phân đúng phòng.</p>
    ${textarea('note','Ghi chú bổ sung (nếu có)','maxlength="1000" rows="3" placeholder="Thông tin bổ sung cho ban quản lý"')}
    <button type="submit" class="btn primary">Gửi hồ sơ đăng ký</button>
  </form>`;
}
function requestForm(){
  return `<form id="request-form" class="form">
    <div class="form-cols">${select('category','Loại yêu cầu',[['maintenance','Sửa chữa cơ sở vật chất'],['residence_certificate','Xác nhận sinh viên nội trú'],['resident_card','Cấp lại thẻ nội trú'],['late_return','Đăng ký về trễ / ra sớm'],['semester_payment','Đóng phí nội trú theo học kỳ'],['equipment_move','Mang thiết bị ra/vào'],['security','Phản ánh an ninh'],['cleaning','Vệ sinh'],['other','Hỗ trợ khác']],'maintenance')}
      ${select('priority','Mức ưu tiên',optionsOf(['low','normal','high']),'normal')}</div>
    ${field('title','Tiêu đề','text','','required minlength="3" maxlength="120" placeholder="Ví dụ: Vòi nước bị rò rỉ"')}
    ${textarea('description','Mô tả chi tiết','required minlength="5" maxlength="1000" rows="4" placeholder="Mô tả sự cố và vị trí cụ thể"')}
    <p class="field-help">Đây là yêu cầu nội bộ của ứng dụng mô phỏng. Thủ tục chính thức thực hiện tại <a href="https://myktx.ktxhcm.edu.vn/" target="_blank" rel="noopener noreferrer">myktx.ktxhcm.edu.vn</a>.</p><button type="submit" class="btn primary">Gửi yêu cầu ${icon('arrow')}</button>
  </form>`;
}
function announcementCard(a, compact=false) {
  return `<article class="announcement-card ${a.pinned?'is-pinned':''}">
    <div class="notice-meta"><span class="mini-icon">${icon('announcements')}</span>
      <span>${a.audience==='all'?'Toàn bộ sinh viên':`Tòa ${esc(a.building)}`}</span><span class="meta-sep">·</span><time>${date(a.created_at)}</time>
      ${a.pinned?'<span class="pinned-label">Đã ghim</span>':''}${a.status==='archived'?badge('archived'):''}</div>
    <h3>${esc(a.title)}</h3><p class="announcement-body ${compact?'clamp-text':''}">${esc(a.body)}</p>
    ${!compact&&state.user.role==='staff'?`<div class="notice-controls">${action('edit-announcement','Chỉnh sửa','subtle sm',a.id)}
      ${action('set-announcement-status',a.status==='published'?'Lưu trữ':'Đăng lại','subtle sm',a.id)}</div>`:''}
  </article>`;
}
function announcementPage() {
  const staff=state.user.role==='staff';
  const published=state.announcements.filter(a=>a.status==='published');
  return `${section('Bảng tin',staff?'Đăng tin đến toàn bộ sinh viên hoặc theo tòa nhà.':'Thông báo mới từ ban quản lý.',staff?action('new-announcement','Tạo thông báo','primary','','plus'):'')}
    <div class="editorial-layout"><div class="feed-list">${state.announcements.length?state.announcements.map(a=>announcementCard(a)).join(''):
      empty('Chưa có thông báo','Thông báo từ ban quản lý sẽ xuất hiện tại đây.')}</div>
      <aside class="aside-stack">${panel('Tổng quan bảng tin',`<div class="info-list"><div><span>Đang hiển thị</span><strong>${number(published.length)}</strong></div>
      <div><span>Đã ghim</span><strong>${number(published.filter(a=>a.pinned).length)}</strong></div><div><span>Phạm vi</span><strong>${staff?'Toàn khu / từng tòa':'Khu nội trú'}</strong></div></div>`)}
      <div class="support-note"><strong>Thông tin nội trú</strong><p>Kết quả xét duyệt và phản hồi yêu cầu cá nhân được quản lý tại từng chức năng riêng. Bảng tin dùng để truyền tải thông báo chung.</p></div></aside></div>`;
}
function announcementDialog(id='') {
  const a=state.announcements.find(x=>x.id===Number(id));
  const buildings=[...new Set(state.rooms.map(x=>x.building))].sort();
  const toLocal=t=>t?new Date(new Date(t).getTime()-new Date(t).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  openModal(`<h2>${a?'Chỉnh sửa thông báo':'Tạo thông báo'}</h2><p class="modal-sub">Thông báo hiển thị trực tiếp trên bảng tin của sinh viên phù hợp.</p>
    <form id="announcement-form" class="form" data-id="${a?.id||''}">
      ${field('notice_title','Tiêu đề','text',a?.title||'','required minlength="4" maxlength="120" placeholder="Ví dụ: Thông báo bảo trì tại tòa A"')}
      ${textarea('notice_body','Nội dung','required minlength="10" maxlength="3000" rows="6" placeholder="Nội dung thông báo và hướng dẫn dành cho sinh viên"',a?.body||'')}
      <div class="form-cols">${select('notice_audience','Phạm vi',[['all','Toàn bộ sinh viên'],['building','Theo tòa nhà']],a?.audience||'all')}
      ${select('notice_building','Tòa nhà',buildings.map(b=>[b,b]),a?.building||buildings[0]||'')}</div>
      <div class="form-cols">${field('notice_expires','Hết hạn (nếu có)','datetime-local',toLocal(a?.expires_at))}
      <div class="field"><label for="notice_pinned">Vị trí hiển thị</label><label class="switch-row"><input id="notice_pinned" name="notice_pinned" type="checkbox" ${a?.pinned?'checked':''}>Ghim lên đầu bảng tin</label></div></div>
      <div class="dialog-actions">${action('close-modal','Hủy','secondary')}<button type="submit" class="btn primary">${a?'Lưu thông báo':'Đăng thông báo'}</button></div>
    </form>`,a?'Chỉnh sửa thông báo':'Tạo thông báo');
  syncAudienceField();
}
function syncAudienceField() {
  const box=document.getElementById('notice_building');
  if(box) box.closest('.field').hidden=document.getElementById('notice_audience')?.value!=='building';
}
function changeTable(staff) {
  return table(staff?['Sinh viên','Yêu cầu','Nguyện vọng phòng','Ngày gửi','Trạng thái','Thao tác']:['Yêu cầu','Nguyện vọng phòng','Ngày gửi','Trạng thái','Kết quả duyệt','Thao tác'],
    state.changes.map(c=>row(staff?
      `<td><strong>${esc(c.student_name)}</strong><div class="cell-sub">${esc(c.student_email)}</div></td>
       <td>${esc(label(c.kind))}<div class="cell-sub cell-ellipsis">${esc(c.reason)}</div></td>
       <td>${esc(c.target_room_code||'—')}</td><td>${date(c.created_at)}</td><td>${badge(c.status)}</td>
       <td>${action('change-details',c.status==='pending'?'Xét duyệt':'Chi tiết','subtle sm',c.id)}</td>`:
      `<td><strong>${esc(label(c.kind))}</strong></td><td>${esc(c.target_room_code||'—')}</td><td>${date(c.created_at)}</td><td>${badge(c.status)}</td>
       <td class="wrap">${esc(c.review_note||'—')}</td><td>${c.status==='pending'?action('cancel-change','Cancel','subtle danger sm',c.id):action('change-details','Chi tiết','subtle sm',c.id)}</td>`,
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
  if(staff)return `${section('Chuyển / trả phòng','Review transfer and move-out requests from current residents.')}
    <div class="summary-strip"><span class="strip-dot"></span><strong>${pending.length} awaiting review</strong><span>Transfers reserve the new bed and release the previous bed together.</span></div>
    ${panel('Danh sách yêu cầu',`${filters('Search students or request notes',[['pending','Chờ duyệt'],['approved','Đã duyệt'],['rejected','Từ chối'],['cancelled','Đã hủy']],'housing-changes')}${changeTable(true)}`,'',`${state.changes.length} recorded requests`)}`;
  return `${section('Chuyển / trả phòng','Request a different room or arrange a move-out.')}
    <div class="grid-narrow">${panel('Gửi yêu cầu chuyển / trả phòng',housingChangeForm(),'','Requests must be reviewed by residence staff')}
    ${panel('Lịch sử yêu cầu',`${filters('Tìm yêu cầu',[['pending','Chờ duyệt'],['approved','Đã duyệt'],['rejected','Từ chối'],['cancelled','Đã hủy']])}${changeTable(false)}`)}</div>`;
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
       ${select('change_decision','Kết quả duyệt',[['approve','Approve request'],['reject','Decline request']],'approve')}
       ${textarea('change_review_note','Decision note','maxlength="1000" rows="3" placeholder="Add a reason or instructions for the resident"')}
       <div class="notice" id="change-warning">${c.kind==='transfer'?'Approval will transfer the student and update occupancy in both rooms.':'Approval will end the current allocation and release the bed.'}</div>
       <div class="dialog-actions">${action('close-modal','Hủy','secondary')}<button class="btn primary" type="submit">Confirm decision</button></div>
     </form>`:`<div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`}`,'Housing change details');
}
async function roomRoster(id) {
  const {room,residents}=await api(`/api/rooms/${id}/residents`);
  openModal(`<h2>Room ${esc(room.code)}</h2><p class="modal-sub">Building ${esc(room.building)} · Floor ${room.floor}</p>
    <div class="detail-grid"><div><span>Capacity</span><strong>${room.capacity} beds</strong></div><div><span>Occupancy</span><strong>${room.occupied} residents</strong></div>
      <div><span>Free beds</span><strong>${room.capacity-room.occupied}</strong></div><div><span>Room state</span>${badge(room.active?'active':'inactive')}</div></div>
    <div class="detail-section"><h3>Current residents</h3>${residents.length?`<div class="resident-list">${residents.map(r=>`<div>
      <span class="list-avatar">${esc(r.name[0]?.toUpperCase()||'?')}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.email)} · Since ${date(r.assigned_at)}</small></span>
      ${action('student-details','Hồ sơ','subtle sm',r.student_id)}</div>`).join('')}</div>`:empty('No residents assigned','This room has no current occupants.')}</div>
    <div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`,'Sinh viên trong phòng');
}
function studentDetails(id) {
  const s=state.students.find(x=>x.id===Number(id));if(!s)return;
  const apps=state.applications.filter(a=>a.student_id===s.id);
  const tickets=state.requests.filter(r=>r.student_id===s.id);
  const changes=state.changes.filter(c=>c.student_id===s.id);
  openModal(`<div class="profile-detail"><span class="profile-avatar">${esc(s.name.split(' ').map(x=>x[0]).slice(-2).join('').toUpperCase())}</span>
    <div><h2>${esc(s.name)}</h2><p>${esc(s.email)}</p><small>Registered ${date(s.created_at)}</small></div></div>
    <div class="detail-grid"><div><span>Current room</span><strong>${esc(s.room_code||'Chưa xếp phòng')}</strong></div><div><span>Applications</span><strong>${apps.length}</strong></div>
    <div><span>Service requests</span><strong>${tickets.length}</strong></div><div><span>Housing changes</span><strong>${changes.length}</strong></div></div>
    <div class="detail-section"><h3>Recent activity</h3><div class="timeline-list">${[
      ...apps.map(a=>({when:a.created_at,text:`Housing application · ${label(a.status)}`})),
      ...tickets.map(r=>({when:r.created_at,text:`${r.title} · ${label(r.status)}`})),
      ...changes.map(c=>({when:c.created_at,text:`${label(c.kind)} · ${label(c.status)}`}))
    ].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,6).map(a=>`<div><i></i><span>${esc(a.text)}<small>${date(a.when)}</small></span></div>`).join('')||'<p class="muted">No recent records.</p>'}</div></div>
    <div class="dialog-actions">${action('close-modal','Close','secondary')}</div>`,'Student details');
}
// Accessible, dependency-free charts. All figures use current API records only.
const asCount = value => Math.max(0, Number(value) || 0);
const clampRatio = (count,total) => total > 0 ? Math.min(1, asCount(count) / asCount(total)) : 0;
function donutChart(count,total,subtitle,variant='green') {
  const radius=65, circumference=2*Math.PI*radius;
  const fraction=clampRatio(count,total), filled=(circumference*fraction).toFixed(2);
  const summary=total ? `${number(count)} trên ${number(total)} (${Math.round(fraction*100)}%)` : 'Chưa có dữ liệu';
  return `<figure class="donut-figure" aria-label="${esc(subtitle)}: ${esc(summary)}">
    <div class="donut-canvas"><svg viewBox="0 0 180 180" role="img" aria-label="${esc(summary)}">
      <circle class="donut-track" cx="90" cy="90" r="65" fill="none" stroke-width="18"/>
      ${fraction>0?`<circle class="donut-arc ${esc(variant)}" cx="90" cy="90" r="65" fill="none" stroke-width="18"
        stroke-linecap="round" stroke-dasharray="${filled} ${circumference.toFixed(2)}"/>`:''}
    </svg><div class="donut-center"><strong>${total ? Math.round(fraction*100)+'%' : '—'}</strong><small>${esc(subtitle)}</small></div></div>
    <figcaption>${esc(summary)}</figcaption></figure>`;
}
function capacityAnalytics(rooms) {
  const active=rooms.filter(r=>r.active);
  const total=active.reduce((n,r)=>n+asCount(r.capacity),0);
  const occupied=active.reduce((n,r)=>n+asCount(r.occupied),0);
  const buildings=[...new Set(active.map(r=>r.building))].sort().map(building=>{
    const selected=active.filter(r=>r.building===building);
    return {building,total:selected.reduce((n,r)=>n+asCount(r.capacity),0),used:selected.reduce((n,r)=>n+asCount(r.occupied),0)};
  });
  return `<div class="analytics-capacity">${donutChart(occupied,total,'Đã sử dụng')}
    <div class="analytics-capacity-side"><div class="analytics-legend"><span><i class="legend-dot green"></i> Đang sử dụng <strong>${number(occupied)}</strong></span><span><i class="legend-dot pale"></i> Còn trống <strong>${number(Math.max(0,total-occupied))}</strong></span></div>
      ${buildings.length?`<div class="viz-building-list">${buildings.slice(0,6).map(b=>`<div class="viz-building"><div><strong>Tòa ${esc(b.building)}</strong><span>${number(b.used)}/${number(b.total)} giường</span></div>${progress(b.used,b.total)}</div>`).join('')}</div>`:empty('Chưa có phòng','Bổ sung phòng để xem tình trạng sử dụng.')}
      ${buildings.length>6?`<p class="viz-caption">Hiển thị 6/${number(buildings.length)} tòa. Xem đầy đủ trong Thống kê.</p>`:''}</div></div>`;
}
function requestStatusViz(requests) {
  const count=status=>requests.filter(r=>r.status===status).length;
  const resolved=count('resolved'), total=requests.length;
  return `<div class="service-analytics">${donutChart(resolved,total,'Đã hoàn tất','blue')}
    <div class="service-stages">${[['open','Mới tiếp nhận','amber'],['in_progress','Đang xử lý','blue'],['resolved','Hoàn tất','green']].map(([id,text,tone])=>`<div class="stage-line"><span class="stage-label"><i class="legend-dot ${tone}"></i>${text}</span><strong>${number(count(id))}</strong></div>`).join('')}
      <p class="viz-caption">Tính theo các yêu cầu hiện có trong hệ thống; không phải thời gian xử lý theo SLA.</p></div></div>`;
}
function workloadChart(applications,requests) {
  const today=new Date(); today.setHours(0,0,0,0);
  const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(6-i));return d;});
  const dayKey=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const dates={};
  for(const d of days)dates[dayKey(d)]=[0,0];
  for(const [index,items] of [[0,applications],[1,requests]])for(const record of items){
    const d=new Date(record.created_at);if(!Number.isNaN(d.getTime()) && dates[dayKey(d)])dates[dayKey(d)][index]++;
  }
  const counts=days.map(d=>dates[dayKey(d)]);
  const top=Math.max(3,Math.ceil(Math.max(0,...counts.flat())/3)*3);
  const plotTop=20, plotBottom=188, range=plotBottom-plotTop;
  const ticks=[0,1,2,3].map(i=>{const y=plotBottom-i*range/3;return `<line x1="34" y1="${y}" x2="698" y2="${y}" class="workload-grid"/><text x="25" y="${y+4}" text-anchor="end" class="workload-axis">${Math.round(top*i/3)}</text>`;}).join('');
  const columns=days.map((d,i)=>{
    const x=55+i*95;
    const [apps,tickets]=counts[i];
    const heightA=apps/top*(range-10),heightB=tickets/top*(range-10);
    return `<rect class="workload-bar apps" x="${x}" y="${plotBottom-heightA}" width="22" height="${heightA}" rx="4"><title>${apps} hồ sơ ngày ${d.toLocaleDateString('vi-VN')}</title></rect>
    <rect class="workload-bar tickets" x="${x+26}" y="${plotBottom-heightB}" width="22" height="${heightB}" rx="4"><title>${tickets} yêu cầu ngày ${d.toLocaleDateString('vi-VN')}</title></rect>
    <text x="${x+23}" y="213" text-anchor="middle" class="workload-axis">${d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</text>`;
  }).join('');
  const total=counts.reduce((a,b)=>a+b[0]+b[1],0);
  return `<div class="workload-view"><div class="viz-meta"><span><i class="legend-dot green"></i> Hồ sơ mới</span><span><i class="legend-dot blue"></i> Yêu cầu mới</span><strong>${number(total)} lượt trong 7 ngày</strong></div>
    <svg class="workload-svg" viewBox="0 0 720 230" role="img" aria-label="Biểu đồ số hồ sơ đăng ký và yêu cầu Một cửa từng ngày trong 7 ngày gần nhất">${ticks}${columns}</svg>
    <p class="viz-caption">Đếm theo ngày tạo bản ghi trong dữ liệu hiện tại, không phải lịch sử biến động công suất phòng.</p></div>`;
}
function categoryBreakdown(requests) {
  const buckets=new Map();
  for(const item of requests)buckets.set(item.category,(buckets.get(item.category)||0)+1);
  const sorted=[...buckets.entries()].sort((a,b)=>b[1]-a[1]);
  if(!sorted.length)return empty('Chưa có yêu cầu','Dữ liệu sẽ xuất hiện khi sinh viên gửi yêu cầu.');
  const max=sorted[0][1];
  return `<div class="category-breakdown">${sorted.slice(0,6).map(([key,count],i)=>`<div class="category-item"><div class="category-row"><span><i class="category-number">${i+1}</i>${esc(label(key))}</span><strong>${number(count)}</strong></div>
    <progress class="meter category-meter" value="${count}" max="${max}">${percent(count,max)}%</progress></div>`).join('')}
    ${sorted.length>6?`<p class="viz-caption">6 trên ${number(sorted.length)} nhóm yêu cầu được hiển thị.</p>`:''}</div>`;
}
function studentJourney(assigned,pending) {
  const checks=checklistValues();
  const completed=MOVEIN_TASKS.filter(([key])=>checks[key]===true).length;
  const steps=[['01','Đăng ký nội trú',assigned||pending||state.applications.length?'done':'current','applications'],
    ['02','Nhận kết quả xếp phòng',assigned?'done':pending?'current':'next','applications'],
    ['03','Hoàn thành nhận phòng',completed===MOVEIN_TASKS.length&&assigned?'done':assigned?'current':'next','checklist']];
  return `<div class="journey-combo">${donutChart(completed,MOVEIN_TASKS.length,'Checklist','green')}
    <div class="journey-steps">${steps.map(([idx,text,status,page])=>`<button type="button" data-action="nav" data-id="${page}" class="journey-step ${status}"><span class="journey-index">${status==='done'?icon('check'):idx}</span><span>${esc(text)}<small>${status==='done'?'Đã hoàn thành':status==='current'?'Đang thực hiện':'Chưa đến bước này'}</small></span>${icon('chevron')}</button>`).join('')}</div></div>`;
}
function reportsPage() {
  const active=state.rooms.filter(r=>r.active);
  const total=active.reduce((n,r)=>n+asCount(r.capacity),0), used=active.reduce((n,r)=>n+asCount(r.occupied),0);
  const resolved=state.requests.filter(r=>r.status==='resolved');
  const pending=state.applications.filter(a=>a.status==='pending').length+state.changes.filter(c=>c.status==='pending').length;
  const rated=state.requests.filter(r=>r.feedback_rating);
  const average=rated.length?(rated.reduce((n,r)=>n+Number(r.feedback_rating),0)/rated.length).toFixed(1):'—';
  return `${section('Phân tích nội trú','Số liệu tự tổng hợp từ hồ sơ, phòng và yêu cầu trong hệ thống.',action('refresh','Làm mới dữ liệu','secondary','','refresh'))}
  <div class="dashboard-context"><span class="live-indicator"></span> ẢNH CHỤP DỮ LIỆU HIỆN TẠI <span class="context-divider">/</span> Không sử dụng dữ liệu mẫu hoặc dịch vụ bên ngoài</div>
  <div class="stats">${stat('Tỷ lệ lấp đầy',total?`${percent(used,total)}%`:'—',`${number(used)} / ${number(total)} giường`)}
  ${stat('Giường còn trống',number(Math.max(0,total-used)),'Sức chứa phòng đang hoạt động')}
  ${stat('Hồ sơ chờ xử lý',number(pending),'Đăng ký và yêu cầu chuyển/trả')}
  ${stat('Yêu cầu hoàn tất',number(resolved.length),`${number(state.requests.length)} yêu cầu đã tạo`)}</div>
  <div class="viz-panels">
    ${panel('Sức chứa hiện tại',capacityAnalytics(state.rooms),action('nav','Quản lý phòng','subtle sm','rooms'),'Tính theo phân phòng trong cơ sở dữ liệu')}
    ${panel('Tình trạng yêu cầu Một cửa',requestStatusViz(state.requests),action('nav','Xem yêu cầu','subtle sm','requests'),'Tỷ lệ hoàn tất trên tổng yêu cầu')}
  </div>
  <div class="viz-panels mt-panel">
    ${panel('Hoạt động 7 ngày gần nhất',workloadChart(state.applications,state.requests),'','Hồ sơ đăng ký và yêu cầu mới theo ngày')}
    ${panel('Nhóm dịch vụ được sử dụng',categoryBreakdown(state.requests),'','Sắp xếp theo số lượt yêu cầu')}
  </div>
  <div class="mt-panel">${panel('Chất lượng dịch vụ',`<div class="outcome-grid"><div><strong>${number(rated.length)}</strong><span>Đánh giá đã nhận</span></div><div><strong>${average}${rated.length?'/5':''}</strong><span>Điểm hài lòng trung bình</span></div><div><strong>${number(resolved.filter(r=>!r.feedback_rating).length)}</strong><span>Yêu cầu chưa được đánh giá</span></div></div>`,'','Chỉ tính đánh giá thực tế đã được ghi nhận')}</div>
  <p class="report-note">Các biểu đồ chỉ phản ánh bản ghi đã được API trả về ở lần tải gần nhất. Dữ liệu không tự cập nhật theo thời gian thực; sử dụng “Làm mới dữ liệu” để kiểm tra thay đổi.</p>`;
}
function commandItems(query='') {
  const q=query.trim().toLowerCase();
  const nav=navItems().map(([id,title])=>({id,title,kind:'navigation',subtitle:'Go to workspace'}));
  const rooms=state.rooms.slice(0,50).map(r=>({id:r.id,title:`Room ${r.code}`,kind:'room',subtitle:`Building ${r.building} · ${r.available} beds free`}));
  const reqs=state.requests.slice(0,50).map(r=>({id:r.id,title:r.title,kind:'request',subtitle:`Request #${r.id} · ${r.student_name}`}));
  const items=[...nav,...rooms,...reqs].filter(item=>!q||`${item.title} ${item.subtitle} ${item.id}`.toLowerCase().includes(q)).slice(0,12);
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

const OFFICIAL_LINKS = [
  ['Cổng thông tin chính thức','https://ktxhcm.edu.vn/','Tin tức, thông báo, hỗ trợ sinh viên','globe'],
  ['Đăng ký nội trú chính thức','https://sv.ktxhcm.edu.vn/','Đăng ký phòng và theo dõi hồ sơ','applications'],
  ['Dịch vụ Một cửa','https://myktx.ktxhcm.edu.vn/','Thủ tục hành chính dành cho sinh viên nội trú','requests'],
  ['Hướng dẫn và biểu mẫu','https://huongdan.ktxhcm.edu.vn/','Quy trình và hướng dẫn trực tuyến','guide'],
  ['Tham quan KTX','https://thamquan.ktxhcm.edu.vn/','Khám phá không gian ký túc xá','rooms'],
  ['Liên hệ ban quản lý','https://ktxhcm.edu.vn/contact','Tổng đài 1900 055 559','inbox']
];
function guidePage(){
  const staff=state.user.role==='staff';
  return `${section('Cẩm nang KTX Khu A','Tra cứu kênh thông tin và quy trình tham khảo từ hệ thống KTX ĐHQG-HCM.')}
    <div class="guide-banner"><span class="guide-badge">CỔNG THÔNG TIN</span><h2>Tiện ích cho cuộc sống nội trú.</h2>
    <p>Ứng dụng đồ án mô phỏng quy trình quản lý. Để nộp hồ sơ có hiệu lực, sử dụng các dịch vụ chính thức của Trung tâm.</p>
    <div class="guide-banner-chips"><span>Hỗ trợ trực tuyến 24/7</span><span>Khu A · Linh Xuân</span><span>Thông báo trong ứng dụng</span></div></div>
    <div class="guide-grid">${OFFICIAL_LINKS.map(([title,url,detail,glyph])=>`<a class="guide-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="guide-link-icon">${icon(icons[glyph]?glyph:'guide')}</span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="guide-ext">↗</span></a>`).join('')}</div>
    <div class="grid-two mt-panel">
      ${panel('Quy trình tại ứng dụng mô phỏng',`<div class="journey-list"><div><b>01</b><span><strong>Đăng ký phòng</strong><small>Gửi hồ sơ, chọn nguyện vọng và theo dõi trạng thái.</small></span></div><div><b>02</b><span><strong>Nhận kết quả</strong><small>Ban quản lý xét duyệt; kết quả xuất hiện trực tiếp trong ứng dụng.</small></span></div><div><b>03</b><span><strong>Dịch vụ Một cửa</strong><small>Gửi yêu cầu, nhận phản hồi, theo dõi tiến độ.</small></span></div></div>`)}
      ${panel('Thông tin tham khảo',`<div class="info-list"><div><span>Cơ sở</span><strong>KTX Khu A</strong></div><div><span>Địa chỉ</span><strong>Tạ Quang Bửu, Linh Xuân, TP.HCM</strong></div><div><span>Tổng đài</span><strong>1900 055 559</strong></div><div><span>Website</span><strong>ktxhcm.edu.vn</strong></div></div><p class="field-help">Thông tin tham khảo từ Trung tâm Quản lý KTX và Khu đô thị ĐHQG-HCM. Không thay thế hướng dẫn được cập nhật trên website chính thức.</p>`)}</div>`;
}
const INSPECTION_ITEMS = [
  ['door_state','Cửa và ổ khóa','Kiểm tra cửa đóng mở, chốt và ổ khóa'],
  ['lighting_state','Hệ thống điện, đèn','Quan sát công tắc, ổ cắm và bóng đèn'],
  ['fan_state','Quạt và thông gió','Kiểm tra quạt, cửa sổ và khả năng thông gió'],
  ['furniture_state','Giường, bàn, tủ','Kiểm tra hiện trạng đồ nội thất được bàn giao'],
  ['bathroom_state','Nhà vệ sinh, nước','Kiểm tra vòi nước, thoát nước và vệ sinh']
];
const MOVEIN_TASKS = [
  ['account','Đã kiểm tra thông tin tài khoản','Họ tên và thông tin đăng nhập chính xác.'],
  ['application','Đã theo dõi tình trạng hồ sơ','Kiểm tra kết quả xét duyệt nội trú.'],
  ['room','Đã xem thông tin phòng được xếp','Xác nhận tòa, tầng và mã phòng.'],
  ['rules','Đã đọc nội quy và hướng dẫn KTX','Tham khảo cẩm nang và kênh thông tin chính thức.'],
  ['inspect','Đã kiểm tra trang thiết bị trong phòng','Kiểm tra cửa, đèn, quạt, nội thất, nhà vệ sinh.'],
  ['record','Đã gửi phiếu kiểm tra phòng','Lưu hiện trạng phòng vào hệ thống nếu đã nhận phòng.'],
  ['service','Đã biết cách liên hệ hỗ trợ','Sử dụng Dịch vụ Một cửa để gửi yêu cầu khi cần.']
];
function checklistKey() { return `ktxa-move-in-v7-${state.user.id}`; }
function checklistValues() {
  try {
    const data = JSON.parse(localStorage.getItem(checklistKey()) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
}
function checklistPage(){
  const checked=checklistValues();
  const done=MOVEIN_TASKS.filter(([key])=>checked[key]===true).length;
  return `${section('Checklist nhận phòng','Các bước chuẩn bị dành cho sinh viên; trạng thái chỉ lưu trên trình duyệt này.')}
    <div class="arrival-hero"><div><span class="eyebrow">BẮT ĐẦU NỘI TRÚ</span><h2>Sẵn sàng nhận phòng</h2><p>Hoàn thành các bước theo tiến độ của bạn, không cần nhập thông tin nhiều lần.</p></div>
      <div class="arrival-score"><strong>${done}/${MOVEIN_TASKS.length}</strong><span>đã hoàn thành</span></div></div>
    <progress class="checklist-progress" value="${done}" max="${MOVEIN_TASKS.length}" aria-label="Đã hoàn thành ${done} trên ${MOVEIN_TASKS.length} bước">${percent(done,MOVEIN_TASKS.length)}%</progress>
    <div class="grid-two mt-panel"><section class="arrival-list" aria-label="Các bước nhận phòng">${MOVEIN_TASKS.map(([key,title,detail],i)=>`
      <label class="arrival-task ${checked[key]?'is-done':''}"><input type="checkbox" data-check-key="${key}" ${checked[key]?'checked':''}>
      <span class="arrival-step">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span></label>`).join('')}</section>
      <div class="stack-panels">${panel('Bước tiếp theo',`<div class="info-list"><div><span>Phòng hiện tại</span><strong>${esc(state.allocations[0]?.room_code||'Chưa được xếp phòng')}</strong></div><div><span>Phiếu kiểm tra gần nhất</span><strong>${state.inspections.length?date(state.inspections[0].created_at):'Chưa có'}</strong></div></div><div class="button-row mt-panel">${action('nav','Kiểm tra phòng','primary','inspections','inspections')}${action('nav','Dịch vụ Một cửa','secondary','requests','requests')}</div>`)}
      ${panel('Lưu ý',`<p class="field-help">Checklist chỉ dùng để theo dõi việc chuẩn bị. Các mục được lưu trong bộ nhớ trình duyệt, không đồng bộ giữa thiết bị, không phải xác nhận bàn giao chính thức.</p><div class="mt-panel">${action('reset-checklist','Đặt lại checklist','subtle danger')}</div>`)}</div></div>`;
}
function inspectionIssues(item) {return INSPECTION_ITEMS.filter(([key])=>item[key]==='issue').length;}
function inspectionDetail(id){
  const item=state.inspections.find(x=>x.id===Number(id));if(!item)return;
  openModal(`<h2>Phiếu kiểm tra #${item.id}</h2><p class="modal-sub">Phòng ${esc(item.room_code)} · ${esc(item.student_name)} · ${date(item.created_at)}</p>
    <div class="inspection-detail-list">${INSPECTION_ITEMS.map(([key,name])=>`<div><strong>${esc(name)}</strong>${badge(item[key])}</div>`).join('')}</div>
    <div class="inspection-note"><strong>Ghi chú hiện trạng</strong><p>${esc(item.note||'Không có ghi chú')}</p></div>
    <p class="field-help">Phiếu ghi nhận tự khai trong ứng dụng mô phỏng, không thay thế biên bản kiểm tra/bàn giao có xác nhận của Ban quản lý.</p>
    <div class="dialog-actions">${action('close-modal','Đóng')}${action('print-inspection','In phiếu','primary',item.id,'download')}</div>`,'Chi tiết kiểm tra');
}
function inspectionPage(){
  const staff=state.user.role==='staff', allocated=state.allocations[0];
  const reports=state.inspections;
  const issues=reports.filter(item=>inspectionIssues(item)>0).length;
  const summary=`<div class="stats cols-3">${stat('Phiếu đã ghi',reports.length,staff?'200 phiếu gần nhất':'Các lần kiểm tra của bạn')}
    ${stat('Phiếu có vấn đề',issues,'Ít nhất một hạng mục cần kiểm tra')}
    ${stat('Phiếu gần nhất',reports.length?new Date(reports[0].created_at).toLocaleDateString('vi-VN'):'—','Theo dữ liệu hiện có')}</div>`;
  const history=panel(staff?'Danh sách phiếu sinh viên':'Lịch sử kiểm tra',reports.length?
    `${filters('Tìm phòng, sinh viên hoặc ghi chú',[['issue','Có vấn đề'],['ok','Không ghi nhận vấn đề']],'room-inspections')}
    ${table(staff?['Sinh viên','Phòng','Vấn đề','Ngày ghi','Chi tiết']:['Phòng','Vấn đề','Ngày ghi','Chi tiết'],reports.map(item=>row(`${staff?`<td><strong>${esc(item.student_name)}</strong></td>`:''}
      <td>${esc(item.room_code)}</td><td>${inspectionIssues(item)?badge('issue',`${inspectionIssues(item)} hạng mục`):badge('ok','Không ghi nhận')}</td>
      <td>${date(item.created_at)}</td><td>${action('inspection-detail','Xem phiếu','subtle sm',item.id)}</td>`,
      `${item.student_name} ${item.room_code} ${item.note} ${INSPECTION_ITEMS.map(([k])=>item[k]).join(' ')}`,inspectionIssues(item)?'issue':'ok')),'data-table')}`:
    empty('Chưa có phiếu kiểm tra','Các phiếu được ghi nhận sẽ hiển thị tại đây.'));
  if(staff)return `${section('Kiểm tra tình trạng phòng','Sinh viên tự khai tình trạng phòng; cán bộ theo dõi để xử lý kịp thời.')}${summary}${history}`;
  return `${section('Kiểm tra tình trạng phòng','Ghi nhận hiện trạng phòng ở để lưu lại lịch sử và theo dõi thiết bị.')}${summary}
    <div class="grid-two mt-panel">${panel('Gửi phiếu kiểm tra',allocated?`<p class="field-help">Phòng ${esc(allocated.room_code)} · Tòa ${esc(allocated.building)}. Chọn tình trạng từng hạng mục trước khi gửi.</p>
      <form id="inspection-form" class="form">${INSPECTION_ITEMS.map(([key,title,help])=>`<div class="inspect-field"><div><strong>${esc(title)}</strong><small>${esc(help)}</small></div>
      <select name="${key}" aria-label="Tình trạng ${esc(title)}" required><option value="ok">Hoạt động tốt</option><option value="issue">Cần xử lý</option><option value="unchecked">Chưa kiểm tra</option></select></div>`).join('')}
      ${textarea('note','Ghi chú bổ sung','maxlength="1000" rows="3" placeholder="Ghi tình trạng cụ thể, ví dụ: quạt không quay hoặc vòi nước rò rỉ"')}
      <button class="btn primary" type="submit">${icon('check')} Lưu phiếu kiểm tra</button></form>`:
      `<p class="field-help">Bạn cần được phân phòng trước khi ghi phiếu kiểm tra.</p>${action('nav','Theo dõi hồ sơ','primary','applications')}`)}
      ${panel('Lưu ý sử dụng',`<p class="field-help">Nếu một hạng mục cần sửa chữa, sau khi gửi phiếu hãy tạo yêu cầu trong Dịch vụ Một cửa để được xử lý. Phiếu này chỉ ghi nhận trạng thái, không tự động tạo yêu cầu sửa chữa.</p>
        <div class="mt-panel">${action('nav','Tạo yêu cầu sửa chữa','secondary','requests','requests')}</div>`)}
    </div><div class="mt-panel">${history}</div>`;
}
function printInspection(id){
  const item=state.inspections.find(x=>x.id===Number(id));if(!item)return;
  const printable=document.createElement('section');printable.id='inspection-print-sheet';
  printable.innerHTML=`<h1>PHIẾU GHI NHẬN TÌNH TRẠNG PHÒNG</h1><p>Hệ thống mô phỏng KTX Khu A – ĐHQG TP.HCM</p>
    <p>Mã phiếu: #${item.id} · Ngày: ${date(item.created_at)}</p>
    <p>Sinh viên: ${esc(item.student_name)} · Phòng: ${esc(item.room_code)}</p>
    <table><thead><tr><th>Hạng mục</th><th>Tình trạng</th></tr></thead><tbody>
    ${INSPECTION_ITEMS.map(([key,name])=>`<tr><td>${esc(name)}</td><td>${esc(label(item[key]))}</td></tr>`).join('')}</tbody></table>
    <p><strong>Ghi chú:</strong> ${esc(item.note||'Không có')}</p>
    <small>Phiếu ghi nhận trong ứng dụng mô phỏng; không thay thế biên bản bàn giao chính thức.</small>`;
  document.body.appendChild(printable);
  const cleanup=()=>{printable.remove();window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup,{once:true});
  window.print();
  setTimeout(cleanup,30000);
}
function roomHeatmap(rooms) {
  if(!rooms.length)return empty('Chưa có phòng','Các phòng sẽ hiển thị khi được tạo trong hệ thống.');
  const sorted=[...rooms].sort((a,b)=>String(a.building).localeCompare(String(b.building),'vi',{numeric:true})||Number(a.floor)-Number(b.floor)||String(a.code).localeCompare(String(b.code),'vi',{numeric:true}));
  const visible=sorted.slice(0,36);
  const groups=new Map();
  for(const room of visible){const key=`${room.building} / ${room.floor}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(room);}
  const status=r=>!r.active?'inactive':Number(r.available)>0?'available':'full';
  const statusLabel={available:'Còn giường',full:'Đã đầy',inactive:'Tạm dừng'};
  return `<div class="heatmap-head"><p>Chọn phòng để lọc nhanh trong bảng danh sách. Số giường trống được lấy từ phân phòng hiện tại.</p>
    <div class="heatmap-legend"><span><i class="room-dot available"></i>Còn giường</span><span><i class="room-dot full"></i>Đã đầy</span><span><i class="room-dot inactive"></i>Tạm dừng</span></div></div>
    <div class="room-floor-groups">${[...groups.entries()].map(([key,subset])=>{
      const [building,floor]=key.split(' / ');
      return `<div class="room-floor"><div class="floor-heading"><strong>Tòa ${esc(building)} · Tầng ${esc(floor)}</strong><span>${number(subset.length)} phòng</span></div>
        <div class="room-tiles">${subset.map(r=>`<button type="button" class="room-tile ${status(r)}" data-action="focus-room" data-id="${esc(r.code)}"
          aria-label="Phòng ${esc(r.code)}, ${statusLabel[status(r)]}, ${asCount(r.available)} trên ${asCount(r.capacity)} giường trống">
          <span class="room-tile-code">${esc(r.code)}</span><span class="room-tile-availability">${r.active?`${number(asCount(r.available))} / ${number(asCount(r.capacity))} trống`:'Tạm dừng'}</span></button>`).join('')}</div></div>`;
    }).join('')}</div>
    ${sorted.length>visible.length?`<p class="viz-caption">Đang hiển thị ${number(visible.length)}/${number(sorted.length)} phòng. Dùng ô tìm kiếm bên dưới để xem các phòng khác.</p>`:''}`;
}
function buildingCapacityOverview(){
  const list=Array.from(new Set(state.rooms.map(r=>r.building))).sort();
  if(!list.length)return '';
  return `<div class="building-grid">${list.map(building=>{
    const rooms=state.rooms.filter(r=>r.building===building && r.active),
      capacity=rooms.reduce((n,r)=>n+Number(r.capacity),0),
      occupied=rooms.reduce((n,r)=>n+Number(r.occupied),0),
      emptyBeds=capacity-occupied;
    return `<button class="building-card" type="button" data-action="focus-building" data-id="${esc(building)}">
      <span class="building-icon">${icon('rooms')}</span><span><strong>Tòa ${esc(building)}</strong><small>${rooms.length} phòng đang hoạt động</small></span>
      <b>${emptyBeds} <small>giường còn</small></b><progress class="building-meter" value="${occupied}" max="${capacity||1}" aria-label="Tòa ${esc(building)}: ${occupied} trong ${capacity} giường đã sử dụng">${percent(occupied,capacity)}%</progress></button>`;
  }).join('')}</div>`;
}
function studentPage(){
  const assigned=state.allocations[0];
  const pending=state.applications.find(a=>a.status==='pending');
  const open=state.requests.filter(r=>r.status!=='resolved');
  if(state.view==='overview'){
    const activeNotice=state.announcements.filter(a=>a.status==='published').slice(0,2);
    const name=state.user.name.trim().split(/\s+/).at(-1);
    return `${section(`Chào mừng trở lại, ${name}`,'Theo dõi nội trú, hỗ trợ Một cửa và thông báo ngay tại đây.',action('nav','Tạo yêu cầu','primary','requests','plus'))}
    <div class="student-hero"><div class="student-hero-copy"><div class="eyebrow">KHÔNG GIAN NỘI TRÚ CỦA TÔI</div>
      <h2>${assigned?`Bạn đang ở phòng ${esc(assigned.room_code)}`:pending?'Hồ sơ của bạn đang được xét duyệt':'Chào mừng bạn đến KTX Khu A'}</h2>
      <p>${assigned?`Tòa ${esc(assigned.building)} · Tầng ${assigned.floor} · Nhận phòng ${date(assigned.assigned_at)}`:
      pending?`Hồ sơ #${pending.id} đang chờ ban quản lý xét duyệt.`:'Đăng ký phòng để bắt đầu hành trình nội trú của bạn.'}</p>
      ${action('nav',assigned?'Xem hồ sơ nội trú':pending?'Theo dõi xét duyệt':'Đăng ký phòng ngay','hero-button','applications','arrow')}
    </div><div class="hero-architecture" aria-hidden="true"><div class="tower one"></div><div class="tower two"></div><div class="tower three"></div></div></div>
    <div class="stats cols-3">${stat('Phòng hiện tại',assigned?assigned.room_code:'—',assigned?`Tòa ${assigned.building}`:'Chưa phân phòng')}
      ${stat('Yêu cầu đang xử lý',open.length,'Cần xử lý')}${stat('Thông báo chưa đọc',state.notifications.filter(n=>!n.read_at).length,'Hộp thông báo của bạn')}</div>
    <div class="grid-two">${panel('Bảng tin mới nhất',activeNotice.length?activeNotice.map(a=>announcementCard(a,true)).join(''):empty('Chưa có thông báo mới','Thông báo từ ban quản lý sẽ hiển thị tại đây.'),action('nav','Xem tất cả','subtle sm','announcements'))}
      ${panel('Yêu cầu gần đây',studentTicketList(state.requests.slice(0,3)),action('nav','Xem yêu cầu','subtle sm','requests'))}</div>
    <div class="viz-panels mt-panel">${panel('Hành trình nội trú',studentJourney(assigned,pending),action('nav','Xem checklist','subtle sm','checklist'),'Tiến độ theo hồ sơ và checklist trên thiết bị')}
      ${panel('Tiện ích phòng ở',`<div class="student-tools"><div><span class="tool-icon">${icon('rooms')}</span><span><strong>${assigned?esc(assigned.room_code):'Chưa được xếp phòng'}</strong><small>${assigned?`Tòa ${esc(assigned.building)} · Tầng ${esc(assigned.floor)}`:'Theo dõi trạng thái xét duyệt'}</small></span></div><div><span class="tool-icon">${icon('inspections')}</span><span><strong>${number(state.inspections.length)} phiếu kiểm tra</strong><small>${state.inspections.length?`Gần nhất: ${date(state.inspections[0].created_at)}`:'Bạn chưa ghi phiếu hiện trạng'}</small></span></div></div>
      <div class="student-tool-actions">${action('nav','Kiểm tra phòng','primary','inspections','inspections')}${action('nav','Dịch vụ Một cửa','secondary','requests','requests')}</div>`)}</div>`;
  }
  if(state.view==='applications')return `${section('Đăng ký nội trú','Gửi nguyện vọng phòng ở và theo dõi hồ sơ đã nộp.')}
    <div class="grid-narrow">${panel('Đăng ký phòng mới',applicationForm(),'','Mỗi sinh viên chỉ có một hồ sơ đang xét duyệt')}
      ${panel('Lịch sử đăng ký',applicationTable(false),'','Tình trạng xét duyệt hồ sơ')}</div>`;
  if(state.view==='rooms')return `${section('Danh sách phòng','Số giường trống được tính trực tiếp từ phân phòng trong hệ thống.')}${buildingCapacityOverview()}
    ${panel('Sơ đồ phòng theo tòa & tầng',roomHeatmap(state.rooms),'','Trực quan hóa tình trạng sử dụng phòng')}
    <div class="mt-panel">${panel('Danh sách phòng ở',`${filters('Tìm phòng hoặc tòa nhà',[['available','Còn chỗ'],['full','Hết chỗ'],['inactive','Tạm dừng']])}${roomTable(false)}`,'','Việc xếp phòng do ban quản lý xét duyệt')}</div>`;
  if(state.view==='requests')return `${section('Dịch vụ Một cửa','Gửi yêu cầu, trao đổi với ban quản lý và theo dõi tiến độ xử lý.')}
    <div class="grid-narrow">${panel('Gửi yêu cầu',requestForm())}
      ${panel('Yêu cầu của tôi',`${filters('Tìm yêu cầu',[['open','Mới tiếp nhận'],['in_progress','Đang xử lý'],['resolved','Hoàn tất']])}${studentTicketList()}`)}</div>`;
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
    const changeQueue=state.changes.filter(c=>c.status==='pending');
    const urgent=state.requests.filter(r=>r.priority==='high'&&r.status!=='resolved');
    const attention=[...pending.slice(0,3).map(a=>({type:'Hồ sơ nội trú',name:a.student_name,detail:a.preferred_room_code?`Nguyện vọng ${a.preferred_room_code}`:'Không chọn phòng',id:a.id,act:'approve',when:a.created_at})),
      ...changeQueue.slice(0,3).map(c=>({type:'Chuyển / trả phòng',name:c.student_name,detail:label(c.kind),id:c.id,act:'change-details',when:c.created_at})),
      ...urgent.slice(0,3).map(r=>({type:'Yêu cầu khẩn',name:r.student_name,detail:r.title,id:r.id,act:'open-ticket',when:r.created_at}))]
      .sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,5);
    return `${section('Tổng quan vận hành','Tổng hợp sức chứa, hồ sơ đang xét duyệt và yêu cầu dịch vụ.',action('new-announcement','Đăng thông báo','primary','','plus'))}
      <div class="dashboard-context"><span class="live-indicator"></span>DỮ LIỆU Ở LẦN TẢI GẦN NHẤT <span class="context-divider">/</span> ${esc(new Date().toLocaleDateString('vi-VN',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</div>
      <div class="stats">${stat('Tỷ lệ lấp đầy',`${percent(occupied,capacity)}%`,`${occupied} / ${capacity} giường`)}
      ${stat('Giường còn trống',number(capacity-occupied),`${activeRooms.length} phòng đang sử dụng`)}
      ${stat('Chờ xét duyệt',number(pending.length+changeQueue.length),`${pending.length} hồ sơ · ${changeQueue.length} yêu cầu chuyển/trả`)}
      ${stat('Yêu cầu chưa hoàn tất',number(queue.length),`${urgent.length} yêu cầu khẩn`)}</div>
      <div class="overview-grid">
        ${panel('Cần xử lý',attention.length?`<div class="attention-list">${attention.map(x=>`<div class="attention-item">
          <span class="attention-symbol">${icon(x.act==='approve'?'applications':x.act==='open-ticket'?'requests':'changes')}</span>
          <div><span class="task-kind">${esc(x.type)}</span><strong>${esc(x.name)}</strong><p>${esc(x.detail)}</p></div>
          <button type="button" class="icon-action" data-action="${x.act}" data-id="${x.id}" aria-label="Review ${esc(x.type)}">${icon('chevron')}</button></div>`).join('')}</div>`:
          empty('Không có việc tồn đọng','Chưa có hồ sơ và yêu cầu khẩn đang chờ.'),action('nav','Xem hồ sơ','subtle sm','applications'),'Danh sách cần cán bộ duyệt')}
        ${panel('Công suất phòng ở',capacityAnalytics(state.rooms),action('nav','Xem danh sách phòng','subtle sm','rooms'),'Tình hình sử dụng giường theo từng tòa')}</div>
      <div class="grid-two mt-panel">${panel('Yêu cầu sinh viên',queue.length?`<div class="attention-list service-list">${queue.slice(0,5).map(r=>`<div class="attention-item">
          <span class="attention-symbol">${icon('requests')}</span><div><span class="task-kind">${esc(label(r.category))} · ${esc(r.student_name)}</span>
          <strong>${esc(r.title)}</strong><p>${esc(label(r.status))} · ${esc(label(r.priority))} priority</p></div>
          ${action('open-ticket','Xem yêu cầu','subtle sm',r.id)}</div>`).join('')}</div>`:empty('Không có yêu cầu đang xử lý','Yêu cầu mới của sinh viên sẽ hiển thị tại đây.'),action('nav','Xem yêu cầu','subtle sm','requests'))}
        ${panel('Bảng tin nội trú',state.announcements.filter(a=>a.status==='published').slice(0,2).map(a=>announcementCard(a,true)).join('')||empty('Chưa có bảng tin','Thông báo mới sẽ xuất hiện tại đây.'),action('nav','Quản lý bảng tin','subtle sm','announcements'))}</div>
      <div class="viz-panels mt-panel">${panel('Hoạt động 7 ngày',workloadChart(state.applications,state.requests),action('nav','Phân tích thêm','subtle sm','reports'))}
      ${panel('Trạng thái dịch vụ',requestStatusViz(state.requests),action('nav','Xem yêu cầu','subtle sm','requests'))}</div>
      <div class="mt-panel">${panel('Kiểm tra tình trạng phòng',`<div class="quick-action-strip"><span>${icon('inspections')} Phiếu đã ghi: <strong>${state.inspections.length}</strong></span><span>${icon('requests')} Có hạng mục cần kiểm tra: <strong>${state.inspections.filter(x=>inspectionIssues(x)>0).length}</strong></span>${action('nav','Xem phiếu kiểm tra','secondary','inspections','arrow')}</div>`)}</div>`;
  }
  if(state.view==='applications')return `${section('Xét duyệt đăng ký nội trú','Xem hồ sơ và phân giường trống cho sinh viên.',action('export-csv','Xuất CSV','secondary','','download'))}
    ${panel('Hồ sơ đăng ký',`${filters('Tìm tên, email hoặc phòng',[['pending','Chờ duyệt'],['approved','Đã duyệt'],['rejected','Từ chối'],['closed','Đã đóng']])}${applicationTable(true)}`)}`;
  if(state.view==='rooms')return `${section('Quản lý phòng','Quản lý sức chứa, vị trí và tình trạng hoạt động.',action('new-room','Thêm phòng','primary','','plus'))}
    ${buildingCapacityOverview()}${panel('Sơ đồ phòng theo tòa & tầng',roomHeatmap(state.rooms),'','Chọn phòng để lọc danh sách')}
    <div class="mt-panel">${panel('Danh sách phòng ở',`${filters('Tìm phòng hoặc tòa nhà',[['available','Còn chỗ'],['full','Hết chỗ'],['inactive','Tạm dừng']],'rooms')}${roomTable(true)}`,'',`${activeRooms.length} phòng hoạt động · ${capacity} giường`)}</div>`;
  if(state.view==='students')return `${section('Danh sách sinh viên','Quản lý hồ sơ sinh viên và phòng ở đang được xếp.')}
    ${panel('Sinh viên',`${filters('Tìm theo tên, email hoặc phòng',[['assigned','Đã xếp phòng'],['unassigned','Chưa phân công']],'students')}
      ${table(['Sinh viên','Email','Phòng','Ngày đăng ký','Thao tác'],state.students.map(s=>row(`<td><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.email)}</td><td>${esc(s.room_code||'Chưa xếp phòng')}</td><td>${date(s.created_at)}</td>
        <td><div class="button-row">${action('student-details','Hồ sơ','subtle sm',s.id)}${s.allocation_id?action('checkout','Trả phòng','subtle danger sm',s.allocation_id):''}</div></td>`,
        `${s.name} ${s.email} ${s.room_code||''}`,s.allocation_id?'assigned':'unassigned')))}`)}`;
  if(state.view==='requests')return `${section('Dịch vụ Một cửa','Tiếp nhận và xử lý các yêu cầu sinh viên nội trú.')}
    ${panel('Danh sách yêu cầu',`${filters('Tìm yêu cầu, sinh viên hoặc dịch vụ',[['open','Mới tiếp nhận'],['in_progress','Đang xử lý'],['resolved','Hoàn tất']],'requests')}${requestTable(true)}`)}`;
  if(state.view==='activity')return `${section('Nhật ký vận hành','Theo dõi thay đổi hệ thống và lịch sử trả phòng.')}
    <div class="stack-panels">${panel('Hoạt động hệ thống',table(['Thời gian','Người thao tác','Thao tác','Chi tiết'],state.events.map(e=>
      row(`<td>${date(e.created_at)}</td><td>${esc(e.actor_name)}</td><td>${esc(e.action.replaceAll('_',' '))}</td><td class="wrap">${esc(e.summary)}</td>`,
      `${e.actor_name} ${e.action} ${e.summary}`)),'activity-table'),action('export-activity','Xuất CSV','subtle sm'))}
      ${panel('Lịch sử trả phòng',table(['Sinh viên','Phòng','Đã xếp phòng','Checked out','Processed by'],state.history.map(h=>
      row(`<td>${esc(h.student_name)}</td><td>${esc(h.room_code)}</td><td>${date(h.assigned_at)}</td><td>${date(h.checked_out_at)}</td><td>${esc(h.checked_out_by)}</td>`,
      `${h.student_name} ${h.room_code}`)),'history-table'))}</div>`;
  if(state.view==='changes')return changePage();
  if(state.view==='announcements')return announcementPage();
  if(state.view==='reports')return reportsPage();
  return '';
}
function notificationPage(){
  const unread=state.notifications.filter(n=>!n.read_at).length;
  return `${section('Thông báo','Theo dõi kết quả xét duyệt hồ sơ và phản hồi yêu cầu.',unread?action('read-all','Đánh dấu đã đọc','secondary','','check'):'')}
    ${panel('Hộp thông báo',state.notifications.length?`<div class="notification-list">${state.notifications.map(n=>
      `<div class="notification ${n.read_at?'':'unread'}"><div class="notification-dot"></div><div class="notification-body"><strong>${esc(n.title)}</strong>
      <p>${esc(n.body)}</p><span>${date(n.created_at)}</span></div><div class="notification-actions">${action('notification-open','Xem thông báo','subtle sm',n.id)}</div></div>`).join('')}</div>`:empty('Chưa có thông báo','Kết quả hồ sơ và cập nhật xử lý sẽ hiển thị tại đây.'))}`;
}
function settingsPage(){
  return `${section('Cài đặt tài khoản','Cập nhật hồ sơ cá nhân và thông tin đăng nhập.')}
    <div class="grid-two settings-grid">${panel('Hồ sơ cá nhân',`<form id="profile-form" class="form">${field('profile_name','Họ và tên','text',state.user.name,'required minlength="2" maxlength="80"')}
      <div class="field"><label>Email đăng nhập</label><div class="readonly">${esc(state.user.email)}</div></div><p class="field-help">Email chỉ dùng để nhận diện tài khoản đăng nhập; ứng dụng không gửi email.</p>
      <div><button type="submit" class="btn primary">Lưu hồ sơ</button></div></form>`)}
    ${panel('Đổi mật khẩu',`<form id="password-form" class="form">
      ${field('current_password','Mật khẩu hiện tại','password','','required autocomplete="current-password"')}
      ${field('new_password','Mật khẩu mới','password','','required minlength="10" maxlength="128" autocomplete="new-password"')}
      <p class="field-help">Ít nhất 10 ký tự gồm chữ và số. Các phiên khác sẽ bị đăng xuất.</p>
      <div><button type="submit" class="btn primary">Đổi mật khẩu</button></div></form>`)}</div>`;
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
  const content=state.view==='inbox'?notificationPage():state.view==='settings'?settingsPage():state.view==='guide'?guidePage():state.view==='inspections'?inspectionPage():state.view==='checklist'&&!staff?checklistPage():staff?staffPage():studentPage();
  const primary=staff?nav.slice(0,5):nav.slice(0,4);
  const secondary=staff?nav.slice(5,11):nav.slice(4,9);
  const tertiary=staff?nav.slice(11):nav.slice(9);
  const initials=state.user.name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase();
  root.innerHTML=`<a class="skip-link" href="#main-content">Bỏ qua điều hướng</a><div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-top"><div class="brand"><span class="brand-mark"><span class="brand-squares"><i></i><i></i><i></i><i></i></span></span><span class="brand-copy">KTX Khu A<small>CỔNG NỘI TRÚ · MÔ PHỎNG</small></span></div>
        <button type="button" class="sidebar-close" data-action="toggle-sidebar" aria-label="Close navigation">${icon('close')}</button></div>
      <div class="workspace-picker"><span class="workspace-badge">${staff?'RO':'ST'}</span><span><strong>${staff?'Ban quản lý Khu A':'Sinh viên Khu A'}</strong><small>${staff?'Không gian quản trị':'Không gian nội trú'}</small></span>${icon('chevron')}</div>
      <div class="sidebar-nav">${sidebarGroup(primary,staff?'VẬN HÀNH':'NỘI TRÚ CỦA TÔI')}
        ${sidebarGroup(secondary,staff?'DỊCH VỤ':'DỊCH VỤ SINH VIÊN')}
        ${sidebarGroup(tertiary,'TÀI KHOẢN & THÔNG TIN')}</div>
      <div class="sidebar-bottom"><div class="account-chip"><span class="avatar">${esc(initials)}</span>
        <span><strong>${esc(state.user.name)}</strong><small>${staff?'Nhân viên quản lý':'Tài khoản sinh viên'}</small></span></div>
        <button type="button" class="logout-link" data-action="logout">${icon('logout')}<span>Đăng xuất</span></button></div>
    </aside><button class="sidebar-scrim" type="button" data-action="toggle-sidebar" aria-label="Close navigation"></button>
    <div class="main"><header class="topbar"><div class="topbar-left">
      <button type="button" class="top-icon mobile-menu" data-action="toggle-sidebar" aria-label="Open navigation">${icon('menu')}</button>
      <div class="breadcrumb"><span>${staff?'Ban quản lý':'Cổng sinh viên'}</span>${icon('chevron')}<strong>${esc(current)}</strong></div></div>
      <div class="top-actions"><span class="sync-indicator" title="Lần tải dữ liệu gần nhất">${icon('check')} <span>${state.syncedAt?`Cập nhật ${state.syncedAt.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}`:'Chưa đồng bộ'}</span></span><button type="button" class="global-search" data-action="command">${icon('search')}<span>Tìm nhanh</span><kbd>Ctrl K</kbd></button>
      <a class="official-top-link" href="https://ktxhcm.edu.vn/" target="_blank" rel="noopener noreferrer" title="Website KTX chính thức">KTX chính thức ↗</a><span class="topbar-divider"></span><button type="button" class="top-icon" data-action="refresh" aria-label="Refresh data" title="Refresh data">${icon('refresh')}</button>
      <button type="button" class="top-icon alert-icon" data-action="nav" data-id="inbox" aria-label="Notifications${count?`, ${count} unread`:''}" title="Notifications">${icon('inbox')}${count?`<span class="dot"></span>`:''}</button>
      <button type="button" class="top-account" data-action="nav" data-id="settings" title="Account settings">${esc(initials)}</button></div></header>
      <main id="main-content" class="content">${content}</main><footer class="main-footer"><span>KTX Khu A · Ứng dụng mô phỏng CO3011</span><span>Không phải hệ thống chính thức · ${new Date().getFullYear()}</span></footer></div></div>`;
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
    footer.innerHTML=`<span>${matched.length?`${(page-1)*size+1}–${Math.min(page*size,matched.length)}`:'0'} / ${matched.length} bản ghi</span>
      <div class="pager-actions"><button type="button" data-action="table-page" data-id="${esc(t.id)}" data-direction="prev" ${page===1?'disabled':''} aria-label="Previous page">${icon('chevron')}</button>
      <span>Trang ${page}/${max}</span><button type="button" data-action="table-page" data-id="${esc(t.id)}" data-direction="next" ${page===max?'disabled':''} aria-label="Next page">${icon('chevron')}</button></div>`;
    const next=footer.nextElementSibling;
    if(!matched.length){
      if(!next?.classList.contains('filter-empty')){const div=document.createElement('div');div.className='filter-empty';div.textContent='Không có dữ liệu phù hợp';footer.after(div);}
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
    if(!n&&!message?.classList.contains('filter-empty')){message=document.createElement('div');message.className='filter-empty';message.textContent='Không có yêu cầu phù hợp';list.after(message);}
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
  openModal(`<h2>${isApprove?'Xét duyệt hồ sơ':'Từ chối hồ sơ'}</h2>
    <p class="modal-sub">${esc(a.student_name)} · Submitted ${date(a.created_at)}</p>
    <div class="detail-grid"><div><span>Preferred room</span><strong>${esc(a.preferred_room_code||'Không chọn phòng')}</strong></div><div><span>Student note</span><strong>${esc(a.note||'—')}</strong></div></div>
    ${isApprove&&!available.length?`<div class="notice">No beds are available. Update a room before approving.</div>`:''}
    <form id="decision-form" class="form" data-id="${a.id}" data-decision="${decision}">
      ${isApprove?select('room_id','Assign room',roomChoices,a.preferred_room_id||'','required'):''}
      ${textarea('review_note',isApprove?'Ghi chú duyệt (không bắt buộc)':'Reason for rejection','maxlength="1000" rows="3" '+(isApprove?'':'required minlength="3"'))}
      <div class="dialog-actions">${action('close-modal','Hủy','secondary')}<button type="submit" class="btn ${isApprove?'primary':'danger-btn'}" ${isApprove&&!available.length?'disabled':''}>${isApprove?'Approve & assign':'Từ chối hồ sơ'}</button></div>
    </form>`, isApprove?'Approve application':'Từ chối hồ sơ');
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
  openModal(`<h2>${r?'Edit room':'Thêm phòng'}</h2><p class="modal-sub">${r?`Room ${esc(r.code)} · ${r.occupied} currently assigned`:'Register a room in the inventory.'}</p>
    <form id="room-form" class="form" data-id="${r?.id||''}">
    ${r?'':field('code','Mã phòng','text','','required maxlength="20" placeholder="A103"')}
    <div class="form-cols">${field('building','Tòa nhà','text',r?.building||'','required maxlength="40"')}${field('floor','Tầng','number',r?.floor??1,'required min="0" max="100"')}</div>
    <div class="form-cols">${field('capacity','Công suất phòng ở','number',r?.capacity??2,'required min="1" max="20"')}
      ${r?select('active','Tình trạng',[['true','Active'],['false','Tạm dừng']],String(r.active)):''}</div>
    ${r?'<p class="field-help">Rooms with assigned students cannot be deactivated or reduced below occupancy.</p>':''}
    <div class="dialog-actions">${action('close-modal','Hủy','secondary')}<button type="submit" class="btn primary">${r?'Save changes':'Thêm phòng'}</button></div></form>`,'Room details');
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
      <div><span>Priority</span>${badge(r.priority)}</div><div><span>Assigned staff</span><strong>${esc(r.assignee_name||'Chưa phân công')}</strong></div></div>
    <div class="ticket-description">${esc(r.description)}</div>
    ${r.resolution_note?`<div class="resolution"><strong>Resolution</strong><p>${esc(r.resolution_note)}</p></div>`:''}
    ${!staff&&r.status==='resolved'?(r.feedback_rating?
      `<div class="feedback-done"><strong>Đã đánh giá ${'★'.repeat(Number(r.feedback_rating))}${'☆'.repeat(5-Number(r.feedback_rating))}</strong><p>${esc(r.feedback_comment||'Cảm ơn bạn đã đánh giá dịch vụ.')}</p></div>`:
      `<form id="feedback-form" data-id="${r.id}" class="form feedback-form"><h3>Đánh giá chất lượng xử lý</h3><p class="field-help">Yêu cầu đã hoàn tất. Hãy chia sẻ mức độ hài lòng của bạn.</p>${select('rating','Mức độ hài lòng',[[5,'★★★★★ · Rất hài lòng'],[4,'★★★★☆ · Hài lòng'],[3,'★★★☆☆ · Bình thường'],[2,'★★☆☆☆ · Chưa hài lòng'],[1,'★☆☆☆☆ · Rất chưa hài lòng']],5)}${textarea('feedback_comment','Góp ý (không bắt buộc)','maxlength="500" rows="2" placeholder="Chia sẻ đánh giá của bạn"')}<button type="submit" class="btn primary">Gửi đánh giá</button></form>`):''}

    ${staff?`<form class="form ticket-management" id="ticket-form" data-id="${r.id}"><h3>Manage request</h3>
      <div class="form-cols">${select('ticket_status','Trạng thái',optionsOf(['open','in_progress','resolved']),r.status)}
        ${select('ticket_priority','Mức ưu tiên',optionsOf(['low','normal','high']),r.priority)}</div>
      ${select('assigned_to','Phụ trách',[['','Chưa xếp phòng'],...state.staff.map(s=>[s.id,s.name])],r.assigned_to||'')}
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
  const table=document.getElementById(id);if(!table)return showToast('Không có dữ liệu để xuất.',true);
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
      await api('/api/auth/register','POST',d);state.authMode='login';renderAuth();showToast('Đã tạo tài khoản. Vui lòng đăng nhập.');return;
    }
    const result=await api('/api/auth/login','POST',d);
    state.user=result.user;state.view='overview';location.hash='overview';await loadData();showToast('Đăng nhập thành công.');return;
  }
  if(form.id==='apply-form') await api('/api/applications','POST',{note:d.note||'',preferred_room_id:d.preferred_room_id||null});
  else if(form.id==='request-form') await api('/api/requests','POST',d);
  else if(form.id==='inspection-form'){
    await api('/api/room-inspections','POST',d);await loadData();showToast('Đã lưu phiếu kiểm tra phòng.');return;
  }
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
  else if(form.id==='feedback-form'){
    await api(`/api/requests/${form.dataset.id}/feedback`,'POST',{
      rating:Number(d.rating),comment:d.feedback_comment||''});
    closeModal();await loadData();showToast('Cảm ơn bạn đã đánh giá dịch vụ.');return;
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
  if(name==='inspection-detail')return inspectionDetail(id);
  if(name==='print-inspection')return printInspection(id);
  if(name==='reset-checklist'){
    try{localStorage.removeItem(checklistKey());}catch{showToast('Trình duyệt không cho phép lưu checklist.',true);return;}
    renderApp();showToast('Đã đặt lại checklist.');return;
  }
  if(name==='focus-building'){
    await navigate('rooms');const input=document.querySelector('.table-search');
    if(input){input.value=id;applyTableFilters();input.focus();}return;
  }
  if(name==='focus-room'){
    await navigate('rooms');const input=document.querySelector('.table-search');
    if(input){input.value=id;applyTableFilters();input.focus();}return;
  }

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
      'confirm-announcement-status',id,a.status==='published'?'Lưu trữ':'Đăng lại');
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
  if(event.target.matches('[data-check-key]')){
    const key=event.target.dataset.checkKey;if(!MOVEIN_TASKS.some(([k])=>k===key))return;
    const values=checklistValues();values[key]=event.target.checked;
    try{localStorage.setItem(checklistKey(),JSON.stringify(values));renderApp();}
    catch{showToast('Không lưu được checklist trên thiết bị này.',true);}
    return;
  }
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
