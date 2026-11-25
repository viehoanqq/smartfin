# Huấn luyện NLP phân loại giao dịch trong SmartFin

Nếu chuyển sang PC có GPU, dùng script một lệnh và hướng dẫn riêng ở [CHAY_TRAIN_TREN_PC_GPU.md](CHAY_TRAIN_TREN_PC_GPU.md).

## Trạng thái thật

Parser tiền/ngày/ví ở `backend/app/ai/nlp_parser/` là luật, không có trọng số để train. Bộ gợi ý **danh mục chi** ở `backend/app/ai/classifier/` dùng VnCoreNLP tách từ, Vietnamese Bi-Encoder có sẵn và k-NN trên `ml/data/category_examples.csv`. PhoNLP chỉ thử nhận tên cửa hàng/địa điểm và đang tắt mặc định. Gemini là chatbot trả lời từ DB, không huấn luyện parser/danh mục. Bi-Encoder cần đầu vào đã tách từ theo [model card](https://huggingface.co/bkai-foundation-models/vietnamese-bi-encoder).

Ngày 24/11/2026: DB có 17 danh mục nhưng chỉ có câu mẫu cho 3 danh mục (10 câu/mục); bảng `nlp_feedback` có **0 dòng**. Kết quả accuracy 0,556 trên 9 câu test quá nhỏ để kết luận mô hình tốt hay dở. Cần dữ liệu có nhãn thật trước khi fine-tune.

## Làm từng bước bằng lệnh (PowerShell, từ thư mục `SmartFin`)

**Bước 0 — Cài phần huấn luyện.** Máy hiện tại đã cài `datasets 5.2.0` và `accelerate 1.16.0`. Máy khác chạy:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-train.txt
.\venv\Scripts\python.exe scripts/download_nlp_models.py vncorenlp biencoder
cd ..
```

Kiểm tra GPU: `.\backend\venv\Scripts\python.exe -c "import torch; print(torch.cuda.is_available())"`. Máy hiện tại in `False`: PyTorch đang là bản CPU. Nếu có NVIDIA GPU và muốn dùng CUDA, lấy **lệnh cài đúng cho máy** từ [PyTorch Get Started](https://pytorch.org/get-started/locally/); không đoán phiên bản CUDA. Không bắt buộc có GPU để chạy lệnh train, nhưng CPU chậm hơn.

**Bước 1 — Tạo dữ liệu có nhãn.** Tiếp tục nhập giao dịch từ ô `Nhập thông minh` và xác nhận danh mục. Xuất phản hồi đã có theo từng người:

```powershell
.\backend\venv\Scripts\python.exe ml/export_feedback_for_review.py --user-id 1
```

Tạo `ml/data/reviewed_labels.csv` với đúng ba cột `text,category_name,reviewed`. Có thể sao chép hàng từ file xuất, hoặc tự nhập câu đã gán nhãn. Ví dụ:

```csv
text,category_name,reviewed
ăn phở bò,Ăn uống,1
đổ xăng xe máy,Di chuyển,1
```

Chỉ ghi `reviewed=1` sau khi người duyệt xác nhận nhãn và xóa dữ liệu riêng tư. Để script chia dữ liệu chạy, cần **ít nhất 20 câu khác nhau cho mỗi danh mục và ít nhất 2 danh mục**; để đánh giá tốt hơn, hướng tới 70–100+ câu/danh mục. File này bị Git bỏ qua. Hiện DB có 0 phản hồi, nên nhóm phải tạo dữ liệu trước khi chạy bước 2.

**Bước 2 — Chia dữ liệu một lần.** Lệnh này lấy riêng hàng `reviewed=1`, phát hiện cùng câu nhưng nhãn khác nhau và chia theo từng danh mục:

```powershell
.\backend\venv\Scripts\python.exe ml/prepare_category_data.py --input ml/data/reviewed_labels.csv --output-dir ml/data/runs/run1
```

Đầu ra: `train.csv`, `validation.csv`, `test.csv` trong `ml/data/runs/run1` (bị Git bỏ qua). Duyệt lại thủ công để tên quán và câu gần như trùng không nằm ở cả train lẫn test. **Không sửa test theo kết quả mô hình.**

**Bước 3 — Đo trước khi train.** Hai lệnh chỉ dùng validation, chưa mở test:

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py --data-dir ml/data/runs/run1 --model-dir backend/models/biencoder --validation-only
.\backend\venv\Scripts\python.exe ml/evaluate_tfidf.py --data-dir ml/data/runs/run1 --validation-only
```

Ghi lại macro-F1, accuracy và từng lớp. TF-IDF + Linear SVM là baseline rẻ để biết fine-tune có thật sự cần thiết. Script TF-IDF hiện chỉ đo, chưa nối vào API.

**Bước 4 — Kiểm tra rồi fine-tune bản sao.** Lệnh đầu kiểm tra CSV/đường dẫn mà chưa train. Lệnh sau dùng 2 epoch; máy không có CUDA phải thêm `--allow-cpu`:

```powershell
.\backend\venv\Scripts\python.exe ml/train_category_encoder.py --train ml/data/runs/run1/train.csv --output-model backend/models/biencoder_run1 --check-only
.\backend\venv\Scripts\python.exe ml/train_category_encoder.py --train ml/data/runs/run1/train.csv --output-model backend/models/biencoder_run1 --epochs 2 --batch-size 8 --allow-cpu
```

Script dùng `BatchHardTripletLoss` và sampler ghép nhiều ví dụ cùng nhãn trong batch, đúng dạng dữ liệu phân loại. [Tài liệu Sentence Transformers](https://www.sbert.net/docs/package_reference/sentence_transformer/losses.html). Model gốc ở `backend/models/biencoder` không bị ghi đè. Nếu train lại, dùng thư mục đầu ra mới như `biencoder_run2`.

**Bước 5 — So kết quả trên validation.**

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py --data-dir ml/data/runs/run1 --model-dir backend/models/biencoder_run1 --validation-only
```

Nếu macro-F1 hoặc các danh mục quan trọng giảm, giữ model gốc. Có thể thử 1–3 epoch và ngưỡng/k khác bằng validation, nhưng mỗi lượt phải lưu model ra thư mục khác. Sau khi chốt một phương án, chạy đánh giá **một lần** trên test:

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py --data-dir ml/data/runs/run1 --model-dir backend/models/biencoder_run1
```

**Bước 6 — Chỉ khi bản mới đạt, cho backend dùng nó.** Thêm vào `backend/.env`:

```dotenv
NLP_ENCODER_DIR=models/biencoder_run1
NLP_EXAMPLES_CSV=ml/data/runs/run1/train.csv
NLP_CATEGORY_K=7
NLP_CATEGORY_THRESHOLD=0.50
```

`NLP_ENCODER_DIR` tính từ thư mục `backend`; `NLP_EXAMPLES_CSV` tính từ thư mục gốc `SmartFin`. Thay `K` và ngưỡng bằng kết quả validation, khởi động lại backend, rồi thử `POST /api/v1/nlp/parse` với câu mới. Để quay về model gốc, xóa hai dòng `NLP_ENCODER_DIR` và `NLP_EXAMPLES_CSV`, khởi động lại. Không đưa `test.csv` vào câu mẫu của API.

## Tách ba bài toán

| Bài toán | Cách cải thiện trước | Chỉ train khi |
|---|---|---|
| Số tiền, ngày, tách nhiều khoản | Bổ sung test và sửa luật ở `backend/tests/test_nlp_rules.py` | Có nhiều trường hợp luật không xử lý được và bộ dữ liệu gán span |
| Danh mục | Câu mẫu thật, nhãn duyệt, so sánh baseline, chỉnh ngưỡng | Có đủ dữ liệu train/validation/test |
| Cửa hàng/địa điểm | Gán nhãn NER riêng và đo lại `ml/evaluate_ner.py` | Recall hiện tại còn thấp, có tập thực thể đủ lớn |

Không dùng Gemini/RAG để cộng tiền hoặc thay truy vấn tài chính. Không dùng câu trong test để train hoặc chọn ngưỡng.
