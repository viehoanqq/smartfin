# SmartFin

SmartFin là dự án nền tảng cho ứng dụng quản lý tài chính cá nhân. Repository hiện có giao diện React/Vite, API FastAPI, cấu hình PostgreSQL với pgvector và migration Alembic cho dữ liệu tài chính.

hello world

Xem [CONTRIBUTING.md](./CONTRIBUTING.md) để biết quy trình đóng góp và các bước kiểm tra trước khi tạo pull request.

## Công nghệ

- Frontend: React 19, Vite 8, React Router, TanStack Query, Axios.
- Backend: Python, FastAPI, SQLAlchemy, Alembic.
- Cơ sở dữ liệu: PostgreSQL với extension pgvector.

## Yêu cầu

- Python 3.10 trở lên.
- Node.js tương thích với Vite 8 (Node.js 20.19+ hoặc 22.12+).
- Docker Desktop và Docker Compose.

## Chạy dự án trên Windows

### 1. Khởi động cơ sở dữ liệu

Chạy từ thư mục gốc của dự án:

```powershell
docker compose up -d db
```

PostgreSQL được ánh xạ ra cổng `5434` trên máy host. Tên cơ sở dữ liệu và thông tin đăng nhập khởi tạo được cấu hình trong `docker-compose.yml`; cấu hình đó chỉ dành cho môi trường phát triển cục bộ.

### 2. Cài đặt và chạy backend

Mở PowerShell tại thư mục gốc, sau đó chạy:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Tạo file `backend/.env` với URL kết nối khớp với cấu hình PostgreSQL trong `docker-compose.yml`:

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:<mat_khau>@localhost:5434/smartfin_db
```

Thay `<mat_khau>` bằng mật khẩu cấu hình cho PostgreSQL ở môi trường của bạn. Không dùng thông tin đăng nhập phát triển trong môi trường production.

Áp dụng schema, nạp dữ liệu demo và khởi động API:

```powershell
alembic upgrade head
python -m app.db.seed_data
uvicorn main:app --reload
```

Migration đầu tiên đã tạo sẵn 17 danh mục mặc định. Lệnh seed tạo thêm tài khoản demo `hoang123@gmail.com` / `123456`; chạy lại nhiều lần không bị trùng.

Backend mặc định chạy tại `http://localhost:8000`.

#### Lỗi `Can't locate revision identified by '...'`

DB của bạn được tạo từ migration cũ đã bị gộp vào `0001_init_schema`. Reset DB một lần (xóa toàn bộ dữ liệu trong `DATABASE_URL`, tạo lại bảng và dữ liệu demo):

```powershell
cd backend
python scripts/reset_db.py
```

Cần giữ dữ liệu thì sao lưu trước:

```powershell
docker exec smartfin_db pg_dump -U postgres -f /tmp/backup.sql smartfin_db
docker cp smartfin_db:/tmp/backup.sql E:\smartfin_backup.sql
```

### 3. Cài đặt và chạy frontend

Mở một cửa sổ PowerShell khác tại thư mục gốc:

```powershell
cd frontend
npm install
npm run dev
```

Vite mặc định phục vụ frontend tại `http://localhost:5173`. Frontend hiện gọi backend tại `http://localhost:8000`; CORS phía backend được cấu hình cho origin này.

## Kiểm tra ứng dụng

- Mở `http://localhost:5173` để xem giao diện kiểm tra trạng thái.
- Gọi `http://localhost:8000/` để kiểm tra API.
- Gọi `http://localhost:8000/api/health` để kiểm tra kết nối cơ sở dữ liệu.
- Mở `http://localhost:8000/docs` để xem tài liệu OpenAPI do FastAPI tạo.

## Lệnh phát triển

Chạy từ thư mục `frontend`:

```powershell
npm run lint
npm run build
```

Quản lý migration từ thư mục `backend`:

```powershell
alembic upgrade head
alembic downgrade -1
```

`alembic downgrade -1` hoàn tác migration gần nhất; hãy sao lưu dữ liệu trước khi chạy trên cơ sở dữ liệu có dữ liệu cần giữ.

## Hướng dẫn phát triển

### Thêm hoặc sửa chức năng backend

Backend hiện được khởi chạy từ `backend/main.py`. Cấu hình nằm trong `backend/app/core/config.py`, kết nối cơ sở dữ liệu trong `backend/app/db/session.py`, còn các SQLAlchemy model hiện nằm trong `backend/app/models/domain.py`.

Khi thêm một API:

1. Xác định dữ liệu đầu vào/đầu ra và phương thức HTTP; dùng Pydantic để kiểm tra dữ liệu request và định nghĩa response.
2. Viết endpoint bằng FastAPI. Với endpoint cần cơ sở dữ liệu, dùng dependency `get_db` từ `app.db.session` thay vì tự tạo kết nối trong endpoint.
3. Thực hiện truy vấn và nghiệp vụ bằng SQLAlchemy; không trả trực tiếp thông tin nhạy cảm như `password_hash`.
4. Viết endpoint trong router theo tính năng dưới `backend/app/api/v1/routers/`, rồi đăng ký router trong `backend/main.py` với `prefix="/api/v1"`.
5. Chạy backend và kiểm tra endpoint tại `http://localhost:8000/docs`, đồng thời kiểm tra kết nối database qua `GET /api/health`.

Ví dụ router mới `backend/app/api/v1/routers/example_api.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/example", tags=["Example"])


class ExampleResponse(BaseModel):
    message: str


@router.get("", response_model=ExampleResponse)
def get_example():
    return {"message": "SmartFin API"}
```

Đăng ký trong `backend/main.py`:

```python
from app.api.v1.routers import example_api

app.include_router(example_api.router, prefix="/api/v1")  # GET /api/v1/example
```

Đây chỉ là ví dụ cấu trúc endpoint; với tính năng thực tế, hãy bổ sung schema, truy vấn, xử lý lỗi và kiểm thử phù hợp.

### Thêm hoặc sửa giao diện frontend

Frontend khởi chạy từ `frontend/src/main.jsx`; route khai báo trong `frontend/src/App.jsx` bằng React Router. Mã nguồn chia theo vai trò người dùng:

- `pages/` – trang công khai (Login, Register, ForgotPassword, Error404); `pages/customer/` cho người dùng, `pages/admin/` cho quản trị.
- `components/customer/`, `components/admin/` – component riêng của từng vai trò; `components/common/` dùng chung (ConfirmModal, ProtectedRoute).
- `layouts/` – `MainLayout` (sidebar, header, chatbot của người dùng) và `AdminLayout`.
- `services/` – gọi API; mọi request đi qua `axiosClient.js` (gắn token, xử lý 401).
- `context/` – `AuthContext` giữ trạng thái đăng nhập.

Khi thêm một màn hình:

1. Tạo component trong `frontend/src/pages/customer/` hoặc `pages/admin/`, ví dụ `pages/customer/Budgets.jsx`.
2. Khai báo route trong `App.jsx`, đặt bên trong route dùng `MainLayout` (hoặc `AdminLayout`).
3. Gọi API qua module trong `frontend/src/services/` và xử lý riêng trạng thái đang tải, dữ liệu rỗng và lỗi; không gọi `axios` trực tiếp trong component.
4. Tạo hoặc cập nhật style trong `frontend/src/` theo quy ước CSS hiện có.
5. Kiểm tra trên trình duyệt, sau đó chạy các lệnh sau trong thư mục `frontend`:

```powershell
npm run lint
npm run build
```

Nếu thêm origin frontend khác `http://localhost:5173`, cập nhật cấu hình CORS trong `backend/main.py` tương ứng.

### Thay đổi cấu trúc database

Các bước dưới đây áp dụng khi thêm bảng, cột, index hoặc quan hệ:

1. Sửa hoặc thêm SQLAlchemy model trong `backend/app/models/domain.py`. Alembic nạp metadata qua `backend/app/models/__init__.py`; nếu tạo module model mới, cần import module đó ở đây để model được đăng ký với `Base.metadata`.
2. Đảm bảo PostgreSQL đang chạy và `DATABASE_URL` trong `backend/.env` trỏ tới đúng database. `git pull` nhánh `main` và chạy `alembic upgrade head` trước, để migration mới nối tiếp đúng migration mới nhất.
3. Từ thư mục `backend`, tạo migration:

```powershell
alembic revision --autogenerate -m "describe_schema_change"
```

4. Mở file migration mới trong `backend/alembic/versions/` và rà soát cả `upgrade()` lẫn `downgrade()`. Autogenerate chỉ tạo bản nháp; cần xác nhận các thay đổi có đúng và an toàn cho dữ liệu hiện có.
5. Áp dụng và kiểm tra phiên bản migration:

```powershell
alembic upgrade head
alembic current
alembic heads   # phải chỉ có 1 dòng
alembic check   # "No new upgrade operations detected." = model và migration khớp
```

Không sửa migration đã được áp dụng/chia sẻ; hãy tạo migration mới. Chỉ dùng `alembic downgrade -1` để hoàn tác khi đã xác nhận migration có thể đảo ngược và dữ liệu cần giữ không bị mất.

### Quy trình thay đổi xuyên suốt frontend, backend và database

Với một tính năng cần lưu dữ liệu, thực hiện theo thứ tự: cập nhật model và migration; định nghĩa schema và API backend; gọi API từ frontend; sau đó kiểm tra luồng từ giao diện đến database. Dùng `/docs` để kiểm tra API độc lập, `GET /api/health` để xác nhận kết nối database, và chạy lint/build frontend trước khi hoàn tất.

## Cấu trúc thư mục mục tiêu

Cây dưới đây mô tả cấu trúc dự kiến cho các phần nghiệp vụ và AI. Một số thư mục, module và tính năng trong cây chưa có trong repository hiện tại.

```text
smartfin/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                 # Khởi tạo FastAPI, nạp mô hình khi startup
│   │   ├── core/                   # Cấu hình, bảo mật và dependency
│   │   ├── db/                     # Session và cấu hình cơ sở dữ liệu
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic DTO
│   │   ├── repositories/           # Truy cập cơ sở dữ liệu
│   │   ├── services/               # Nghiệp vụ tài chính
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── routers/        # Auth, wallets, transactions, budgets,
│   │   │                           # NLP, chat, admin
│   │   └── ai/
│   │       ├── loader.py           # Nạp mô hình khi ứng dụng khởi động
│   │       ├── nlp_parser/
│   │       │   ├── normalizer.py   # Chuẩn hóa văn bản tiếng Việt
│   │       │   ├── amount.py       # Trích xuất số tiền
│   │       │   ├── datetime.py     # Trích xuất ngày giờ
│   │       │   ├── wallet.py       # Nhận diện ví
│   │       │   └── splitter.py     # Tách nội dung giao dịch
│   │       ├── segmenter.py        # Phân đoạn từ và nhận diện thực thể
│   │       ├── embedding.py        # Embedding và tìm kiếm ví dụ tương tự
│   │       ├── chatbot/
│   │       │   ├── router.py       # Định tuyến ý định
│   │       │   ├── slots.py        # Trích xuất thông tin
│   │       │   ├── handlers.py     # Xử lý yêu cầu hội thoại
│   │       │   └── templates.py    # Mẫu phản hồi
│   │       ├── forecast/           # Dự báo
│   │       ├── anomaly/            # Phát hiện bất thường
│   │       └── insights/           # Phân tích và gợi ý
│   ├── workers/                    # Tác vụ theo lịch
│   ├── alembic/                    # Migration cơ sở dữ liệu
│   ├── tests/                      # Kiểm thử pytest
│   └── seed/                       # Dữ liệu mẫu
├── frontend/
│   └── src/
│       ├── services/               # Gọi API (axiosClient + từng module)
│       ├── context/                # AuthContext
│       ├── components/
│       │   ├── admin/
│       │   ├── customer/           # Header, Sidebar, dashboard/, transactions/
│       │   └── common/             # ConfirmModal, ProtectedRoute
│       ├── layouts/                # MainLayout, AdminLayout
│       ├── pages/                  # Login, Register, ForgotPassword, Error404
│       │   ├── customer/           # Dashboard, Transactions, Wallets, Savings,
│       │   │                       # Budgets, Chat, Profile
│       │   └── admin/
│       └── utils/                  # Định dạng tiền tệ và ngày tháng
└── ml/
    ├── data/                       # Ví dụ gán nhãn và tập kiểm thử
    ├── notebooks/                  # Thử nghiệm NLP, embedding, định tuyến,
    │                               # phân loại và dự báo
    └── scripts/
        └── evaluate.py             # Chạy đánh giá và xuất kết quả
```