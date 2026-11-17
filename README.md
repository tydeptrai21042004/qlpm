# KTX Khu A · Cổng quản lý nội trú (CO3011, bản mô phỏng V9)

Ứng dụng full-stack **Node.js 22 + Express 5 + Neon PostgreSQL + HTML/CSS/JavaScript**, triển khai **Frontend + Backend trong một dự án Vercel**. Xây dựng theo bối cảnh quản lý phòng ở và dịch vụ sinh viên của Ký túc xá Khu A, ĐHQG TP.HCM. **Đây là hệ thống mô phỏng phục vụ đồ án, không phải cổng chính thức.**

## Tính năng

**Dành cho sinh viên**

- Tạo tài khoản / đăng nhập bằng email và mật khẩu, chỉnh sửa tên và đổi mật khẩu. Email **chỉ là định danh đăng nhập**, hệ thống **không gửi thư**.
- Đăng ký phòng, chọn nguyện vọng, xem hồ sơ xét duyệt; xem phòng được phân và yêu cầu chuyển/trả phòng.
- Tra cứu phòng trống và **thống kê giường trống theo từng tòa tự động tính từ Neon**.
- Gửi yêu cầu Một cửa (sửa chữa, vệ sinh, xác nhận nội trú, cấp lại thẻ, về trễ/ra sớm, an ninh, hỗ trợ phí học kỳ...), trao đổi với ban quản lý và đánh giá sau khi xử lý.
- **Checklist chuẩn bị nhận phòng 7 bước**: tích chọn, lưu ngay trên trình duyệt của từng tài khoản; không cần nhập dữ liệu trên server. Checklist **không đồng bộ giữa các thiết bị**.
- **Phiếu kiểm tra tình trạng phòng**: đánh dấu tình trạng khóa cửa, điện/đèn, quạt, đồ nội thất, nhà vệ sinh; ghi chú, lưu lịch sử trên Neon, xem và **in phiếu**. Chỉ sinh viên đang được phân phòng mới có thể tạo phiếu; mã phòng được xác định ở backend.
- Xem bảng tin theo tòa, thông báo cá nhân **trong ứng dụng**, cẩm nang và các liên kết chính thức.

**Dành cho nhân viên**

- **Hồ sơ CO3011:** Project Evidence Center lưu Client Interaction Log, baseline bất biến, effort/actual, risk, test, traceability, handover, AI declaration; xuất ZIP (CSV/JSON/HTML/SVG + tệp PDF/ảnh) trực tiếp qua Vercel và Neon.

- Xét duyệt hồ sơ, quản lý danh sách sinh viên/phòng, kiểm soát sức chứa, chuyển/trả phòng và lịch sử.
- Phân công và xử lý yêu cầu Một cửa, phản hồi trao đổi, đăng/lưu trữ bảng tin theo tòa.
- **Tra cứu phiếu kiểm tra phòng của sinh viên**, xem hạng mục có vấn đề, ghi chú, in phiếu và xuất CSV.
- Tổng quan công suất theo tòa, thống kê hoạt động và nhật ký thao tác.

**Không có email notification**: V7/V8 đã gỡ Resend, hàng đợi email, API gửi email, cron và màn hình cấu hình email. Thông báo hồ sơ/yêu cầu vẫn được lưu trực tiếp trong `notifications` của Neon và xem tại **Thông báo**.

## Chạy trên máy

Yêu cầu Node.js **22 trở lên** và tài khoản Neon/Postgres.

```bash
cp .env.example .env.local
# Mở .env.local, đặt DATABASE_URL và tài khoản admin của bạn
npm install
npm run db:setup
npm run dev
```

Truy cập **http://localhost:3000**. Chỉ bật `SEED_SAMPLE_ROOMS=true` trên **Neon branch test mới** để thêm 4 phòng ví dụ AG/AH; không bật seed đối với dữ liệu chính thức.

## Vercel + Neon (một dự án)

1. Đẩy thư mục source lên GitHub, không đưa `.env.local` hoặc các bí mật vào Git.
2. Import repository vào Vercel, trỏ Root Directory tới thư mục có `server.js` và `package.json`.
3. Đặt Environment Variables: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự, có chữ và số), tùy chọn `ADMIN_NAME` và `SEED_SAMPLE_ROOMS=false`.
4. Deploy (Express server được export từ `server.js`). Truy cập `/api/ready` để kiểm tra database và tự tạo schema mới không phá dữ liệu cũ.
5. Đăng nhập tài khoản quản trị, tạo phòng và thử toàn bộ quy trình trên Neon branch test trước khi dùng bản deploy.

**Không cần** `RESEND_API_KEY`, `MAIL_FROM`, `CRON_SECRET`, `PUBLIC_APP_URL`, cron job hoặc nhà cung cấp email nào. Không có server background job.

## Kiểm thử

```bash
npm run check      # Kiểm tra cấu trúc, cú pháp và unit tests
npm test           # Source, unit, kiểm thử phiếu phòng và API contract (nếu đã npm install)
npm run test:ui    # Browser smoke: Chromium / Playwright
npm run test:api   # HTTP API contract nếu đã cài node_modules
npm run test:ui:interactive # Luồng checklist / phiếu kiểm tra với API mock
npm run test:evidence      # Validation, artifact export, archive, role guards
npm run test:ui:evidence   # Browser smoke UI cho CO3011
```

Để test PostgreSQL thật, tạo **nhánh Neon riêng chỉ dùng cho kiểm thử**, đặt `TEST_DATABASE_URL`, sau đó chạy `npm run test:integration`. Không trỏ test vào production.

Bộ test kiểm tra phiếu phòng gồm quyền sinh viên/nhân viên, trạng thái hợp lệ, kiểm soát room_id phía server, và trường hợp sinh viên chưa có phòng. Browser smoke chạy với API giả lập nên không chứng minh kết nối Neon thật. Cần triển khai để tự kiểm tra luồng đầy đủ qua API và database.

## Thành phần chính

| File | Chức năng |
|---|---|
| `backend/db/index.js` | Schema Neon, an toàn khi nâng cấp, thêm bảng `room_inspections` |
| `backend/routes/room-inspections.js` | API ghi/tra cứu phiếu kiểm tra phòng, phân quyền theo người dùng |
| `backend/lib/context.js` | Audit và thông báo trong ứng dụng, không gửi email |
| `backend/routes/requests.js` | Dịch vụ Một cửa, nhắn tin, đánh giá |
| `public/app.js` | SPA sinh viên/nhân viên, checklist, biểu mẫu, in phiếu |
| `public/khu-a.css` | Giao diện Khu A responsive và bố cục in |
| `docs/KTX_A_REFERENCE_AND_IMPLEMENTATION.md` | Phạm vi tham khảo nghiệp vụ, kiến trúc và giới hạn |

## Project Evidence Center V9

Đăng nhập vai trò **staff** → **Hồ sơ CO3011**. Nhập đúng dữ liệu và minh chứng thực tế (không có dữ liệu tự sinh). Chọn **Xuất bộ bằng chứng**, tải toàn bộ các phần ZIP rồi lưu để nộp. Mỗi ZIP hồ sơ có các file `coverage.json`, `evidence.json`, các CSV, `report.html` để mở trình duyệt và in thành PDF, và biểu đồ SVG (nếu đủ activity/weekly log). Tệp PDF/PNG/JPG/TXT/CSV đính kèm từng bản ghi được lưu trên Neon, mỗi tệp tối đa 850 KB, và xuất trong các ZIP tệp riêng. Trang `/api/evidence/report` cho phép in từng phần trực tuyến; cần đọc lại và viết báo cáo quản lý dự án cuối kỳ riêng.

Vercel không phải ổ lưu file: bằng chứng được lưu Neon BYTEA/JSONB, không lưu `/tmp` hoặc filesystem runtime. Chỉ nhân viên đăng nhập mới được xem, ghi và xuất. Baseline V1.0 không ghi đè; thay đổi kế hoạch phải tạo version khác. **Không tạo nhật ký giả; không tự công nhận đã nghiệm thu.** Chi tiết và quy trình nghiệm thu: [`docs/CO3011_EVIDENCE_EXPORT.md`](docs/CO3011_EVIDENCE_EXPORT.md) và [`docs/VERCEL_V9_DEPLOYMENT.md`](docs/VERCEL_V9_DEPLOYMENT.md).

## Nâng cấp từ V5 / V6 / V7

Áp dụng các file V8 vào mã nguồn cũ rồi triển khai trên cùng Neon. Nếu đang dùng V5, bản vá đã bao gồm các thay đổi backend của V7 cần cho kiểm tra phòng và dịch vụ Một cửa. `CREATE TABLE IF NOT EXISTS room_inspections` tự thêm bảng mới trong lúc khởi tạo API. **V8 không xóa dữ liệu lịch sử**: nếu database từng dùng V6, bảng `email_outbox` và các cột cấu hình email có thể còn trên Neon nhưng không được ứng dụng V7 đọc, ghi hoặc gửi thư. Không tự động `DROP TABLE` vì có thể làm mất dữ liệu cũ; muốn dọn dữ liệu, hãy sao lưu và tự kiểm tra trên nhánh riêng.

## Nâng cấp giao diện và trực quan hóa V8

- **Dashboard quản trị:** vòng tròn công suất giường, tiến độ xử lý Một cửa, biểu đồ 7 ngày cho hồ sơ và yêu cầu.
- **Thống kê:** hai vòng tròn KPI, 7 ngày gần nhất, phân bố nhóm dịch vụ, đánh giá chất lượng; đều lấy từ dữ liệu API đã tải và **không phải biểu đồ dự báo**.
- **Sơ đồ phòng theo tòa/tầng:** lưới phòng còn giường / đã đầy / tạm dừng, có thể nhấp để lọc bảng phòng. Đây là sơ đồ trạng thái dữ liệu, **không phải bản vẽ kiến trúc tòa nhà**.
- **Sinh viên:** biểu đồ tiến độ checklist và hành trình nhận phòng, liên kết đến kiểm tra hiện trạng và yêu cầu dịch vụ.
- Thanh `<progress>` dùng giá trị dữ liệu thật thay vì `style=...` nội tuyến, tương thích với CSP `style-src 'self'`; bổ sung khả năng bỏ qua menu bằng bàn phím, favicon riêng và sửa nội dung trang để mã hóa dữ liệu người dùng.
- Không dùng thư viện vẽ đồ thị, email, cron, dịch vụ bên ngoài hoặc dữ liệu phải cập nhật định kỳ.

Chạy `npm run test:ui` để sinh ảnh minh họa màn hình V8 dưới tên `preview_v8_*`. Đây là kiểm thử trình duyệt **với API giả lập**, không thay thế kiểm thử thực tế bằng Neon.

### Kiểm tra trước khi đưa lên production

- Khởi tạo hoặc cập nhật schema bằng `npm run db:setup` trên **nhánh Neon thử nghiệm** trước; sao lưu cơ sở dữ liệu thật trước khi triển khai.
- Cấu hình biến môi trường riêng trong Vercel, đặt mật khẩu admin đủ mạnh, tắt `SEED_SAMPLE_ROOMS` ở production; không commit `.env.local`.
- Chạy đầy đủ `npm test`, `npm run test:api` sau khi `npm install`, và test tích hợp bằng `TEST_DATABASE_URL` trên branch riêng.
- Kiểm tra lại phân quyền, tải dữ liệu, nhập liệu, in phiếu, export CSV, xử lý lỗi và responsive trên domain Vercel thực tế.
- Rà soát quyền truy cập, chính sách bảo vệ dữ liệu sinh viên, sao lưu, giám sát và vận hành trước khi dùng với người dùng thật. **Không coi demo đã kiểm thử giả lập là hệ thống production được nghiệm thu.**

### Giới hạn

Phiếu kiểm tra là bản tự khai, không phải biên bản bàn giao hợp pháp; checklist chỉ lưu cục bộ, không phải một nhiệm vụ được cán bộ phê duyệt. Không có cổng thanh toán, dữ liệu cá nhân nhạy cảm hoặc tích hợp hệ thống KTX thật. Bản đồ án cần kiểm thử bảo mật, chính sách lưu trữ, sao lưu và nghiệm thu trước khi vận hành dữ liệu sinh viên thật.
