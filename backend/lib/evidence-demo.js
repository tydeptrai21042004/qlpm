// Illustrative CO3011 data only. Never claim these records document real activity.
// Labels and examples intentionally contain explicit UNVERIFIED markers.
import {validateEvidence,EVIDENCE_TYPES} from './evidence-spec.js';

export const DEMO_NOTICE='DEMO / DỮ LIỆU MINH HỌA – KHÔNG PHẢI BẰNG CHỨNG THỰC TẾ. Cần thay bằng thông tin và tệp được xác minh trước khi nộp.';
const marker='[DEMO – CHƯA XÁC MINH]';
const items=[];
const add=(key,kind,title,data)=>{
  const item=validateEvidence({kind,title:`[DEMO] ${title}`,data});
  items.push({seed_key:`co3011-demo-v1-${key}`, ...item});
};
// M1 - Not fabricated meetings: the "response" explicitly says none was obtained.
[
 ['enrolment','Quy tắc xét duyệt hồ sơ','Quy trình xét duyệt hồ sơ và điều kiện nhận phòng?', 'Chưa có phản hồi client. Đề xuất cần hỏi: ai được phép duyệt hồ sơ và phải kiểm tra thông tin nào?'],
 ['capacity','Quy tắc phân phòng','Có được phân phòng vượt sức chứa không và khi nào khóa một phòng?', 'Chưa có phản hồi client. Cần xác nhận sức chứa tối đa và cơ chế ngăn hai lượt phân phòng đồng thời.'],
 ['services','Luồng yêu cầu dịch vụ','Những loại yêu cầu sinh viên nào thuộc phạm vi phiên bản đầu?', 'Chưa có phản hồi client. Cần xác nhận danh mục, SLA và điều kiện đóng yêu cầu.']
].forEach(([id,title,question,response])=>add('consult-'+id,'consultation',title,{
  consulted_on:'2026-11-17',client:'CHƯA XÁC ĐỊNH – cần nhập tên client thật',question, response:`${marker} ${response}`,
  impact:'DỰ THẢO: chưa chốt phạm vi/ước lượng cho đến khi nhận câu trả lời thật.',channel:'CHƯA TRAO ĐỔI',reference:'Không có biên bản thực tế – đây là danh sách câu hỏi mẫu'
}));
const init=[
 ['business_case','Hiện trạng phân tán quy trình nội trú','Tập trung đăng ký, xét duyệt và tra cứu giúp giảm thao tác thủ công; lợi ích cần đo qua thử nghiệm.','ĐỀ XUẤT: triển khai MVP có thể kiểm thử; chưa có chấp thuận từ client.'],
 ['scope','Giới hạn sản phẩm','Bao gồm đăng ký nội trú, xét duyệt, phân phòng, yêu cầu sinh viên, báo cáo cơ bản. Loại trừ thanh toán thực và tích hợp hệ thống KTX chính thức.','ĐỀ XUẤT: ưu tiên luồng cốt lõi; client cần chốt scope.'],
 ['objective','Mục tiêu có thể kiểm chứng','O1: xử lý hồ sơ đầu-cuối; O2: không phân phòng vượt capacity; O3: lưu và tra cứu yêu cầu; O4: kiểm soát truy cập theo vai trò.','ĐỀ XUẤT: đo bằng test case và dữ liệu thử; chưa có kết quả thực nghiệm.'],
 ['stakeholder','Stakeholder và mức độ ảnh hưởng','Sinh viên: đăng ký & yêu cầu; nhân viên: xét duyệt & quản lý phòng; client: xác nhận phạm vi; nhóm: xây dựng & kiểm thử.','ĐỀ XUẤT: bảng mức độ influence/interest và phương thức tham vấn cần được nhóm duyệt.'],
 ['authority','Quyền quyết định và escalation','Client phê duyệt scope/acceptance; PM quản lý kế hoạch; nhóm xử lý kỹ thuật; vấn đề vượt phạm vi chuyển client/giảng viên.','ĐỀ XUẤT: ghi rõ tên người có thẩm quyền thật.'],
 ['communication','Kế hoạch trao đổi thông tin','Họp ngắn theo tuần; cập nhật Git/issue; ghi Client Interaction Log khi có trao đổi thật.','ĐỀ XUẤT: chốt kênh, lịch họp và người nhận.'],
 ['lifecycle','Lựa chọn vòng đời dự án','MVP triển khai tăng dần theo luồng đăng ký → xét duyệt → phân phòng → yêu cầu; kiểm thử mỗi increment.','ĐỀ XUẤT: dùng incremental; chưa được phê duyệt.'],
 ['feasibility','Khả thi và go/no-go','Express + Neon + Vercel phù hợp demo nhỏ; cần kiểm tra giới hạn ngân sách, triển khai, an toàn dữ liệu và thời gian tham gia.','ĐỀ XUẤT: Go có điều kiện sau khi thẩm định và chốt nguồn lực.']
];
init.forEach(([type,title,description,decision])=>add(`init-${type}`,'initiation',title,{topic:type,description:`${marker} ${description}`,decision,owner:'PM (chưa gán người thật)',metric:'Chỉ tiêu chờ phê duyệt',reference:'Mẫu cấu trúc Milestone 1'}));
const products=[
 ['P01','Hồ sơ yêu cầu và phạm vi','Scope, objective, acceptance, stakeholder','Email giao đề tài + Client log','Client xác nhận phạm vi; mọi thay đổi có lịch sử'],
 ['P02','Cổng sinh viên','Đăng ký nội trú, trạng thái, tạo yêu cầu','P01 + thiết kế hệ thống','Sinh viên chỉ thấy dữ liệu của mình; validation rõ ràng'],
 ['P03','Cổng quản trị KTX','Duyệt hồ sơ, phân phòng, xử lý yêu cầu','P01, P02, P04','Không vượt capacity; có audit khi thay đổi trạng thái'],
 ['P04','Cơ sở dữ liệu và API','Neon schema, endpoint, transaction/constraints','P01','Ràng buộc nhất quán và phân quyền bằng test'],
 ['P05','Bộ kiểm thử và QA','Test plan, test case, kết quả, issue log','P02, P03, P04','Có test run thực và bằng chứng pass/fail'],
 ['P06','Gói triển khai và bàn giao','Repo, Vercel deployment, hướng dẫn, release','P02–P05','Demo được luồng end-to-end trên môi trường thật']
];
products.forEach(([id,title,composition,derivation,quality])=>add(`product-${id}`,'product',`${id} ${title}`,{
  product_id:id,description:`${marker} Sản phẩm dự kiến: ${title}`,composition,derivation,standard:'ĐỀ XUẤT: review + traceability + acceptance test',quality,reference:'PBS/PFD chưa đính kèm – bổ sung bản vẽ thật'
}));
const activities=[
 ['A01','P01','Khảo sát và chốt yêu cầu','2026-11-02','2026-11-06',12,'', 'PM'],
 ['A02','P04','Thiết kế dữ liệu và API','2026-11-07','2026-11-11',16,'A01','Backend'],
 ['A03','P02','Xây dựng cổng sinh viên','2026-11-12','2026-11-17',22,'A01,A02','Frontend'],
 ['A04','P03','Xây dựng xét duyệt và phân phòng','2026-11-12','2026-11-18',26,'A02','Backend'],
 ['A05','P03','Xử lý yêu cầu hỗ trợ','2026-11-19','2026-11-22',14,'A03,A04','Frontend'],
 ['A06','P05','Kiểm thử API và giao diện','2026-11-23','2026-11-27',18,'A03,A04,A05','QA'],
 ['A07','P06','Deploy và xác nhận demo','2026-11-28','2026-11-30',10,'A06','DevOps'],
 ['A08','P06','Hoàn thiện báo cáo và bàn giao','2026-12-01','2026-12-05',14,'A07','PM']
];
activities.forEach(([id,pid,title,start,finish,planned,deps,owner])=>add(`activity-${id}`,'activity',`${id} ${title}`,{
 activity_id:id,product_id:pid,owner:`${owner} (vai trò mẫu; thay tên người thật)`,dependencies:deps,planned_start:start,planned_finish:finish,planned_hours:planned,hourly_cost:0,status:'planned',note:`${marker} Lịch và effort chỉ minh họa. KHÔNG có giờ công hoặc ngày hoàn thành thực tế.`,reference:'Không có Git issue hay timesheet thực tế'
}));
[
 ['CP01','P01','PM','Scope và acceptance được client xác nhận','Nếu chưa duyệt: hỏi lại và cập nhật scope'],
 ['CP02','P04','Backend reviewer','Schema, validation và phân quyền vượt qua test','Nếu chưa đạt: sửa transaction/constraint'],
 ['CP03','P05','QA reviewer','Bộ test chạy trên Neon test branch có log','Nếu chưa đạt: sửa bug, chạy lại và lưu minh chứng']
].forEach(([id,pid,reviewer,criteria,fallback])=>add(`checkpoint-${id}`,'checkpoint',`${id} Review gate`,{
 checkpoint_id:id,product_id:pid,reviewer:`${reviewer} (chưa xác định người thật)`,criteria:`${marker} ${criteria}`,status:'not_started',result:'CHƯA ĐÁNH GIÁ',fallback,reference:'Biên bản review thật: chưa có'
}));
[
 ['R01','Phân phòng đồng thời gây vượt capacity',3,5,'Backend','Ràng buộc DB và transaction','Khóa chức năng phân phòng cho đến khi sửa'],
 ['R02','Neon/Vercel không sẵn sàng lúc demo',3,4,'DevOps','Staging test, kiểm tra health/readiness','Demo bản local + nhật ký sự cố'],
 ['R03','Thời gian nhóm thiếu do lịch học',4,3,'PM','Chốt MVP và buffer cho critical tasks','Cắt optional scope, báo client'],
 ['R04','Yêu cầu client thay đổi muộn',3,4,'PM','Scope sign-off + change control','Đánh giá impact và xin phê duyệt'],
 ['R05','Lộ dữ liệu cá nhân trong evidence export',2,5,'QA','Xuất aggregate, RBAC và không lưu password','Thu hồi link, xử lý incident và báo client']
].forEach(([id,description,probability,impact,owner,mitigation,contingency])=>add(`risk-${id}`,'risk',`${id} ${description}`,{
 risk_id:id,description:`${marker} Rủi ro giả định: ${description}`,probability,impact,owner:`${owner} (vai trò mẫu)`,mitigation,contingency,status:'open',reference:'Cần điều chỉnh xác suất/tác động theo đánh giá thực tế'
}));
[
 ['2026-11-02','Khảo sát yêu cầu và phác thảo scope',12],
 ['2026-11-09','Thiết kế schema và luồng KTX',20],
 ['2026-11-16','Xây dựng giao diện/API cốt lõi',28],
 ['2026-11-23','Kiểm thử và đánh giá lỗi',18]
].forEach(([week,planned,hours],i)=>add(`week-${i+1}`,'weekly_log',`Tuần minh họa ${i+1}`,{
 week_start:week,member:'Nhóm mẫu – chưa nhập thành viên thật',planned_work:planned,actual_work:`${marker} CHƯA GHI NHẬN công việc thực tế`,planned_hours:hours,actual_hours:0,issues:'Chưa có log dự án thực tế',action:'Cần ghi lại hoạt động và giờ công thật vào từng tuần',reference:'Không có commit/timesheet liên kết'
}));
add('change-01','change','Ví dụ biểu mẫu phân tích thay đổi',{
 change_id:'CR01',origin:'GIẢ ĐỊNH – không phải yêu cầu thật của giảng viên',description:`${marker} Ví dụ: thêm điều kiện kiểm tra sức chứa phòng`,
 options:'Phương án A: kiểm tra tại giao diện; B: ràng buộc tại API + DB (đề xuất)',impact:'Minh họa: có thể tăng effort API/test và trễ kế hoạch, cần phân tích với số liệu thật.',decision:'CHƯA CÓ QUYẾT ĐỊNH – cần sự kiện thay đổi và phê duyệt thật',status:'proposed',reference:'Không có change notice/phê duyệt thật'
});
[
 ['T01','P02','Sinh viên tạo hồ sơ hợp lệ','Hồ sơ pending và sinh viên chỉ xem hồ sơ của mình'],
 ['T02','P03','Nhân viên phê duyệt hồ sơ','Chỉ staff có quyền approve'],
 ['T03','P03','Hai nhân viên tranh cùng giường trống','Không có phân phòng vượt sức chứa'],
 ['T04','P02','Sinh viên gửi yêu cầu sửa chữa','Có request, trạng thái và lịch sử'],
 ['T05','P04','Sinh viên gọi endpoint của staff','Bị từ chối 403'],
 ['T06','P06','Vercel kết nối Neon và phục vụ SPA','Health, ready, login và workflow chạy thành công']
].forEach(([id,pid,scenario,expected])=>add(`test-${id}`,'test',`${id} ${scenario}`,{
 test_id:id,requirement_id:pid,scenario:`${marker} KỊCH BẢN KIỂM THỬ CHƯA CHẠY: ${scenario}`,expected,actual:'CHƯA CHẠY – cần thực thi trên staging và ghi kết quả',result:'blocked',tester:'QA – chưa gán tên thật',tested_on:'2026-11-17',reference:'Không có test run/screenshot thực'
}));
[
 ['O1','P02','A03','Frontend','R03','T01','CP01'],
 ['O2','P03','A04','Backend','R01','T03','CP02'],
 ['O3','P03','A05','Frontend','R04','T04','CP03'],
 ['O4','P04','A02','Backend','R05','T05','CP02'],
 ['O5','P06','A07','DevOps','R02','T06','CP03']
].forEach(([oid,pid,aid,resource,rid,tid,cp])=>add(`trace-${oid}`,'traceability',`Mô hình liên kết ${oid} → ${pid}`,{
 objective_id:oid,product_id:pid,activity_id:aid,resource,risk_id:rid,test_id:tid,checkpoint_id:cp,note:`${marker} Ma trận liên kết THAM KHẢO, cần đối chiếu với baseline và test thực tế.`
}));
add('baseline-v1','baseline','Project Baseline V1.0 – bản nháp mẫu',{
 version:'V1.0',status:'draft',scope:`${marker} Dự thảo: đăng ký, duyệt, phân phòng, dịch vụ và báo cáo; không tích hợp thanh toán thực.`,
 schedule:'Ví dụ từ 02/11 đến 05/12/2026; cần chốt theo lịch LMS và khả năng nguồn lực thực.',planned_hours:132,planned_cost:0,
 quality:'Đề xuất: xác minh RBAC, capacity, API workflow, zero critical bugs ở release.',reference:'Mẫu chưa được phê duyệt; V1.0 thật phải được client/team duyệt'
});
[
 ['pbs','Cây sản phẩm PBS dự kiến; chưa có bản vẽ đã duyệt'],
 ['pfd','Sơ đồ phụ thuộc sản phẩm PFD; cần xuất bản vẽ thật'],
 ['network','Activity network; bổ sung dependencies và critical path thật'],
 ['gantt','Biểu đồ Gantt dự kiến từ A01–A08; chưa xác nhận thời gian'],
 ['cost','Chi phí thời gian nhân sự, hạ tầng và contingency; thay giả định thật'],
 ['resource','Ma trận phân bổ nguồn lực theo tuần và ràng buộc lịch học'],
 ['quality_plan','Test strategy, review checkpoints và acceptance criteria'],
 ['risk_plan','Risk register, mitigation, contingency theo risk owner'],
 ['scope','Scope statement có in/out và tiêu chí chốt'],
 ['repository','Đường dẫn repository cần nhóm nhập và xác minh'],
 ['demo','Đường dẫn Vercel + kịch bản demo; phải tự kiểm chứng'],
 ['report','Final report PDF, cần phân tích planned-vs-actual bằng số thật']
].forEach(([type,description])=>add(`artifact-${type}`,'artifact',`Artifact mẫu: ${type.toUpperCase()}`,{
 artifact_type:type,description:`${marker} ${description}`,owner:'Chưa gán người phụ trách',reference:'KHÔNG CÓ FILE ĐÍNH KÈM – bổ sung tài liệu nhóm đã tạo',review_status:'draft'
}));
[
 ['scope_delivery','Đối chiếu phạm vi được giao với tính năng đã bàn giao'],
 ['planned_actual','Tổng hợp chênh lệch effort, thời gian, cost và nguyên nhân'],
 ['objectives','Đo mức đạt các objective/metric đã duyệt'],
 ['handover','Repository, hướng dẫn cài đặt, account demo, known issues'],
 ['acceptance','Ghi nhận ý kiến nghiệm thu từ client'],
 ['issues','Danh sách issue mở và kế hoạch xử lý sau bàn giao'],
 ['lessons_learned','Bài học về ước lượng, phân vai, risk và change control']
].forEach(([topic,title])=>add(`closure-${topic}`,'closure',`${topic} – ${title}`,{
 topic,outcome:`${marker} CHƯA ĐẾN GIAI ĐOẠN TỔNG KẾT: ${title}`,evidence:'Chưa có kết quả hoặc biên bản nghiệm thu thực tế',owner:'PM/Team (chưa gán tên)',next_step:'Điền kết quả thật, dẫn chứng và bài học sau project review'
}));
for(let i=1;i<=4;i++)add(`contribution-${i}`,'contribution',`Reflection mẫu – thành viên ${i}`,{
 member:`THÀNH VIÊN ${i} (MẪU; chưa nhập tên)`,responsibility:`${marker} Vai trò cần thống nhất trong RACI`,
 work:'CHƯA CÓ DỮ LIỆU ĐÓNG GÓP THẬT',hours:0,reflection:'Cần nêu điều đã học và điều sẽ cải tiến theo trải nghiệm thực tế',reference:'Chưa cung cấp commits, PR hoặc issue'
});
add('ai-usage-01','ai_usage','Biểu mẫu khai báo hỗ trợ AI',{
 tool:'ChatGPT (mẫu – xác nhận các công cụ nhóm thực sự đã dùng)',task:'Ví dụ hỗ trợ viết code và phân tích requirement; cần ghi rõ phạm vi thật',review:'CHƯA XÁC NHẬN: nhóm cần kiểm thử, đối chiếu đề, chỉnh sửa thủ công và chịu trách nhiệm về kết quả',owner:'Chưa xác định người dùng',reference:'Cần ghi nguồn và commit liên quan'
});
export const DEMO_EVIDENCE=Object.freeze(items);
export const DEMO_TOTAL=items.length;
export function demoCategoryCounts(){
  const counts=Object.fromEntries(Object.keys(EVIDENCE_TYPES).map(k=>[k,0]));
  for(const e of items)counts[e.kind]++;
  return counts;
}
