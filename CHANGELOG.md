# V10 – CO3011 demo evidence seeding (2026-11-17)

- Add 74 schema-valid illustrative templates across all 15 evidence categories. All are marked DEMO and explicitly unverified, with no fabricated client approval/test success.
- Staff-only opt-in seed endpoint and UI button, plus optional `SEED_SAMPLE_EVIDENCE=true` automatic bootstrap on an isolated Neon branch. Idempotent unique demo keys.
- Show separate real/demo counts. Real-only checklist, baseline uniqueness, efforts, exports and attachments; additional DEMO-NOT-FOR-SUBMISSION ZIPs.
- Test seed authorization, idempotence, demo exclusion, ZIP warning and responsive browser UI.
- See `docs/VERCEL_V10_DEMO_SEED.md`.

# V9 · CO3011 Evidence & Export (2026-11-17)

- Bổ sung Evidence Center riêng cho nhân viên, gồm 15 loại bằng chứng khởi tạo, lập kế hoạch, baseline, execution và closure.
- Bản ghi append-only, có lịch sử revision; baseline V1.0 được giữ bất biến.
- Lưu PDF/ảnh/CSV/TXT (850 KB/tệp) trong Neon BYTEA, có SHA-256 và export chia nhiều phần để phù hợp giới hạn Vercel.
- Xuất CSV theo từng loại, JSON, báo cáo HTML in PDF, checklist độ phủ và Gantt/effort chart SVG dựa trên dữ liệu thật.
- Kiểm tra tự động mục còn thiếu theo 8 trang yêu cầu môn học; không gán trạng thái nghiệm thu giả.
- Giữ nguyên nghiệp vụ KTX, không thêm email/cron, không dùng file system serverless.

# V8 · UI & Data Visualization (2026-11-17)

- Bổ sung các vòng tròn KPI sức chứa và tiến độ yêu cầu Một cửa; biểu đồ số hồ sơ và yêu cầu theo ngày trong 7 ngày; nhóm dịch vụ phổ biến.
- Bổ sung sơ đồ phòng theo tòa/tầng với trạng thái còn chỗ/đã đầy/tạm dừng và tìm nhanh theo mã phòng.
- Hành trình nội trú sinh viên và vòng tiến độ checklist trên dashboard.
- Thay thanh tiến độ gắn inline CSS style bằng HTML progress (tương thích CSP), bổ sung điều hướng bằng bàn phím và mã hóa tiêu đề từ dữ liệu người dùng.
- Việt hóa nhãn thông dụng; cải thiện responsive và kiểm thử 24 view với dữ liệu mô phỏng.
- Không thêm email, cron, chart CDN, dịch vụ bên thứ ba hoặc bảng dữ liệu mới ngoài các nâng cấp V7.

# Changelog

## V7 — Bàn giao và kiểm tra phòng, không có email notification

- Gỡ hoàn toàn trang Email đã gửi, email preferences, mail queue/Resend module, API xử lý thư và Vercel Cron.
- Thông báo xét duyệt và cập nhật nghiệp vụ chỉ lưu trong ứng dụng; giữ email như định danh đăng nhập.
- Thêm phiếu kiểm tra phòng 5 hạng mục, lịch sử trên Neon, xem chi tiết và in phiếu tham khảo.
- Thêm checklist nhận phòng 7 bước cho sinh viên, lưu riêng theo tài khoản trong trình duyệt.
- Thêm thẻ công suất tòa nhà tự động tính theo dữ liệu phòng và chuyển nhanh sang danh sách lọc.
- Cập nhật giao diện responsive, kiểm thử mới và tài liệu Vercel + Neon.
- Nâng cấp schema theo hướng **không xóa** dữ liệu từ những bản triển khai cũ.
