import React from 'react';
import { Eye, Edit2, Trash2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';


const TransactionTable = ({ transactions, currency, pagination, onPageChange, onView, onEdit, onDelete }) => {
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
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                        txn.type === 'income' ? 'bg-[#15803D] text-white' : 'bg-[#B91C1C] text-white'
                      }`}>
                        {txn.type === 'income' ? 'Thu nhập' : 'Khoản chi'}
                      </span>
                    </td>
                    <td className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                      txn.type === 'income' ? 'text-[#4ADE80]' : 'text-[#F87171]'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{Number(txn.amount).toLocaleString('vi-VN')} {currency || 'VND'}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg font-semibold ${
                        isNLP ? 'bg-[#6D28D9] text-white' : 'bg-[#282E40] text-gray-100 border border-[#3A425A]'
                      }`}>
                        {isNLP && <Sparkles size={12} />}
                        {isNLP ? 'Tự động' : 'Thủ công'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onView(txn)} className="p-2 bg-[#252A3A] hover:bg-[#2563EB] text-gray-200 hover:text-white rounded-lg cursor-pointer" title="Xem chi tiết">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => onEdit(txn)} className="p-2 bg-[#252A3A] hover:bg-[#D97706] text-gray-200 hover:text-white rounded-lg cursor-pointer" title="Chỉnh sửa">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(txn)} className="p-2 bg-[#252A3A] hover:bg-[#DC2626] text-gray-200 hover:text-white rounded-lg cursor-pointer" title="Xóa">
                          <Trash2 size={16} />
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
        <span>Trang <strong className="text-white">{pagination.page}</strong> / {pagination.total_pages} (Tổng số: {pagination.total} giao dịch)</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;