import React from 'react';
import { X, Clock, Wallet, Tag, Sparkles, FileText, Edit2 } from 'lucide-react';

const CATEGORY_NAMES = { 1: 'Ăn uống & Cà phê', 2: 'Di chuyển & Xăng xe', 3: 'Mua sắm cá nhân', 4: 'Hóa đơn Điện/Nước/Net', 5: 'Giải trí & Xem phim', 6: 'Y tế & Sức khỏe', 7: 'Lương cứng hàng tháng', 8: 'Thưởng dự án', 9: 'Thu nhập phụ / Freelance' };

const TransactionDetailModal = ({ txn, currency, onClose, onEdit }) => {
  if (!txn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4" onClick={onClose}>
      <div style={{ maxWidth: '460px', width: '100%' }} className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-white bg-[#252A3A] p-2 rounded-xl cursor-pointer">
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Chi tiết giao dịch</h3>
        <p className="text-gray-300 text-xs mb-6">Mã giao dịch: #{txn.id}</p>

        <div className={`p-4 rounded-xl mb-5 border text-center ${
          txn.type === 'income' ? 'bg-[#14532D] border-[#22C55E] text-white' : 'bg-[#7F1D1D] border-[#EF4444] text-white'
        }`}>
          <span className="text-xs uppercase font-bold block mb-1 text-gray-200">
            {txn.type === 'income' ? 'Khoản thu nhập' : 'Khoản chi tiêu'}
          </span>
          <span className="text-2xl font-extrabold">
            {txn.type === 'income' ? '+' : '-'}{Number(txn.amount).toLocaleString('vi-VN')} {currency || 'VND'}
          </span>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Clock size={16} /> Thời gian:</span>
            <span className="text-white font-semibold">{new Date(txn.txn_date).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Wallet size={16} /> Ví thanh toán:</span>
            <span className="text-white font-semibold">Ví chính</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Tag size={16} /> Danh mục:</span>
            <span className="text-white font-semibold">{CATEGORY_NAMES[txn.category_id] || `Danh mục #${txn.category_id}`}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
            <span className="text-gray-300 flex items-center gap-2"><Sparkles size={16} /> Phương thức:</span>
            <span className="text-white font-semibold">{txn.source?.toLowerCase() === 'nlp' ? 'Tự động (NLP)' : 'Thủ công'}</span>
          </div>
          <div className="py-2">
            <span className="text-gray-300 flex items-center gap-2 mb-1.5"><FileText size={16} /> Ghi chú:</span>
            <div className="bg-[#0F111A] border border-[#2E3448] rounded-xl p-3 text-white font-medium">
              {txn.note || 'Không có ghi chú'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#2E3448]">
          <button onClick={() => { onClose(); onEdit(txn); }} className="flex items-center gap-1.5 bg-[#D97706] text-white px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <Edit2 size={15} /> Chỉnh sửa
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-[#252A3A] text-white rounded-xl text-sm font-semibold cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;