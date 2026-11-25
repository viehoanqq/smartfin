# Chatbot Gemini của SmartFin

## Đã nối

- API JWT: `GET /api/v1/chat/sessions`, `GET /api/v1/chat/sessions/{id}/messages`, `POST /api/v1/chat/messages`, `DELETE /api/v1/chat/sessions/{id}`. Chỉ chủ phiên chat xem, tiếp tục hoặc xóa được phiên đó.
- Backend truy vấn ví, tổng thu/chi theo tháng, chi theo danh mục, ngân sách, mục tiêu tiết kiệm và tối đa 30 giao dịch gần nhất trong kỳ. Mọi truy vấn giao dịch lọc `user_id`, bỏ giao dịch xóa mềm. Tổng tiền do SQL tính từ toàn bộ giao dịch trong kỳ, không dựa trên 30 dòng gần nhất.
- Gemini nhận JSON số liệu đã lọc cùng tối đa 8 tin nhắn gần đây. Chat chỉ trả lời; không gọi API ghi giao dịch. Hỏi ngoài phạm vi tài chính cá nhân/SmartFin sẽ được hướng dẫn quay về chủ đề phù hợp.
- Giao diện chat ở góc phải mọi trang người dùng: gửi, xem lịch sử, tự mở phiên gần nhất sau khi tải lại trang, mở phiên cũ, tạo phiên mới, báo lỗi và trạng thái chờ.

## Cấu hình và chạy

Trong `backend/.env` đặt `GEMINI_API_KEY=<key mới của bạn>`. File này bị Git bỏ qua. Có thể đặt `GEMINI_MODEL=gemini-flash-latest` (mặc định). Khi model chính trả 503/404, backend thử `gemini-flash-lite-latest`; lỗi quota 429 được báo cho người dùng. Không đặt key vào `frontend`.

Sau khi sửa `.env`, khởi động lại backend. Chạy kiểm tra từ thư mục `backend`:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_chat_service.py -q
.\venv\Scripts\python.exe scripts/smoke_chat_e2e.py
.\venv\Scripts\python.exe scripts/smoke_chat_e2e.py --live
.\venv\Scripts\python.exe scripts/check_chat_persistence.py
```

Mở frontend, đăng nhập, bấm biểu tượng chat và hỏi `Tháng này tôi chi bao nhiêu?`. Có thể hỏi `Chi tháng trước theo danh mục?`, `Số dư ví của tôi?`, `Mục tiêu tiết kiệm nào còn thiếu tiền?`.

## Giới hạn

- Truy vấn kỳ hỗ trợ tháng hiện tại, `tháng trước`, `tháng N`, `tháng N/YYYY`, quý, năm và so sánh tối đa 4 tháng được nhắc trong cùng câu. Các khoảng ngày tùy ý chưa có API tổng hợp riêng; chatbot phải nói rõ khi dữ liệu chưa đủ.
- `budget.current_amount` trong nghiệp vụ hiện tại là số chi lũy kế, không phải số chi riêng tháng. Prompt đã nêu rõ để Gemini không trình bày sai.
- Nội dung giao dịch và số liệu được gửi tới Gemini API để tạo câu trả lời. Không gửi mật khẩu, email hay API key trong JSON dữ liệu.
- Vì key từng được chia sẻ trong hội thoại/ảnh, nên tạo key mới và thay trong `backend/.env` trước khi triển khai cho người khác.
