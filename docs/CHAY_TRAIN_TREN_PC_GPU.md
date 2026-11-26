# Train NLP SmartFin trên PC có GPU

Script chính: `ml/run_gpu_training.py`. Nó kiểm tra nhãn và CUDA, chia dữ liệu (`train` / `validation` / `test`), đo Bi-Encoder gốc và TF-IDF baseline trên `validation`, fine-tune bản sao Bi-Encoder, đo lại trên cùng `validation`, rồi in lệnh đánh giá `test` và cấu hình chạy API. **Script không tự bật model mới** nếu kết quả kém.

---

## 1. Dữ liệu đầu vào hiện tại & cần mang gì sang PC GPU

Hiện dự án đã chuẩn bị sẵn `ml/data/reviewed_labels.csv` gồm **3.030 câu** (`reviewed=1`) cho **16 danh mục** (15 danh mục chính × 200 câu + `Khác` 30 câu), chia chuẩn thành:
- `train.csv`: **2.122 câu** (`140` mỗi danh mục chính, `22` cho `Khác`)
- `validation.csv`: **454 câu** (`30` mỗi danh mục chính, `4` cho `Khác`)
- `test.csv`: **454 câu** (`30` mỗi danh mục chính, `4` cho `Khác`)

### Cần mang sang PC GPU (USB / Google Drive / Git)
- Toàn bộ mã nguồn `SmartFin` (**không chép `backend/venv`** từ máy cũ, tạo venv mới trên máy GPU).
- File **`ml/data/reviewed_labels.csv`** (kiểm tra chắc chắn file có mặt ở `ml/data/` nếu clone qua Git).
- **Rất nên chép sẵn** 2 thư mục model từ máy cũ sang để tiết kiệm thời gian tải:
  - `backend/models/biencoder/` (~517 MB)
  - `backend/models/vncorenlp/` (~27 MB)
- Không cần PostgreSQL, backend server hay Gemini API key trên PC train.

*(Nếu sau này muốn bổ sung thêm dữ liệu thật từ giao dịch người dùng đã lưu trên máy cũ, chạy `.\backend\venv\Scripts\python.exe ml/export_feedback_for_review.py --user-id 1`, duyệt cột `reviewed=1` rồi gộp vào `ml/data/reviewed_labels.csv`.)*

---

## 2. Cài Python, Java và PyTorch có CUDA

Mở PowerShell tại thư mục `SmartFin`. Cần **Python 3.11+** (`python --version`) và **Java** trên PATH (`java -version`, bắt buộc cho VnCoreNLP).

Tạo môi trường ảo mới:

```powershell
python -m venv backend/venv
```

Vào [trang cài PyTorch chính thức](https://pytorch.org/get-started/locally/), chọn **Windows → Pip → Python → CUDA phù hợp với GPU**, rồi chạy lệnh pip họ cung cấp bằng **`.\backend\venv\Scripts\python.exe -m pip ...`**:
- **Lưu ý quan trọng với GPU dòng RTX 50-series (ví dụ RTX 5060, kiến trúc Blackwell):** phải chọn bản **CUDA 12.8 (`cu128`)** trở lên; các bản CUDA cũ hơn (`cu121`/`cu124`) có thể không chạy được trên kiến trúc GPU mới.

Sau khi cài xong PyTorch CUDA, cài tiếp thư viện train và kiểm tra GPU:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-train.txt
cd ..
.\backend\venv\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NO CUDA')"
```

Kết quả **bắt buộc** phải có `True` và tên GPU. Nếu in `False`, kiểm tra lại driver NVIDIA và bản PyTorch CUDA vừa cài trước khi chạy train.

---

## 3. Tải model gốc (bỏ qua nếu đã chép ở bước 1)

```powershell
cd backend
.\venv\Scripts\python.exe scripts/download_nlp_models.py vncorenlp biencoder
cd ..
```

Kiểm tra đã có `backend/models/vncorenlp/VnCoreNLP-1.2.jar` và `backend/models/biencoder/modules.json`. Không cần tải PhoNLP cho bài toán phân loại danh mục.

---

## 4. Kiểm tra, train và thử cấu hình tốt nhất

Trên RTX 5060 với 2.122 câu train, mỗi lượt fine-tune 3–5 epoch chỉ mất **vài phút**. Với **16 danh mục**, nên dùng `--batch-size 32` (hoặc `16`) để `GroupByLabelBatchSampler` gom nhiều nhãn vào cùng 1 batch cho `BatchHardTripletLoss`.

> **Không tăng `--epochs` quá cao** (ví dụ 10–15+): tập `train.csv` cỡ vừa dễ bị học vẹt (overfitting) làm tụt điểm trên câu mới, và script chỉ lưu trạng thái ở epoch cuối cùng. Nên thử lần lượt `3, 4, 5` epoch trên **cùng tập chia** bằng `--reuse-split` và chọn mức đạt đỉnh trên `validation`.

Chạy lần lượt từ thư mục `SmartFin`:

```powershell
# 1. Kiểm tra dữ liệu, Java, model gốc và CUDA trước khi train
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --check-only

# 2. Chạy lượt đầu (tạo split + đo gốc + TF-IDF + train 3 epoch, batch 32)
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --epochs 3 --batch-size 32

# 3. Thử các mức epoch và batch-size khác trên CÙNG tập chia (không dùng lại --model-name cũ)
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --reuse-split --model-name run1_e4_b32 --epochs 4 --batch-size 32
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --reuse-split --model-name run1_e5_b32 --epochs 5 --batch-size 32
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --reuse-split --model-name run1_e3_b16 --epochs 3 --batch-size 16
.\backend\venv\Scripts\python.exe ml/run_gpu_training.py --reviewed ml/data/reviewed_labels.csv --run-name run1 --reuse-split --model-name run1_e4_b16 --epochs 4 --batch-size 16
```

Nếu bị hết VRAM, giảm xuống `--batch-size 8` hoặc `4`. Nếu sau khi xem báo cáo `validation` bạn bổ sung thêm câu mới vào `reviewed_labels.csv`, hãy đổi sang `--run-name run2` (không ghi đè `run1`).

### Đầu ra sinh ra

| Đường dẫn | Nội dung |
|---|---|
| `ml/data/runs/run1/train.csv` | Câu mẫu cho k-NN và fine-tune |
| `ml/data/runs/run1/validation.csv` | Chọn model, `K` và `threshold` |
| `ml/data/runs/run1/test.csv` | Đánh giá cuối (không dùng lúc chỉnh tham số) |
| `backend/models/biencoder_<model_name>/` | Thư mục trọng số model đã fine-tune |
| `ml/data/runs/run1/validation_report_<model_name>.txt` | Điểm validation trước/sau train và TF-IDF baseline |
| `ml/data/runs/run1/manifest_<model_name>.json` | Thông số lượt train |

---

## 5. Chọn model tốt nhất, test cuối và đưa về máy chạy ứng dụng

1. Mở các file `ml/data/runs/run1/validation_report_*.txt`, so sánh dòng **`validation macro-F1`** (và `accuracy`) giữa Bi-Encoder gốc, TF-IDF và các bản fine-tune.
2. Chọn đúng **1 model** có `validation macro-F1` cao nhất (nếu tất cả bản fine-tune đều thấp hơn model gốc thì giữ model gốc và cải thiện lại dữ liệu trước).
3. Chạy đánh giá trên `test.csv` **một lần duy nhất** cho model được chọn (thay `<model_tot_nhat>` bằng tên tương ứng, ví dụ `run1_e4_b32`):

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py --data-dir ml/data/runs/run1 --model-dir backend/models/biencoder_<model_tot_nhat>
```

Ghi lại các giá trị **`k`** và **`threshold`** mà lệnh in ra.

4. **Mang gì về từ PC GPU:**
   - Thư mục `backend/models/biencoder_<model_tot_nhat>/`
   - File `ml/data/runs/run1/train.csv`
   - Các file `ml/data/runs/run1/validation_report_*.txt` và `manifest_*.json` (để lưu số liệu đối chiếu)

5. **Cấu hình chạy trên máy SmartFin (`backend/.env`):**

```dotenv
NLP_ENCODER_DIR=models/biencoder_<model_tot_nhat>
NLP_EXAMPLES_CSV=ml/data/runs/run1/train.csv
NLP_CATEGORY_K=7
NLP_CATEGORY_THRESHOLD=0.50
```

Thay `NLP_CATEGORY_K` và `NLP_CATEGORY_THRESHOLD` đúng bằng giá trị validation đã chọn, rồi khởi động lại backend và thử `POST /api/v1/nlp/parse` với các câu mới chưa từng nằm trong `train`/`validation`/`test`. Muốn quay lại model gốc thì xóa hai dòng `NLP_ENCODER_DIR`, `NLP_EXAMPLES_CSV` và khởi động lại.

> **Lưu ý về 4 danh mục Thu (`Lương`, `Thưởng`, `Thu nợ`, `Thu nhập khác`):** dữ liệu train mới đã bao gồm cả 12 danh mục chi và 4 danh mục thu. Hiện API (`backend/app/api/v1/routers/nlp_api.py`) đang chỉ gọi classifier cho giao dịch `expense`; sau khi đem model về, cần cập nhật thêm nhánh gợi ý và lọc danh mục theo loại `income`/`expense` ở backend nếu muốn bật gợi ý tự động cho khoản thu trên giao diện.
