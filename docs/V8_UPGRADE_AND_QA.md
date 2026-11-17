# KTX Khu A V8 — Nâng cấp giao diện và kế hoạch kiểm tra

## Đã đối chiếu với qlpm-main(2).zip

Tệp người dùng tải lên `qlpm-main(2).zip` có SHA-256 trùng với `qlpm-main(1).zip`; đây là mã nguồn V5 ban đầu.

Phương án cập nhật: tích hợp các workflow V7 vào V5, bổ sung lớp hiển thị V8. Không thay stack Node.js/Express/Neon và không thêm hạ tầng gửi email.

## Các thay đổi V8

| Khu vực | Thay đổi | Nguồn dữ liệu |
|---|---|---|
| Tổng quan cán bộ | Vòng tròn công suất, trạng thái xử lý Một cửa, cột 7 ngày | rooms, applications, requests |
| Thống kê | Hai biểu đồ vòng, số lượt theo ngày, xếp hạng loại yêu cầu | Các API hiện tại |
| Quản lý phòng | Sơ đồ trạng thái phòng theo tòa và tầng; nhấp để lọc bảng | rooms (có mã, tòa, tầng, số giường) |
| Tổng quan sinh viên | Hành trình 3 bước, vòng tròn tiến độ checklist, tiện ích kiểm tra phòng | applications, allocations, localStorage |
| UI chung | Việt hóa nhãn chính, icon, hỗ trợ bàn phím, tăng phân cấp thị giác, responsive | Không cần API mới |
| Bảo mật hiển thị | Mã hóa tên trong section, bỏ style nội tuyến cho progress | Chống HTML injection và tương thích CSP |

**Giới hạn dữ liệu:** Biểu đồ 7 ngày đếm bản ghi có `created_at` của hồ sơ và yêu cầu mà API đang trả về. Đây là **số lượt phát sinh theo ngày**, không phải biến động lịch sử của công suất phòng, không có dự báo và không đại diện mọi bản ghi nếu API giới hạn kết quả.

**Sơ đồ phòng:** Chỉ là lưới trạng thái thông tin, không phải mặt bằng kỹ thuật thực tế. Giới hạn hiển thị tối đa 36 phòng đầu, danh sách bên dưới vẫn có tìm kiếm các phòng khác.

## Không có email notification

Không thêm Resend, SMTP, cron, hàng đợi email hoặc API gửi thư. `email` còn dùng làm tên đăng nhập. Thông báo cá nhân ở trong ứng dụng.

## Bài kiểm tra trên dữ liệu mô phỏng

- 13 màn hình quản trị và 11 màn hình sinh viên trong Playwright Chromium.
- Responsive 390px: không bị tràn ngang.
- Dashboard và báo cáo có biểu đồ SVG; vòng lấp đầy 6/9 giường hiển thị 67%.
- Nhấp vào phòng A101 lọc bảng theo A101.
- Checklist sử dụng native `progress`; phiếu kiểm tra lưu và xem lại bằng API giả lập.
- Nội dung tiêu đề do người dùng nhập được escape.
- Node: 24 bài đạt, 2 bài chưa chạy (HTTP Express chưa được cài dependencies trong môi trường phát triển; Neon cần TEST_DATABASE_URL).

## Kiểm tra cần thực hiện trên hạ tầng thật

1. `npm install` và `npm test`; xử lý các bài bị skip trước khi nghiệm thu.
2. Tạo Neon branch thử nghiệm rồi chạy `npm run db:setup`. Không thử test tích hợp trên database production.
3. Cấu hình `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong Vercel, không commit `.env.local`.
4. Kiểm tra `/api/ready` trên tên miền triển khai, đăng nhập mỗi vai trò và thực hiện các quy trình quản lý thật.
5. Thử các trường hợp số lượng phòng lớn, dữ liệu trống, lỗi kết nối, giới hạn quyền, CSV và in phiếu.
6. Rà soát chính sách bảo vệ thông tin cá nhân, phân quyền nhân viên, lưu trữ, sao lưu và giám sát production trước khi vận hành ngoài môi trường đồ án.

Gói patch không chứa database dump, bí mật đăng nhập hoặc dữ liệu nội trú thật.
