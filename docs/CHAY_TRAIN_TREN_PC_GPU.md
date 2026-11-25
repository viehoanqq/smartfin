# Train NLP SmartFin trên PC có GPU

Script chính: `ml/run_gpu_training.py`. Nó kiểm tra nhãn và CUDA, chia dữ liệu, đo Bi-Encoder gốc và TF-IDF trên validation, fine-tune bản sao Bi-Encoder, đo lại trên cùng validation, rồi in lệnh đánh giá test và cấu hình chạy API. **Nó không tự bật model mới** nếu kết quả kém.

## 1. Mang gì sang PC GPU

- Toàn bộ mã nguồn `SmartFin`; tạo venv mới trên PC GPU, không chép `backend/venv` từ máy cũ.
- File có nhãn đã duyệt `ml/data/reviewed_labels.csv` (bị Git bỏ qua nên phải chép riêng nếu clone bằng Git). Mỗi dòng: `text,category_name,reviewed`, chỉ `reviewed=1` mới được dùng.
- Có thể chép `backend/models/biencoder` và `backend/models/vncorenlp` từ máy cũ để khỏi tải lại. Nếu không, bước 3 sẽ tải chúng. Không cần DB, backend server hay Gemini key trên PC train.

Hiện máy làm việc có 0 phản hồi NLP và CSV mẫu chỉ 10 câu cho mỗi trong 3 danh mục. Nhóm cần gán nhãn trước: ít nhất 20 câu khác nhau/danh mục để script chạy; nên có 70–100+ câu/danh mục nếu muốn đánh giá có ý nghĩa. Không tạo nhiều biến thể gần như giống hệt để đủ số lượng.

Nếu đã có giao dịch nhập thông minh trên PC cũ, từ thư mục `SmartFin` xuất dữ liệu:

```powershell
.\backend\venv\Scripts\python.exe ml/export_feedback_for_review.py --user-id 1
```

Mở `ml/data/feedback_review_user_1.csv`, kiểm tra từng nhãn và thông tin riêng tư, điền `reviewed=1` cho hàng đúng rồi chép thành `ml/data/reviewed_labels.csv`. Có thể gộp CSV của nhiều người dùng khi đã được phép sử dụng dữ liệu của họ. Hiện file xuất sẽ rỗng vì DB chưa có phản hồi; nhóm có thể tự tạo `reviewed_labels.csv` từ các câu được gán nhãn thủ công.

## 2. Cài Python, Java và PyTorch có CUDA

Mở PowerShell tại thư mục `SmartFin`. Cần Python 3.11+ và Java trong PATH (`java -version`). Tạo venv:

```powershell
python -m venv backend/venv
```

Chọn **Windows → Pip → Python → CUDA phù hợp GPU** trên [trang cài PyTorch chính thức](https://pytorch.org/get-started/locally/), sau đó chạy lệnh pip họ đưa ra bằng **`.\backend\venv\Scripts\python.exe -m pip ...`**. Đừng lấy lệnh CUDA bất kỳ từ máy khác. Tiếp theo cài thư viện dự án:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-train.txt
cd ..
.\backend\venv\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NO CUDA')"
```

Kết quả phải có `True` và tên GPU. Nếu là `False`, chưa chạy lệnh train: kiểm tra driver và bản PyTorch CUDA vừa cài.

## 3. Tải model đầu vào nếu chưa chép từ máy cũ

```powershell
cd backend
.\venv\Scripts\python.exe scripts/download_nlp_models.py vncorenlp biencoder
cd ..
```

Đầu ra cần có `backend/models/vncorenlp/VnCoreNLP-1.2.jar` và `backend/models/biencoder/modules.json`. Không cần tải PhoNLP cho bài toán phân loại danh mục.

## 4. Chạy một lệnh kiểm tra, rồi một lệnh train

```powershell
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --check-only
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --epochs 2 --batch-size 8
```

Nếu hết VRAM, dùng `--batch-size 4`. Nếu dữ liệu mới chưa đủ, script dừng trước khi train và báo danh mục thiếu. Để thử số epoch khác trên **cùng một tập chia**, chạy với `--reuse-split --model-name run1_3epoch --epochs 3` (vẫn giữ `--run-name run1`). Không dùng lại tên model đã tồn tại.

Đầu ra:

| Đường dẫn | Nội dung |
|---|---|
| `ml/data/runs/run1/train.csv` | Câu mẫu cho k-NN và fine-tune |
| `ml/data/runs/run1/validation.csv` | Chọn model, k và ngưỡng |
| `ml/data/runs/run1/test.csv` | Đánh giá cuối, không dùng lúc chỉnh |
| `backend/models/biencoder_run1/` | Model đã fine-tune |
| `ml/data/runs/run1/validation_report_run1.txt` | Điểm validation trước/sau train và baseline |
| `ml/data/runs/run1/manifest_run1.json` | Thông số lượt train |

## 5. Chọn model và đưa về máy chạy ứng dụng

Đọc hai dòng **validation macro-F1** trước/sau train; xem thêm các danh mục dễ nhầm và tỷ lệ câu `Chưa rõ`. Nếu bản mới không tốt hơn, **giữ model gốc** và cải thiện dữ liệu/nhãn trước. Nếu chọn bản mới, chạy test **một lần**:

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py --data-dir ml/data/runs/run1 --model-dir backend/models/biencoder_run1
```

Chép `backend/models/biencoder_run1/` và **`ml/data/runs/run1/train.csv`** về đúng vị trí tương ứng trên máy chạy SmartFin. Trong `backend/.env` của máy chạy ứng dụng, thêm:

```dotenv
NLP_ENCODER_DIR=models/biencoder_run1
NLP_EXAMPLES_CSV=ml/data/runs/run1/train.csv
NLP_CATEGORY_K=7
NLP_CATEGORY_THRESHOLD=0.50
```

Thay `K` và ngưỡng bằng kết quả validation mà script in ra. Khởi động lại backend rồi thử `POST /api/v1/nlp/parse` với câu **chưa từng nằm trong train/validation/test**. Muốn quay lại bản gốc thì xóa hai dòng `NLP_ENCODER_DIR`, `NLP_EXAMPLES_CSV` và khởi động lại.

Số tiền, ngày, ví và tách nhiều giao dịch vẫn do parser luật xử lý. Script này chỉ huấn luyện gợi ý **danh mục chi**; Gemini chatbot và PhoNLP không thay đổi.
