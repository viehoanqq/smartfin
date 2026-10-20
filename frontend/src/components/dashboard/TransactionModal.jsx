import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Tag, Calendar, FileText } from 'lucide-react';
import { transactionAPI } from '../../api/transactionAPI';
import { walletAPI } from '../../api/walletAPI';

const CATEGORIES = [
  { id: 1, name: 'Ăn uống & Cà phê', type: 'expense' },
  { id: 2, name: 'Di chuyển & Xăng xe', type: 'expense' },
  { id: 3, name: 'Mua sắm cá nhân', type: 'expense' },
  { id: 4, name: 'Hóa đơn Điện/Nước/Net', type: 'expense' },
  { id: 5, name: 'Giải trí & Xem phim', type: 'expense' },
  { id: 6, name: 'Y tế & Sức khỏe', type: 'expense' },
  { id: 7, name: 'Lương cứng hàng tháng', type: 'income' },
  { id: 8, name: 'Thưởng dự án', type: 'income' },
  { id: 9, name: 'Thu nhập phụ / Freelance', type: 'income' },
];

const TransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [formData, setFormData] = useState({
    wallet_id: '',
    category_id: '1',
    type: 'expense',
    amount: '',
    txn_date: '',
    note: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatLocalDateTime = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!isOpen) return;
    walletAPI.getMyWallet()
      .then((w) => setFormData((prev) => ({ ...prev, wallet_id: String(w.id) })))
      .catch(() => setErrorMessage('Không tải được ví của bạn.'));
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setFormData({
        wallet_id: String(editData.wallet_id || ''),
        category_id: String(editData.category_id || '1'),
        type: editData.type || 'expense',
        amount: String(editData.amount || ''),
        txn_date: formatLocalDateTime(editData.txn_date),
        note: editData.note || ''
      });
    } else {
      setFormData({
        wallet_id: '',
        category_id: '1',
        type: 'expense',
        amount: '',
        txn_date: formatLocalDateTime(),
        note: ''
      });
    }
    setErrorMessage('');
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Xử lý riêng khi gõ Số tiền: Lọc bỏ mọi ký tự không phải số (dấu chấm, chữ cái) để lưu số nguyên gốc
  const handleAmountChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, amount: rawDigits }));
  };

  // Biến hiển thị có dấu chấm phân cách hàng nghìn (VD: 1.000.000)
  const displayAmount = formData.amount
    ? Number(formData.amount).toLocaleString('vi-VN')
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = Number(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Số tiền giao dịch phải lớn hơn 0!");
      return;
    }

    if (!formData.wallet_id || !formData.category_id) {
      setErrorMessage("Vui lòng chọn Ví và Danh mục!");
      return;
    }

    setIsLoading(true);

    try {
      const basePayload = {
        wallet_id: Number(formData.wallet_id),
        category_id: Number(formData.category_id),
        type: formData.type,
        amount: parsedAmount, // Gửi lên BE vẫn là số nguyên chuẩn (VD: 1000000)
        txn_date: formData.txn_date ? new Date(formData.txn_date).toISOString() : new Date().toISOString(),
        note: formData.note
      };

      if (editData) {
        await transactionAPI.updateTransaction(editData.id, basePayload);
      } else {
        await transactionAPI.createTransaction({ ...basePayload, source: 'manual' });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Lỗi khi lưu giao dịch:", error);
      setErrorMessage(error.response?.data?.detail || "Không thể lưu giao dịch. Vui lòng kiểm tra lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        style={{ maxWidth: '520px', width: '100%' }}
        className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl overflow-hidden p-6 relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-300 hover:text-white bg-[#252A3A] hover:bg-[#31384D] p-2 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">
          {editData ? "Chỉnh sửa giao dịch" : "Thêm giao dịch thủ công"}
        </h3>
        <p className="text-gray-300 text-xs mb-6">
          {editData ? `Đang sửa giao dịch #${editData.id}` : "Nhập thông tin chi tiết cho khoản thu hoặc chi tiêu của bạn."}
        </p>

        {errorMessage && (
          <div className="mb-4 bg-[#7F1D1D] border border-[#DC2626] text-white p-3 rounded-xl text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Nút gạt Khoản chi / Khoản thu */}
          <div className="flex gap-2 p-1.5 bg-[#0F111A] rounded-xl border border-[#2E3448]">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                formData.type === 'expense' 
                  ? 'bg-[#DC2626] text-white' 
                  : 'bg-transparent text-gray-300 hover:text-white hover:bg-[#1E2230]'
              }`}
            >
              Khoản chi
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                formData.type === 'income' 
                  ? 'bg-[#16A34A] text-white' 
                  : 'bg-transparent text-gray-300 hover:text-white hover:bg-[#1E2230]'
              }`}
            >
              Khoản thu
            </button>
          </div>

          {/* Số tiền (Tự động format 1.000.000 khi nhập) */}
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Số tiền (VND) *</label>
            <div className="relative flex items-center">
              <DollarSign size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input 
                type="text"
                inputMode="numeric"
                name="amount"
                required
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="VD: 1.000.000"
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-14 py-3 text-base text-white outline-none font-bold placeholder-gray-500 tracking-wide"
              />
              <span className="absolute right-4 text-xs font-bold text-gray-400 pointer-events-none">
                VND
              </span>
            </div>
          </div>

          {/* Chọn Ví & Danh mục */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Danh mục *</label>
              <div className="relative flex items-center">
                <Tag size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                <select 
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#181B26] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Thời gian */}
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Thời gian giao dịch</label>
            <div className="relative flex items-center">
              <Calendar size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input 
                type="datetime-local" 
                name="txn_date"
                value={formData.txn_date}
                onChange={handleChange}
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Ghi chú</label>
            <div className="relative">
              <FileText size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
              <textarea 
                name="note"
                rows="2"
                value={formData.note}
                onChange={handleChange}
                placeholder="VD: Ăn phở bò, đổ xăng..."
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none resize-none placeholder-gray-500"
              ></textarea>
            </div>
          </div>

          {/* Nút Đóng & Lưu */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-[#2E3448]">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#252A3A] hover:bg-[#31384D] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isLoading ? 'Đang lưu...' : (editData ? 'Cập nhật' : 'Lưu giao dịch')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TransactionModal;