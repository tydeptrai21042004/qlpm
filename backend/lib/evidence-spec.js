// CO3011 evidence categories follow the assignment (Tasks 1–4). No example/fake records are inserted.
const f = (key, label, type='text', required=false, options=[]) => ({key,label,type,required,options});
export const EVIDENCE_TYPES = Object.freeze({
  consultation:{label:'Client Interaction Log', milestone:'M1', task:'1.1', fields:[
    f('consulted_on','Ngày trao đổi','date',true),f('client','Người/đơn vị trả lời','text',true),f('question','Câu hỏi','textarea',true),f('response','Phản hồi thực tế','textarea',true),f('impact','Ảnh hưởng đến quyết định dự án','textarea',true),f('channel','Hình thức liên hệ'),f('reference','Nguồn/bằng chứng (URL hoặc mã tài liệu)')]},
  initiation:{label:'Project Definition / Stakeholders', milestone:'M1', task:'1.2–1.8', fields:[
    f('topic','Loại phân tích','select',true,['business_case','scope','objective','stakeholder','authority','communication','lifecycle','feasibility']),f('description','Nội dung/đánh giá','textarea',true),f('decision','Quyết định / lý do','textarea',true),f('owner','Phụ trách'),f('metric','Chỉ số đo lường (nếu có)'),f('reference','Bằng chứng / nguồn')]},
  product:{label:'PBS / Product Description / PFD',milestone:'M2',task:'2.1–2.3',fields:[
    f('product_id','Mã sản phẩm','text',true),f('description','Mô tả sản phẩm','textarea',true),f('composition','Thành phần và định dạng','textarea'),f('derivation','Đầu vào và sản phẩm phụ thuộc'),f('standard','Tiêu chuẩn / quy cách'),f('quality','Tiêu chí nghiệm thu','textarea',true),f('reference','PBS/PFD minh chứng')]},
  activity:{label:'Activity / Effort / Schedule',milestone:'M2 / M3',task:'2.4–2.11 / 3.3',fields:[
    f('activity_id','Mã hoạt động','text',true),f('product_id','Mã sản phẩm liên quan'),f('owner','Người thực hiện','text',true),f('dependencies','Hoạt động phụ thuộc'),f('planned_start','Bắt đầu kế hoạch','date'),f('planned_finish','Kết thúc kế hoạch','date'),f('actual_start','Bắt đầu thực tế','date'),f('actual_finish','Kết thúc thực tế','date'),f('planned_hours','Giờ công kế hoạch','number',true),f('actual_hours','Giờ công thực tế','number'),f('hourly_cost','Chi phí/giờ (VND)','number'),f('status','Trạng thái','select',true,['planned','in_progress','done','blocked','deferred']),f('note','Giải thích sai lệch','textarea'),f('reference','Minh chứng commit/issue')]},
  checkpoint:{label:'Checkpoints & Quality Plan',milestone:'M2 / M3',task:'2.5 / 2.12',fields:[
    f('checkpoint_id','Mã checkpoint','text',true),f('product_id','Sản phẩm'),f('reviewer','Người kiểm tra','text',true),f('criteria','Nội dung và điều kiện đạt','textarea',true),f('result','Kết quả thực tế','textarea'),f('status','Trạng thái','select',true,['not_started','passed','failed','pending']),f('fallback','Hành động nếu không đạt','textarea'),f('reference','Bằng chứng')]},
  risk:{label:'Risk / Issue Register',milestone:'M2 / M3',task:'2.8–2.9 / 3.4',fields:[
    f('risk_id','Mã rủi ro / issue','text',true),f('description','Rủi ro / vấn đề','textarea',true),f('probability','Xác suất 1–5','rating',true),f('impact','Tác động 1–5','rating',true),f('owner','Risk owner','text',true),f('mitigation','Biện pháp giảm rủi ro','textarea',true),f('contingency','Phương án dự phòng','textarea',true),f('status','Trạng thái','select',true,['open','mitigating','occurred','resolved']),f('actual_effect','Tác động thực tế (nếu xảy ra)','textarea'),f('reference','Minh chứng')]},
  weekly_log:{label:'Weekly Project Log',milestone:'M3',task:'3.2–3.3',fields:[
    f('week_start','Tuần bắt đầu','date',true),f('member','Thành viên / team','text',true),f('planned_work','Công việc kế hoạch','textarea',true),f('actual_work','Công việc thực tế','textarea',true),f('planned_hours','Giờ công kế hoạch','number',true),f('actual_hours','Giờ công thực tế','number',true),f('issues','Vấn đề / sai lệch','textarea'),f('action','Hành động quản lý','textarea',true),f('reference','Commit / issue / tài liệu minh chứng')]},
  change:{label:'Change Request & Impact',milestone:'M3',task:'3.6–3.8',fields:[
    f('change_id','Mã thay đổi','text',true),f('origin','Nguồn yêu cầu (thầy/client...)','text',true),f('description','Nội dung thay đổi','textarea',true),f('options','Các phương án xem xét','textarea',true),f('impact','Tác động đến scope, effort, nguồn lực, tiến độ, cost, risk, quality','textarea',true),f('decision','Quyết định và lý do','textarea',true),f('approver','Người phê duyệt'),f('status','Trạng thái','select',true,['proposed','approved','rejected','implemented']),f('baseline_version','Baseline sau thay đổi'),f('reference','Bằng chứng phê duyệt')]},
  test:{label:'Testing & Verification',milestone:'M3',task:'3.5',fields:[
    f('test_id','Mã test','text',true),f('requirement_id','Mã yêu cầu/sản phẩm','text',true),f('scenario','Tình huống kiểm thử','textarea',true),f('expected','Kết quả mong đợi','textarea',true),f('actual','Kết quả quan sát được','textarea',true),f('result','Kết quả','select',true,['pass','fail','blocked']),f('tester','Người thực hiện','text',true),f('tested_on','Ngày chạy','date',true),f('reference','Test log/screenshot/commit')]},
  traceability:{label:'Objective → Product → Test',milestone:'M1–Final',task:'Mandatory Traceability',fields:[
    f('objective_id','Objective ID','text',true),f('product_id','Product/Requirement ID','text',true),f('activity_id','Activity ID','text',true),f('resource','Resource/Member','text',true),f('risk_id','Risk ID','text',true),f('test_id','Verification/Test ID','text',true),f('checkpoint_id','Checkpoint ID','text',true),f('note','Giải thích liên kết','textarea')]},
  baseline:{label:'Project Baseline (append-only)',milestone:'M2 / M3',task:'2.12 / 3.7',fields:[
    f('version','Version: V1.0, V2.0…','version',true),f('status','Trạng thái','select',true,['draft','approved']),f('approved_by','Người chấp thuận'),f('approved_on','Ngày chấp thuận','date'),f('scope','Phạm vi & exclusions','textarea',true),f('schedule','Mốc thời gian và resource constraints','textarea',true),f('planned_hours','Tổng giờ công ước lượng','number',true),f('planned_cost','Tổng chi phí ước lượng (VND)','number'),f('quality','Tiêu chí chất lượng','textarea',true),f('reference','Đường dẫn baseline/Gantt đã chốt')]},
  artifact:{label:'PBS / PFD / Gantt / Report Artifacts',milestone:'M1–Final',task:'Attachments',fields:[
    f('artifact_type','Loại tài liệu','select',true,['pbs','pfd','gantt','network','cost','resource','quality_plan','risk_plan','scope','report','repository','demo','other']),f('description','Mục đích / phiên bản','textarea',true),f('owner','Người phụ trách'),f('reference','URL/mã tài liệu'),f('review_status','Trạng thái review','select',true,['draft','reviewed','accepted'])]},
  closure:{label:'Delivery / Closure / Lessons',milestone:'Final',task:'4.1–4.5',fields:[
    f('topic','Mục tổng kết','select',true,['scope_delivery','planned_actual','objectives','handover','acceptance','issues','lessons_learned']),f('outcome','Kết quả thực tế','textarea',true),f('evidence','Cơ sở / bằng chứng','textarea',true),f('owner','Người phụ trách'),f('next_step','Hạng mục còn lại / cải tiến','textarea')]},
  contribution:{label:'Individual Contribution',milestone:'Final',task:'4.6',fields:[
    f('member','Thành viên','text',true),f('responsibility','Trách nhiệm','textarea',true),f('work','Đóng góp thực tế','textarea',true),f('hours','Giờ công thực tế','number'),f('reflection','Tự đánh giá / kinh nghiệm','textarea',true),f('reference','Issue / commit / PR')]},
  ai_usage:{label:'AI Tool Declaration',milestone:'Final',task:'Use of Generative AI',fields:[
    f('tool','Công cụ AI sử dụng','text',true),f('task','Công việc được hỗ trợ','textarea',true),f('review','Cách nhóm kiểm tra và chỉnh sửa kết quả','textarea',true),f('owner','Người sử dụng'),f('reference','Bằng chứng / commit')]}
});
export function validateEvidence(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw Object.assign(new Error('Invalid evidence body.'),{status:400});
  const {kind,title,data,supersedes_id} = input;
  const spec = EVIDENCE_TYPES[kind];
  if (!spec) throw Object.assign(new Error('Unknown evidence category.'),{status:400});
  if (typeof title!=='string'||title.trim().length<3||title.trim().length>150) throw Object.assign(new Error('Title must contain 3–150 characters.'),{status:400});
  if (!data || typeof data!=='object' || Array.isArray(data)) throw Object.assign(new Error('Invalid evidence fields.'),{status:400});
  const keys=new Set(spec.fields.map(x=>x.key));
  if(Object.keys(data).some(key=>!keys.has(key))) throw Object.assign(new Error('Unknown evidence field.'),{status:400});
  const clean={};
  for (const field of spec.fields) {
    const raw=data[field.key];
    if ((raw===undefined||raw===null||raw==='')&&!field.required) continue;
    if (raw===undefined||raw===null||raw==='') throw Object.assign(new Error(`${field.label}: required.`),{status:400});
    if (field.type==='number'||field.type==='rating') {
      const num=Number(raw);
      if(!Number.isFinite(num)||num<0||num>1000000000||(field.type==='rating'&&(!Number.isInteger(num)||num<1||num>5)))
        throw Object.assign(new Error(`${field.label}: invalid number.`),{status:400});
      clean[field.key]=num;continue;
    }
    if(typeof raw!=='string'||raw.trim().length>2500) throw Object.assign(new Error(`${field.label}: invalid text.`),{status:400});
    const value=raw.trim();
    if(field.type==='select'&&!field.options.includes(value)) throw Object.assign(new Error(`${field.label}: invalid option.`),{status:400});
    if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(new Date(value+'T00:00:00Z').getTime())||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)) throw Object.assign(new Error(`${field.label}: invalid date.`),{status:400});
    if(field.type==='version'&&!/^V[1-9]\d*\.\d+$/.test(value)) throw Object.assign(new Error('Version must look like V1.0 or V2.0.'),{status:400});
    clean[field.key]=value;
  }
  let supersedes=null;
  if(supersedes_id!==undefined&&supersedes_id!==null&&supersedes_id!==''){
    supersedes=Number(supersedes_id);
    if(!Number.isSafeInteger(supersedes)||supersedes<1)throw Object.assign(new Error('Invalid revision reference.'),{status:400});
  }
  if(kind==='baseline'&&clean.status==='approved'&&(!clean.approved_by||!clean.approved_on))
    throw Object.assign(new Error('Approved baseline needs reviewer and approval date.'),{status:400});
  return {kind,title:title.trim(),data:clean,supersedes_id:supersedes};
}
