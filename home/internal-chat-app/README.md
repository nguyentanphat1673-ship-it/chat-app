# Internal Chat Application

Một hệ thống chat nội bộ chuyên nghiệp được xây dựng với Node.js, Express, Socket.IO và MongoDB.

## Tính năng chính
- **Đăng ký/Đăng nhập**: Hệ thống User ID ngẫu nhiên (ví dụ: user_1234), bảo mật bằng bcrypt và JWT.
- **Kết bạn**: Tìm kiếm và kết bạn qua User ID.
- **Chat Realtime**: Nhắn tin riêng và nhóm bằng Socket.IO.
- **Đa phương tiện**: Gửi ảnh và video (tối đa 35 giây).
- **Trạng thái**: Online/Offline, Đang nhập (Typing), Đã xem (Seen).
- **Nhóm chat**: Tạo nhóm, quản lý thành viên (Owner, Admin, Member).
- **Giao diện**: Dark Mode mặc định, hiện đại, tối giản và responsive.

## Công nghệ sử dụng
- Backend: Node.js, Express.js
- Realtime: Socket.IO
- Database: MongoDB (Mongoose)
- Authentication: JWT, bcrypt
- File Upload: Multer
- Frontend: HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript

## Cấu trúc thư mục
- `server/`: Entry point và cấu hình server.
- `routes/`: Định nghĩa các API endpoints.
- `controllers/`: Xử lý logic nghiệp vụ.
- `models/`: Định nghĩa cấu trúc dữ liệu MongoDB.
- `middleware/`: Các hàm trung gian (Auth, Upload).
- `socket/`: Xử lý sự kiện realtime.
- `public/`: Giao diện người dùng (HTML, CSS, JS).
- `uploads/`: Thư mục lưu trữ tệp tin người dùng gửi.

## Hướng dẫn cài đặt và chạy
1. Giải nén file project.
2. Mở terminal trong thư mục project.
3. Chạy lệnh `npm install` để cài đặt các dependencies.
4. Cấu hình file `.env` (đã có file mẫu, hãy đảm bảo MongoDB đang chạy).
5. Chạy lệnh `npm start` để khởi động server.
6. Truy cập `http://localhost:3000` trên trình duyệt.

---
*Dự án được phát triển bởi Manus Full Stack Team.*
