import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { transactionAPI } from '../../api/transactionAPI';

export const WALLET_LIST = [
  { id: 1, name: 'Tiền mặt' },
  { id: 2, name: 'Techcombank' },
  { id: 3, name: 'Ví MoMo' },
  { id: 4, name: 'Sacombank Tiết Kiệm' },
  { id: 5, name: 'ZaloPay' },
];

export const CATEGORY_LIST = [
  { id: 1, name: 'Ăn uống & Cà phê', type: 'expense' },
  { id: 2, name: 'Di chuyển & Xăng xe', type: 'expense' },
  { id: 3, name: 'Mua sắm cá nhân', type: 'expense' },
  { id: 4, name: 'Hóa đơn Điện / Nước / Net', type: 'expense' },
  { id: 5, name: 'Giải trí & Xem phim', type: 'expense' },
  { id: 6, name: 'Y tế & Sức khỏe', type: 'expense' },
  { id: 7, name: 'Lương cố định', type: 'income' },
  { id: 8, name: 'Thưởng dự án', type: 'income' },
  { id: 9, name: 'Thu nhập phụ / Freelance', type: 'income' },
];

const TransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [formData, setFormData] = useState({
    wallet_id: '1',
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
    if (editData) {
      setFormData({
        wallet_id: String(editData.wallet_id || '1'),
        category_id: String(editData.category_id || '1'),
        type: editData.type || 'expense',
        amount: String(editData.amount || ''),
        txn_date: formatLocalDateTime(editData.txn_date),
        note: editData.note || ''
      });
    } else {
      setFormData({
        wallet_id: '1',
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

  // Chuyển đổi loại Thu/Chi và tự động chọn danh mục đầu tiên tương ứng
  const handleTypeSwitch = (newType) => {
    const firstMatchingCat = CATEGORY_LIST.find(c => c.type === newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      category_id: firstMatchingCat ? String(firstMatchingCat.id) : prev.category_id
    }));
  };

  // Xử lý gõ số tiền mượt mà (chỉ lấy số, hiển thị có dấu chấm)
  const handleAmountChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, amount: rawDigits }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = Number(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }

    setIsLoading(true);
    try {
      const basePayload = {
        wallet_id: Number(formData.wallet_id),
        category_id: Number(formData.category_id),
        type: formData.type,
        amount: parsedAmount,
        txn_date: formData.txn_date ? new Date(formData.txn_date).toISOString() : new Date().toISOString(),
        note: formData.note.trim()
      };

      if (editData) {
        await transactionAPI.updateTransaction(editData.id, basePayload);
      } else {
        await transactionAPI.createTransaction({ ...basePayload, source: 'manual' });
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "Không thể lưu giao dịch. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Lọc danh mục theo loại Thu / Chi (giữ lại danh mục hiện tại nếu đang sửa)
  const filteredCategories = CATEGORY_LIST.filter(
    c => c.type === formData.type || String(c.id) === String(formData.category_id)
  );

  const formattedAmount = formData.amount
    ? Number(formData.amount).toLocaleString('vi-VN')
    : '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div 
        style={{ maxWidth: '460px', width: '100%' }}
        className="bg-[#14161F] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header tối giản */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-gray-100">
            {editData ? "Chỉnh sửa giao dịch" : "Ghi chép giao dịch"}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3.5 py-2.5 rounded-lg text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Segmented Control chuyển đổi Chi tiêu / Thu nhập */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0B0C10] rounded-xl border border-white/[0.05]">
            <button
              type="button"
              onClick={() => handleTypeSwitch('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                formData.type === 'expense'
                  ? 'bg-[#1E212D] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ArrowUpRight size={14} className={formData.type === 'expense' ? 'text-rose-400' : 'text-gray-500'} />
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                formData.type === 'income'
                  ? 'bg-[#1E212D] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ArrowDownLeft size={14} className={formData.type === 'income' ? 'text-emerald-400' : 'text-gray-500'} />
              Thu nhập
            </button>
          </div>

          {/* Khu vực nhập số tiền chuẩn App Tài chính */}
          <div className="bg-[#0B0C10] border border-white/[0.06] focus-within:border-blue-500/60 rounded-xl px-4 py-3.5 transition-colors">
            <label className="text-[11px] font-medium text-gray-400 block mb-1">
              Số tiền giao dịch
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="text"
                inputMode="numeric"
                required
                value={formattedAmount}
                onChange={handleAmountChange}
                placeholder="0"
                autoFocus
                className={`w-full bg-transparent text-2xl font-semibold tracking-tight outline-none tabular-nums ${
                  formData.type === 'income' ? 'text-emerald-400' : 'text-white'
                }`}
              />
              <span className="text-sm font-medium text-gray-500 select-none">VND</span>
            </div>
          </div>

          {/* Chọn Nguồn ví & Danh mục */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tài khoản / Ví</label>
              <select
                name="wallet_id"
                value={formData.wallet_id}
                onChange={handleChange}
                className="w-full bg-[#0B0C10] border border-white/[0.07] focus:border-blue-500/60 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none cursor-pointer transition-colors"
              >
                {WALLET_LIST.map(w => (
                  <option key={w.id} value={w.id} className="bg-[#14161F]">{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Danh mục</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full bg-[#0B0C10] border border-white/[0.07] focus:border-blue-500/60 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none cursor-pointer transition-colors"
              >
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#14161F]">{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Thời gian */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Thời gian</label>
            <input
              type="datetime-local"
              name="txn_date"
              value={formData.txn_date}
              onChange={handleChange}
              className="w-full bg-[#0B0C10] border border-white/[0.07] focus:border-blue-500/60 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none [color-scheme:dark] transition-colors"
            />
          </div>

          {/* Diễn giải / Ghi chú */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">Diễn giải</label>
            <input
              type="text"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Nhập ghi chú (VD: Tiền điện tháng 10, Ăn trưa...)"
              className="w-full bg-[#0B0C10] border border-white/[0.07] focus:border-blue-500/60 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: '#2563EB' }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium text-white hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              <span>{isLoading ? 'Đang lưu...' : (editData ? 'Lưu thay đổi' : 'Tạo giao dịch')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;