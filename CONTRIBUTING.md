# Hướng dẫn đóng góp

Cảm ơn bạn đã quan tâm đóng góp cho SmartFin. Tài liệu này mô tả quy trình đề xuất thay đổi, phát triển và kiểm tra trước khi tạo pull request.

## Trước khi bắt đầu

- Đọc [README.md](./README.md) để nắm cấu trúc dự án, cách chạy ứng dụng và vị trí các thành phần backend, frontend, database.
- Kiểm tra Issues và pull request hiện có để tránh làm trùng công việc. Với thay đổi lớn hoặc thay đổi hành vi, hãy mở Issue để thống nhất phạm vi trước khi triển khai.
- Tạo bản sao làm việc từ repository và cập nhật nhánh nền trước khi tạo nhánh tính năng.
- Không đưa mật khẩu, token, khóa bí mật, dữ liệu cá nhân hoặc file `.env` vào commit. Dùng file `.env` cục bộ; chỉ chia sẻ cấu hình mẫu đã loại bỏ thông tin bí mật.

## Quy trình đóng góp

1. Tạo một nhánh riêng từ nhánh nền đang được dự án sử dụng.
2. Thực hiện một thay đổi tập trung cho mỗi nhánh. Tránh gộp các chỉnh sửa không liên quan.
3. Thêm hoặc cập nhật kiểm thử tương ứng với hành vi thay đổi.
4. Chạy các bước kiểm tra phù hợp ở phần dưới và xử lý các lỗi do thay đổi gây ra.
5. Commit thay đổi với thông điệp ngắn gọn, mô tả mục đích.
6. Tạo pull request, mô tả vấn đề, giải pháp, các thay đổi chính và kết quả kiểm tra.

Có thể dùng tiền tố nhánh để dễ nhận biết mục đích:

```text
feature/<ten-ngan>
fix/<ten-ngan>
docs/<ten-ngan>
```

## Lệnh Git thường dùng

Các lệnh dưới đây giả sử nhánh nền là `main` và remote là `origin`. Thay `<nhanh-cua-ban>` bằng tên nhánh tính năng của bạn.

### Cập nhật trước mỗi phiên code

Đảm bảo đã lưu hoặc commit các thay đổi chưa hoàn tất trước khi cập nhật:

```powershell
git status
git checkout main
git pull origin main
git checkout <nhanh-cua-ban>
git merge origin/main
```

### Lưu thay đổi và push

Sau khi code và chạy các kiểm tra phù hợp:

```powershell
git add .
git commit -m "feat/fix: mo-ta-ngan"
git push origin <nhanh-cua-ban>
```

Kiểm tra `git status` trước khi dùng `git add .` để tránh đưa file không liên quan hoặc file chứa thông tin nhạy cảm vào commit. Sau khi push, tạo pull request từ nhánh tính năng vào `main`; không push trực tiếp lên `main`.

## Quy ước khi sửa code

### Backend

- Giữ endpoint trong router theo tính năng dưới `backend/app/api/v1/routers/`.
- Đặt kiểm tra dữ liệu vào Pydantic schema trong `backend/app/schemas/`.
- Đặt truy vấn cơ sở dữ liệu trong repository dưới `backend/app/repositories/`; xử lý nghiệp vụ trong service dưới `backend/app/services/`.
- Dùng dependency `get_db` để lấy SQLAlchemy session. Không tự tạo kết nối riêng trong từng endpoint.
- Không trả dữ liệu nhạy cảm, chẳng hạn `password_hash`, trong response.
- Bổ sung hoặc cập nhật test trong `backend/tests/` khi thêm hay sửa hành vi API.

### Frontend

- Đặt màn hình trong `frontend/src/pages/`; dùng các thư mục dùng chung hiện có hoặc tạo module theo tính năng khi cần.
- Giữ component dễ đọc và tách phần gọi API khỏi giao diện khi chức năng phát triển.
- Xử lý trạng thái đang tải, dữ liệu rỗng và lỗi từ API.
- Giữ nguyên `frontend/package-lock.json` đồng bộ với `frontend/package.json` khi thay đổi dependency.

### Database

- Cập nhật SQLAlchemy model và tạo migration Alembic đi kèm cho thay đổi schema.
- Tạo migration từ thư mục `backend`:

```powershell
alembic revision --autogenerate -m "describe_schema_change"
```

- Rà soát thủ công cả `upgrade()` và `downgrade()` trong migration được tạo. Không chỉnh sửa migration đã được áp dụng hoặc chia sẻ; hãy tạo migration mới.
- Tránh thao tác làm mất dữ liệu ngoài dự kiến. Nếu thay đổi có nguy cơ ảnh hưởng dữ liệu hiện có, nêu rõ trong pull request và chuẩn bị cách chuyển đổi an toàn.

## Kiểm tra trước khi tạo pull request

### Backend

Backend test cần PostgreSQL có extension pgvector và cấu hình `DATABASE_URL` hợp lệ trong `backend/.env`. Khởi động database theo README, sau đó chạy từ thư mục `backend`:

```powershell
.\.venv\Scripts\Activate.ps1
alembic upgrade head
pytest -v
```

Nếu chưa tạo virtual environment, hãy làm theo hướng dẫn cài đặt backend trong README trước.

### Frontend

Chạy từ thư mục `frontend`:

```powershell
npm ci
npm run lint
npm run build
```

CI hiện chạy backend test và frontend build. Lệnh lint nên được chạy cục bộ dù workflow CI hiện chưa thực thi lệnh này.

### Thay đổi tài liệu

Đảm bảo hướng dẫn, tên endpoint, lệnh và cây thư mục trong tài liệu khớp với trạng thái code hiện tại. Phân biệt rõ tính năng đã triển khai với cấu trúc hoặc kế hoạch mục tiêu.

## Pull request

Pull request nên:

- Có tiêu đề ngắn gọn, mô tả chính xác nội dung thay đổi.
- Giải thích vấn đề cần giải quyết và cách tiếp cận.
- Liệt kê những phần quan trọng đã thay đổi.
- Ghi các lệnh kiểm tra đã chạy và kết quả; nêu rõ nếu có bước chưa thể chạy cùng lý do.
- Đính kèm ảnh chụp màn hình nếu thay đổi giao diện có ảnh hưởng trực quan.
- Liên kết Issue liên quan nếu có.
- Không chứa file sinh tự động, dữ liệu cục bộ, credential hoặc thay đổi ngoài phạm vi.

Người đóng góp cần cập nhật pull request để xử lý phản hồi review và đảm bảo các kiểm tra CI liên quan hoàn tất trước khi đề nghị hợp nhất.
