# Nhập giao dịch bằng câu tiếng Việt — Mốc 2 đến Mốc 6

## Đã nối vào ứng dụng

- `POST /api/v1/nlp/parse`: nhận `{ "text": "Hôm qua ăn phở 45k, cafe 25k" }`, trả `drafts`; chỉ đọc ví theo JWT, **không ghi giao dịch**.
- `GET /api/v1/nlp/options`: trả ví của người đăng nhập và danh mục đang hiển thị cho màn hình sửa bản nháp.
- Dashboard: nhập câu → xem trước từng khoản → sửa số tiền, loại, ngày, ví, danh mục, ghi chú → xác nhận gọi `POST /api/v1/transactions/bulk`. Lưu thành công mới xóa câu nhập và tải lại dashboard. Nếu lưu lỗi, bản nháp được giữ nguyên.
- `POST /api/v1/nlp/feedback`: lưu danh mục người dùng sửa **sau khi giao dịch NLP đã được lưu**, kiểm tra transaction thuộc JWT và danh mục sửa khớp giao dịch. Phản hồi của tài khoản này không dùng cho tài khoản khác.
- Bộ phân loại dùng câu mẫu trong `ml/data/category_examples.csv`, VnCoreNLP và Vietnamese Bi-Encoder nếu các model đã có ở `backend/models/`. Nếu thiếu, API vẫn trả bản nháp và yêu cầu chọn danh mục.
- PhoNLP là phần gợi ý `merchant`/`location`; không can thiệp số tiền, ngày hay quyền ghi DB. Mặc định tắt cho đến khi có bộ câu gán nhãn và đo được lợi ích; bật bằng `NLP_ENABLE_NER=true` sau khi đánh giá.

## Cài trên máy phát triển

VnCoreNLP cần JDK và biến môi trường `JAVA_HOME` (chỉ có `java` trên `PATH` là chưa đủ cho PyJNIus). Trong PowerShell, đặt biến cho cửa sổ hiện tại đến thư mục cài JDK, không phải thư mục `bin`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-<version>"
java -version
```

Sau đó từ thư mục `SmartFin/backend` chạy:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-ai.txt
.\venv\Scripts\python.exe scripts/download_nlp_models.py vncorenlp biencoder phonlp
.\venv\Scripts\python.exe scripts/smoke_nlp_models.py
.\venv\Scripts\python.exe scripts/smoke_nlp_e2e.py
```

Nếu venv của bạn tên `.venv`, thay `venv` bằng `.venv`. Script tải một lần vào `backend/models/`; thư mục này đã được `.gitignore`. Bi-Encoder là `bkai-foundation-models/vietnamese-bi-encoder`, vector 768 chiều; cần mạng và dung lượng trống cho PyTorch và model. **Khởi động lại backend sau khi tải** để xóa cache báo “chưa có model”. Không cần Gemini key, API bên ngoài hoặc pgvector cho bước này.

Script chốt revision Bi-Encoder `84f9d9ada0d1a3c37557398b9ae9fcedcdf40be0` (revision đã tải và thử trên máy này). PhoNLP nạp tokenizer PhoBERT từ Hugging Face lần đầu; máy mới cần Internet lúc tải/nạp lần đầu.

Trên máy làm việc hiện tại (24/11/2026), đã cài Python package và tải được VnCoreNLP, Bi-Encoder, PhoNLP. VnCoreNLP được tải bằng Python thuần vì hàm tải mặc định của `py_vncorenlp` cần lệnh `wget` không có sẵn trên Windows. Trên máy khác/venv mới vẫn cần chạy các lệnh trên; trọng số model không được commit vào Git.

`smoke_nlp_e2e.py` gọi API parse → bulk → feedback trên DB hiện có bằng một giao dịch thử trong transaction ngoài, rồi rollback và kiểm tra ví/giao dịch trở lại ban đầu. Script đã chạy đạt trên máy này; không để lại giao dịch thử.

## Đo chất lượng

Từ thư mục `SmartFin`:

```powershell
.\backend\venv\Scripts\python.exe ml/evaluate_nlp.py
.\backend\venv\Scripts\python.exe ml/evaluate_ner.py
```

`category_examples.csv` là câu mẫu; `category_validation.csv` chọn k/ngưỡng, `category_test.csv` kiểm tra cuối. Không chép câu test vào câu mẫu. `ner_test.csv` hiện chỉ là bộ kiểm tra nhỏ để xác minh đường chạy; muốn báo cáo precision/recall đáng tin, nhóm cần tự gán nhãn khoảng 100 câu ghi chú thực tế và giữ riêng khỏi dữ liệu điều chỉnh model. Ngưỡng cosine mặc định `0.50` là kết quả thử trên bộ validation rất nhỏ, **chưa đủ để khẳng định chất lượng**; điểm cosine không phải xác suất.

Kết quả đã đo trên máy này: tập test danh mục 9 câu có **accuracy 0,556**, **macro-F1 0,700** (k=7, ngưỡng 0,50); tập NER 5 câu có merchant precision 1,000 nhưng recall 0,250, location precision 0,333 và recall 1,000. Tập nhỏ và câu do nhóm tự soạn, chỉ dùng để xác minh pipeline. PhoNLP vì vậy vẫn tắt mặc định trong API.

## Kiểm tra nhanh

1. Mở `/docs`, Authorize bằng JWT, gọi `POST /api/v1/nlp/parse` với câu hai khoản. Gọi `GET /transactions` trước/sau parse: tổng số giao dịch không đổi.
2. Trên dashboard, nhập câu → sửa/chọn danh mục → xác nhận → thấy giao dịch mới và số dư ví thay đổi.
3. Dùng tài khoản thứ hai: ví của tài khoản thứ nhất không xuất hiện trong `/nlp/options` hoặc bản nháp của tài khoản thứ hai.
4. Nếu có model, chạy script đánh giá trước khi tin gợi ý danh mục/NER. Mọi gợi ý vẫn cần người dùng kiểm tra trước khi lưu.

## Giới hạn hiện tại

- Chưa tự huấn luyện lại Bi-Encoder hoặc PhoNLP; đang dùng model có sẵn và học từ phản hồi bằng ví dụ riêng của người dùng.
- Phản hồi được gửi sau khi lưu khoản chi nếu người dùng chọn danh mục khác với bản nháp ban đầu, kể cả khi AI chưa gợi ý danh mục. Mẫu riêng chỉ được dùng cho tài khoản đó.
- Model tải ngoài luồng request; nếu thiếu hoặc lỗi, parser luật vẫn hoạt động.

## Nguồn model

- Vietnamese Bi-Encoder: https://huggingface.co/bkai-foundation-models/vietnamese-bi-encoder — model card yêu cầu văn bản đã tách từ và ghi vector 768 chiều.
- VnCoreNLP: https://github.com/vncorenlp/VnCoreNLP — bộ tách từ RDRSegmenter.
- PhoNLP: https://github.com/VinAIResearch/PhoNLP — model NER nhận đầu vào đã tách từ.
- underthesea: https://github.com/undertheseanlp/underthesea — `text_normalize`.
