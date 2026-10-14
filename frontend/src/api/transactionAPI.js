
import axiosClient from './axiosClient';

const cleanParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  );
};

export const transactionAPI = {
  /**
   * 1. Lấy danh sách giao dịch (Có lọc & phân trang)
   * @param {Object} params - { from, to, category, wallet, type, q, page, size }
   */
  getTransactions: async (params = {}) => {
    const validParams = cleanParams(params);
    const response = await axiosClient.get('/transactions', { params: validParams });
    return response.data ?? response;
  },

  /**
   * 2. Tạo 1 giao dịch mới (Dùng cho form nhập thủ công UC02 hoặc đơn lẻ từ NLP)
   * @param {Object} data - { wallet_id, category_id, type, amount, txn_date, note, source, ... }
   */
  createTransaction: async (data) => {
    const response = await axiosClient.post('/transactions', data);
    return response.data ?? response;
  },

  /**
   * 3. Cập nhật giao dịch (Tự động hoàn tác số dư cũ và áp dụng số dư mới ở BE)
   * @param {number} txnId - ID giao dịch cần sửa
   * @param {Object} data - Các trường cần cập nhật
   */
  updateTransaction: async (txnId, data) => {
    const response = await axiosClient.put(`/transactions/${txnId}`, data);
    return response.data ?? response;
  },

  /**
   * 4. Xóa mềm giao dịch (Hoàn lại số dư ví)
   * @param {number} txnId - ID giao dịch cần xóa
   */
  deleteTransaction: async (txnId) => {
    const response = await axiosClient.delete(`/transactions/${txnId}`);
    return response.data ?? response;
  },

  /**
   * 5. Hoàn tác giao dịch vừa xóa (Dùng cho nút "Hoàn tác" trong 5 giây ở Toast)
   * @param {number} txnId - ID giao dịch cần khôi phục
   */
  restoreTransaction: async (txnId) => {
    const response = await axiosClient.post(`/transactions/${txnId}/restore`);
    return response.data ?? response;
  },

  /**
   * 6. Tạo nhiều giao dịch cùng lúc (Dùng khi bấm Xác nhận nhiều thẻ NLP hoặc Commit Import CSV)
   * @param {Array} transactionsList - Mảng các object giao dịch: [{ wallet_id, category_id, ... }, ...]
   */
  createBulkTransactions: async (transactionsList) => {
    const payload = { transactions: transactionsList };
    const response = await axiosClient.post('/transactions/bulk', payload);
    return response.data ?? response;
  },

  /**
   * 7. Xem trước (Preview) khi tải file CSV lên (Chưa lưu vào DB)
   * @param {File} file - File .csv lấy từ thẻ <input type="file" />
   */
  previewImportCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post('/transactions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data ?? response;
  },

  /**
   * 8. Xuất và tự động tải xuống file CSV danh sách giao dịch
   * @param {Object} params - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
   */
  exportCSV: async (params = {}) => {
    const validParams = cleanParams(params);
    const response = await axiosClient.get('/transactions/export', {
      params: validParams,
      responseType: 'blob', // Bắt buộc phải có để nhận luồng dữ liệu file
    });

    // Xử lý tự động kích hoạt tải file trên trình duyệt
    const blobData = response.data ?? response;
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Đặt tên file kèm ngày xuất (VD: smartfin_transactions_2026-10-14.csv)
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `smartfin_transactions_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    
    // Dọn dẹp bộ nhớ sau khi tải xong
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};