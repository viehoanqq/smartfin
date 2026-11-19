import React from 'react';
import { Eye, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_CONFIG = {
  income: {
    label: 'Thu nhập',
    badgeClass: 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400',
    amountClass: 'text-[#4ADE80]',
    sign: '+',
  },
  saving: {
    label: 'Tiết kiệm',
    badgeClass: 'bg-blue-500/10 border border-blue-500/25 text-blue-400',
    amountClass: 'text-[#60A5FA]',
    sign: '-',
  },
  expense: {
    label: 'Chi tiêu',
    badgeClass: 'bg-rose-500/10 border border-rose-500/25 text-rose-400',
    amountClass: 'text-[#F87171]',
    sign: '-',
  },
};

const TransactionTable = ({ transactions, currency, pagination, onPageChange, onView }) => {
  return (
    <div className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-lg overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2E3448] text-gray-200 text-xs uppercase tracking-wider bg-[#12151E]">
              <th className="py-4 px-6 font-bold">Thời gian</th>
              <th className="py-4 px-6 font-bold">Ghi chú</th>
              <th className="py-4 px-6 font-bold">Loại</th>
              <th className="py-4 px-6 font-bold text-right">Số tiền</th>
              <th className="py-4 px-6 font-bold text-center">Nguồn</th>
              <th className="py-4 px-6 font-bold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2E3448] text-sm">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-gray-300 font-medium">
                  Không tìm thấy giao dịch nào phù hợp.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const isNLP = txn.source?.toLowerCase() === 'nlp';
                const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.expense;

                return (
                  <tr key={txn.id} className="hover:bg-[#202432] transition-colors">
                    <td className="py-4 px-6 text-gray-100 whitespace-nowrap font-medium">
                      {new Date(txn.txn_date).toLocaleDateString('vi-VN')}{' '}
                      <span className="text-gray-400 text-xs ml-1">
                        {new Date(txn.txn_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td
                      onClick={() => onView(txn)}
                      className="py-4 px-6 font-semibold text-white hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      {txn.note || 'Không có ghi chú'}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className={`py-4 px-6 text-right font-bold whitespace-nowrap ${cfg.amountClass}`}>
                      {cfg.sign}{Number(txn.amount).toLocaleString('vi-VN')} {currency || 'VND'}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold ${
                          isNLP
                            ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                            : 'bg-[#282E40] text-gray-200 border border-[#3A425A]'
                        }`}
                      >
                        {isNLP && <Sparkles size={12} />}
                        {isNLP ? 'Tự động' : 'Thủ công'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onView(txn)}
                          className="p-2 bg-[#252A3A] hover:bg-[#2563EB] text-gray-200 hover:text-white rounded-lg cursor-pointer transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="py-4 px-6 border-t border-[#2E3448] flex items-center justify-between text-sm text-gray-200 bg-[#12151E]">
        <span>
          Trang <strong className="text-white">{pagination.page}</strong> / {pagination.total_pages} (Tổng số: {pagination.total} giao dịch)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl cursor-pointer transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;