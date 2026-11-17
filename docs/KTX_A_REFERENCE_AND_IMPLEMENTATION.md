# Đối chiếu nghiệp vụ KTX Khu A và triển khai V7

## Phạm vi

Cổng thông tin tham khảo của Trung tâm Quản lý KTX và Khu đô thị ĐHQG-HCM: [ktxhcm.edu.vn](https://ktxhcm.edu.vn/). Các thông tin công khai về đăng ký nội trú, quản lý chỗ ở, dịch vụ Một cửa và bảng tin là cơ sở để xây dựng **mô phỏng**, không phải bản sao của API hoặc dữ liệu chính thức.

| Nghiệp vụ | Mô phỏng trong dự án | Giới hạn |
|---|---|---|
| Đăng ký / duyệt nội trú | Hồ sơ, nguyện vọng, cấp phòng, trạng thái | Không gửi hồ sơ thật đến KTX |
| Tra cứu phòng | Danh sách và công suất phòng/tòa từ Neon | Chỉ dựa vào các phòng trong database demo |
| Dịch vụ Một cửa | Yêu cầu, phản hồi, phân công, đánh giá | Không liên kết với cổng Một cửa chính thức |
| Kiểm tra thiết bị phòng | 5 hạng mục, ghi chú, lịch sử, xuất/in phiếu | Phiếu tự khai không thay biên bản bàn giao |
| Chuẩn bị nhận phòng | Checklist cá nhân 7 bước trong localStorage | Không đồng bộ, không xác minh tự động |
| Bảng tin và thông báo cá nhân | Phạm vi toàn khu/theo tòa, lưu DB | Không gửi email, SMS, push hay cron |

## Kiến trúc

```text
Browser (student/staff)
       |
       v
Express API + static SPA (single Vercel deployment)
       |
       +-----> Neon PostgreSQL
                +-- applications / allocations / rooms
                +-- requests / request_messages / service_feedback
                +-- room_inspections (NEW V7)
                +-- announcements / notifications / audit_events
       |
       +-----> localStorage (7-item checklist only)
```

**Không có** dịch vụ bên thứ ba, worker, cron hay email notification. Email tài khoản chỉ dùng để đăng nhập.

## API mới trong V7

| Method | Endpoint | Quyền | Kết quả |
|---|---|---|---|
| GET | `/api/room-inspections` | Sinh viên/nhân viên | Sinh viên xem bản ghi của mình; nhân viên xem 200 bản gần nhất |
| POST | `/api/room-inspections` | Sinh viên đã được phân phòng | Lưu 5 tình trạng (`ok`, `issue`, `unchecked`) và ghi chú tối đa 1000 ký tự |

`POST` **không nhận room_id từ client**: server lấy phòng hiện tại từ `allocations` để tránh báo cáo sai phòng. Dữ liệu ghi nhật ký và có ràng buộc SQL kiểm tra 3 giá trị tình trạng. Bảng `room_inspections` lưu lịch sử, kể cả khi sinh viên chuyển/trả phòng sau đó.

## Các chức năng không cần cập nhật thủ công

- Số phòng, giường trống, tỷ lệ lấp đầy theo tòa lấy từ `rooms.capacity` và `rooms.occupied`.
- Trạng thái hồ sơ, phiếu kiểm tra, yêu cầu và thông báo theo dữ liệu Neon đã nhập trong quy trình dùng ứng dụng.
- Checklist dùng các bước cố định, lưu cục bộ trong browser; không cần cấu hình bảng tin bên ngoài.

## Lưu ý demo

- Chức năng kiểm tra phòng chỉ hoạt động khi có tài khoản sinh viên đã phân phòng.
- Để xử lý vấn đề, cần tạo **yêu cầu sửa chữa** riêng tại Dịch vụ Một cửa; phiếu kiểm tra không tự phát sinh ticket.
- Địa chỉ website KTX được trình bày là **liên kết tham khảo**. Mọi thao tác trong dự án demo không có hiệu lực với Trung tâm.
