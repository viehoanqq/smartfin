import React from 'react';
import { 
  X, Clock, Wallet, Tag, Sparkles, FileText 
} from 'lucide-react';

const getTxnDateSource = (txn) => txn?.created_at || txn?.create_at || txn?.txn_date;

const parseTxnDate = (rawDate) => {
  if (!rawDate) return null;
  if (rawDate instanceof Date) return Number.isNaN(rawDate.getTime()) ? null : rawDate;

  let str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
    str = `${str}Z`;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatTxnFullDateTime = (txn) => {
  const d = parseTxnDate(getTxnDateSource(txn));
  if (!d) return '--';
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const TransactionDetailModal = ({ txn, currency, categories = {}, onClose, onEdit }) => {
  if (!txn) return null;

  // Lấy tên danh mục thật từ object categories truyền vào, nếu không có thì fallback về ID
  const categoryName = categories[txn.category_id] || `Tiết kiệm`;

  // Phân loại kiểu hiển thị màu sắc theo type (income / expense / saving)
  const isIncome = txn.type === 'income';
  const isSaving = txn.type === 'saving';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4"
      onClick={onClose}
    >
      <div 
        style={{ maxWidth: '460px', width: '100%' }} 
        className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-gray-300 hover:text-white bg-[#252A3A] hover:bg-[#31384D] p-2 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Chi tiết giao dịch</h3>
        <p className="text-gray-300 text-xs mb-6"></p>

        {/* Khối hiển thị số tiền và loại giao dịch */}
        <div className={`p-4 rounded-xl mb-5 border text-center ${
          isIncome 
            ? 'bg-[#14532D] border-[#22C55E] text-white' 
            : isSaving 
            ? 'bg-[#1E3A8A] border-[#3B82F6] text-white' 
            : 'bg-[#7F1D1D] border-[#EF4444] text-white'
        }`}>
          <span className="text-xs uppercase font-bold block mb-1 text-gray-200">
            {{ income: 'Khoản hoàn tiền', saving: 'Khoản tiết kiệm' }[txn.type] || 'Khoản chi tiêu'}
          </span>
          <span className="text-2xl font-extrabold">
            {isIncome ? '+' : '-'}{Number(txn.amount).toLocaleString('vi-VN')} {currency || 'VND'}
          </span>
        </div>

        {/* Thông tin chi tiết */}
        <div className="space-y-3.5 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Clock size={16} /> Thời gian:</span>
            <span className="text-white font-semibold">
              {formatTxnFullDateTime(txn)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Wallet size={16} /> Ví thanh toán:</span>
            <span className="text-white font-semibold">Ví chính</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Tag size={16} /> Danh mục:</span>
            <span className="text-white font-semibold">{categoryName}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Sparkles size={16} /> Phương thức:</span>
            <span className="text-white font-semibold">
              {txn.source?.toLowerCase() === 'nlp' ? 'Tự động (NLP)' : 'Thủ công'}
            </span>
          </div>

          <div className="py-2">
            <span className="text-gray-300 flex items-center gap-2 mb-1.5"><FileText size={16} /> Ghi chú:</span>
            <div className="bg-[#0F111A] border border-[#2E3448] rounded-xl p-3 text-white font-medium">
              {txn.note || 'Không có ghi chú'}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#2E3448]">
          <button 
            onClick={onClose} 
            className="px-5 py-2 bg-[#252A3A] hover:bg-[#31384D] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;