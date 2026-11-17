// A checklist of RECORDED artifacts, never a grading engine or an acceptance certificate.
// Data may be truthful, incomplete, or not yet verified by a human reviewer.
export function assessEvidence(allRecords){
  const superseded=new Set(allRecords.map(r=>Number(r.supersedes_id)).filter(Boolean));
  const rows=allRecords.filter(r=>!superseded.has(Number(r.id)));
  const of=kind=>rows.filter(r=>r.kind===kind);
  const types=kind=>new Set(of(kind).map(r=>r.data?.[kind==='artifact'?'artifact_type':'topic']).filter(Boolean));
  const artifacts=types('artifact'),topics=types('initiation'),closure=types('closure');
  const acts=of('activity'),baselines=of('baseline'),changes=of('change');
  const checks=[];
  const add=(task,label,done,hint,conditional=false)=>checks.push({task,label,status:conditional?'conditional':done?'recorded':'missing',hint});
  add('1.1','Client Interaction Log',of('consultation').length>0,'Ghi câu hỏi, phản hồi thực tế và tác động dự án; phải được client xác nhận.');
  add('1.2–1.8','Project Definition / Stakeholder / Lifecycle', ['scope','objective','stakeholder','authority','lifecycle','feasibility','communication','business_case'].every(x=>topics.has(x)),'Cần đủ business case, scope, objective, stakeholder, authority, communication, lifecycle và feasibility.');
  add('2.1','PBS',artifacts.has('pbs'),'Đính kèm cây phân rã sản phẩm (PBS).');
  add('2.2','At least five Product Descriptions',of('product').length>=5,'Ít nhất 5 mô tả có tiêu chí chất lượng.');
  add('2.3','PFD',artifacts.has('pfd'),'Đính kèm Product Flow Diagram.');
  add('2.4','Activity network',artifacts.has('network'),'Đính kèm sơ đồ phụ thuộc giữa các hoạt động.');
  add('2.5','Checkpoints',of('checkpoint').length>0,'Checkpoint phải có người duyệt, tiêu chí và cách xử lý khi không đạt.');
  add('2.6–2.7','Bottom-up effort estimate',acts.some(a=>a.data?.planned_hours!==undefined),'Ghi effort theo hoạt động, phân biệt person-hours và duration.');
  add('2.8–2.9','Risk Register / contingencies',of('risk').length>0,'Rủi ro định lượng, owner, mitigation và contingency.');
  add('2.10','Resource-constrained allocation',artifacts.has('resource'),'Cần bảng phân bổ nguồn lực và lịch khả thi.');
  add('2.11','Gantt schedule',artifacts.has('gantt')||acts.some(a=>a.data?.planned_start&&a.data?.planned_finish),'Có ngày kế hoạch; hệ thống tự tạo Gantt từ Activity hoặc dùng bản đã duyệt.');
  add('2.11','Cost baseline',artifacts.has('cost')||baselines.some(b=>b.data?.planned_cost!==undefined),'Dự toán chi phí có giả định rõ ràng.');
  add('2.12','Quality plan',artifacts.has('quality_plan'),'Quy trình review, acceptance criteria và chiến lược test.');
  add('2.12','Project Baseline V1.0',baselines.some(b=>b.data?.version==='V1.0'),'V1.0 là bản chốt, lưu bất biến để đối chiếu.');
  add('3.1','Working KTX software',artifacts.has('demo')||artifacts.has('repository'),'Cần repo và đường dẫn demo; kiểm chứng khả năng chạy riêng.');
  add('3.2','Weekly Project Log',of('weekly_log').length>0,'Không điền số giờ hoặc sự kiện không thực tế.');
  add('3.3','Planned vs Actual',acts.some(a=>a.data?.actual_hours!==undefined),'Ghi số giờ thực tế, ngày thực tế và giải thích sai lệch.');
  add('3.4','Updated risk/issues',of('risk').length>0,'Cập nhật rủi ro phát sinh, tác động thực tế.');
  add('3.5','Test & QA evidence',of('test').length>0,'Test ID, scenario, expected/actual, kết quả và ảnh/log thật.');
  add('3.6','Lecturer-issued change impact',changes.length>0,'Chỉ ghi khi có sự kiện thay đổi thật từ giảng viên.',changes.length===0);
  const approved=changes.some(c=>['approved','implemented'].includes(c.data?.status)&&c.data?.baseline_version);
  add('3.7','Revised baseline if approved',!approved||baselines.some(b=>b.data?.version===changes.find(c=>['approved','implemented'].includes(c.data?.status)&&c.data?.baseline_version)?.data?.baseline_version),'Nếu quyết định phê duyệt thay đổi baseline, cần tạo version mới và giữ V1.0.',!approved);
  add('3.8','Lower-level plans',artifacts.has('other')||acts.some(a=>a.data?.note),'Lập kế hoạch chi tiết khi có thông tin mới; giải thích tại sao chưa lập từ đầu.',true);
  add('Final 4.1–4.5','Scope, evaluation & closure',['scope_delivery','planned_actual','objectives','handover','acceptance','issues','lessons_learned'].every(x=>closure.has(x)),'Hoàn thành đánh giá mục tiêu, handover và lessons learned.');
  add('Final 4.6','Individual contributions',of('contribution').length>0,'Mỗi thành viên viết đóng góp và reflection, có commit/issue hỗ trợ.');
  add('Mandatory','Traceability Matrix',of('traceability').length>0,'Objective → Product → Activity → Resource → Risk → Test → Checkpoint.');
  add('AI declaration','AI tool usage',of('ai_usage').length>0,'Khai báo công cụ AI đã dùng và cách nhóm thẩm định output.');
  return {checks,total:checks.length,recorded:checks.filter(c=>c.status==='recorded').length,missing:checks.filter(c=>c.status==='missing').length,conditional:checks.filter(c=>c.status==='conditional').length,
    note:'This is a record-presence checklist, not a verification of truthfulness or lecturer approval.'};
}
