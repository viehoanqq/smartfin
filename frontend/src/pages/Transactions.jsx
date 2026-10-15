import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Trash2, Edit2, Eye,
  RotateCcw, ChevronLeft, ChevronRight, Calendar, 
  AlertTriangle, Loader2, X, Wallet, Tag, Clock, FileText, Sparkles
} from 'lucide-react';
import { userAPI } from '../api/userAPI';
import { transactionAPI } from '../api/transactionAPI';
import TransactionModal from '../components/dashboard/TransactionModal';

const WALLET_NAMES = {
  1: 'Ví Tiền Mặt',
  2: 'Techcombank Chính',
  3: 'Ví MoMo',
  4: 'Sacombank Tiết Kiệm',
  5: 'ZaloPay'
};

const CATEGORY_NAMES = {
  1: 'Ăn uống & Cà phê',
  2: 'Di chuyển & Xăng xe',
  3: 'Mua sắm cá nhân',
  4: 'Hóa đơn Điện/Nước/Net',
  5: 'Giải trí & Xem phim',
  6: 'Y tế & Sức khỏe',
  7: 'Lương cứng hàng tháng',
  8: 'Thưởng dự án',
  9: 'Thu nhập phụ / Freelance'
};

const Transactions = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, total_pages: 1 });
  
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    type: '',
    wallet: '',
    q: ''
  });
  const [activeRange, setActiveRange] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [viewingTxn, setViewingTxn] = useState(null);
  const [deletingTxn, setDeletingTxn] = useState(null);

  const [deletedTxnId, setDeletedTxnId] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const userRes = await userAPI.getMe();
        setUser(userRes);
        await fetchTransactions(1, filters);
      } catch (error) {
        console.error("Lỗi khởi tạo trang giao dịch:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const fetchTransactions = async (page = 1, customFilters = filters) => {
    try {
      setIsLoading(true);
      const params = { ...customFilters, page, size: 10 };
      const response = await transactionAPI.getTransactions(params);
      
      if (response.items) {
        setTransactions(response.items);
        setPagination({
          page: response.page,
          size: response.size,
          total: response.total,
          total_pages: response.total_pages
        });
      } else {
        setTransactions(response);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách giao dịch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'from' || name === 'to') {
      setActiveRange('');
    }
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickDateRange = (days) => {
    const today = new Date();
    const pastDate = new Date();
    if (days > 0) {
      pastDate.setDate(today.getDate() - days);
    }

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const newFilters = {
      ...filters,
      from: formatDate(pastDate),
      to: formatDate(today)
    };

    setActiveRange(String(days));
    setFilters(newFilters);
    fetchTransactions(1, newFilters);
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchTransactions(1, filters);
  };

  const handleResetFilters = () => {
    const emptyFilters = { from: '', to: '', type: '', wallet: '', q: '' };
    setActiveRange('');
    setFilters(emptyFilters);
    fetchTransactions(1, emptyFilters);
  };

  const handleOpenCreateModal = () => {
    setEditingTxn(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (txn) => {
    setEditingTxn(txn);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (txn) => {
    setDeletingTxn(txn);
  };

  const executeSoftDelete = () => {
    if (!deletingTxn) return;
    const txnId = deletingTxn.id;
    setDeletingTxn(null);
    setDeletedTxnId(txnId);
    
    transactionAPI.deleteTransaction(txnId).then(() => {
      setTransactions(prev => prev.filter(t => t.id !== txnId));
      
      if (undoTimeout) clearTimeout(undoTimeout);

      setToastMessage({
        id: txnId,
        text: "Đã xóa giao dịch thành công. Hoàn lại số dư ví."
      });

      const timer = setTimeout(() => {
        setToastMessage(null);
        setDeletedTxnId(null);
      }, 5000);
      
      setUndoTimeout(timer);
    }).catch(err => {
      console.error("Lỗi xóa giao dịch:", err);
    });
  };

  const handleUndoDelete = async () => {
    if (!deletedTxnId) return;
    try {
      if (undoTimeout) clearTimeout(undoTimeout);
      await transactionAPI.restoreTransaction(deletedTxnId);
      fetchTransactions(pagination.page, filters);
      setToastMessage(null);
      setDeletedTxnId(null);
    } catch (error) {
      console.error("Lỗi hoàn tác:", error);
    }
  };

  const handleExport = async () => {
    try {
      await transactionAPI.exportCSV(filters);
    } catch (error) {
      console.error("Lỗi xuất file CSV:", error);
    }
  };

  if (isLoading && !transactions.length) {
    return (
      <div className="w-full flex-1 flex items-center justify-center bg-[#0F111A]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full text-white relative">
      
      {/* Tiêu đề trang & Nút thao tác */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Quản lý giao dịch</h2>
          <p className="text-gray-300 text-sm">Theo dõi toàn bộ lịch sử thu chi, lọc dữ liệu và xuất báo cáo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#252A3A] hover:bg-[#31384D] border border-[#3A425A] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <Plus size={18} /> Thêm giao dịch
          </button>
        </div>
      </div>

      {/* Thanh Bộ lọc */}
      <form onSubmit={applyFilters} className="bg-[#181B26] border border-[#2E3448] p-5 rounded-2xl mb-8 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Từ ngày</label>
            <input 
              type="date" 
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Đến ngày</label>
            <input 
              type="date" 
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Loại giao dịch</label>
            <select 
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
            >
              <option value="" className="bg-[#181B26]">Tất cả (Thu / Chi)</option>
              <option value="expense" className="bg-[#181B26]">Khoản chi</option>
              <option value="income" className="bg-[#181B26]">Khoản thu</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Tìm kiếm ghi chú</label>
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                placeholder="VD: Ăn phở, cafe..."
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              type="submit"
              className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Filter size={16} /> Lọc
            </button>
            <button 
              type="button"
              onClick={handleResetFilters}
              className="bg-[#252A3A] hover:bg-[#31384D] text-gray-200 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Chọn nhanh ngày */}
        <div className="mt-4 pt-3 border-t border-[#2E3448] flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5 mr-1">
            <Calendar size={14} className="text-blue-400" /> Chọn nhanh:
          </span>
          <button
            type="button"
            onClick={() => handleQuickDateRange(0)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              activeRange === '0'
                ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                : 'bg-[#0F111A] hover:bg-[#252A3A] text-gray-200 border-[#2E3448]'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handleQuickDateRange(7)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              activeRange === '7'
                ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                : 'bg-[#0F111A] hover:bg-[#252A3A] text-gray-200 border-[#2E3448]'
            }`}
          >
            7 ngày gần đây
          </button>
          <button
            type="button"
            onClick={() => handleQuickDateRange(30)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              activeRange === '30'
                ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                : 'bg-[#0F111A] hover:bg-[#252A3A] text-gray-200 border-[#2E3448]'
            }`}
          >
            30 ngày gần đây
          </button>
        </div>
      </form>

      {/* Bảng danh sách giao dịch */}
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
                        onClick={() => setViewingTxn(txn)}
                        className="py-4 px-6 font-semibold text-white hover:text-blue-400 cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết"
                      >
                        {txn.note || 'Không có ghi chú'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                          txn.type === 'income' 
                            ? 'bg-[#15803D] text-white' 
                            : 'bg-[#B91C1C] text-white'
                        }`}>
                          {txn.type === 'income' ? 'Thu nhập' : 'Khoản chi'}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                        txn.type === 'income' ? 'text-[#4ADE80]' : 'text-[#F87171]'
                      }`}>
                        {txn.type === 'income' ? '+' : '-'}{Number(txn.amount).toLocaleString('vi-VN')} {user?.currency || 'VND'}
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg font-semibold ${
                          isNLP 
                            ? 'bg-[#6D28D9] text-white' 
                            : 'bg-[#282E40] text-gray-100 border border-[#3A425A]'
                        }`}>
                          {isNLP && <Sparkles size={12} />}
                          {isNLP ? 'Tự động' : 'Thủ công'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setViewingTxn(txn)}
                            className="p-2 bg-[#252A3A] hover:bg-[#2563EB] text-gray-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(txn)}
                            className="p-2 bg-[#252A3A] hover:bg-[#D97706] text-gray-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa giao dịch"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(txn)}
                            className="p-2 bg-[#252A3A] hover:bg-[#DC2626] text-gray-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Xóa giao dịch"
                          >
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
              onClick={() => fetchTransactions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => fetchTransactions(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
              className="p-2 bg-[#252A3A] hover:bg-[#31384D] disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa */}
      <TransactionModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => fetchTransactions(pagination.page, filters)}
        editData={editingTxn}
      />

      {/* Modal Xem chi tiết */}
      {viewingTxn && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4"
          onClick={() => setViewingTxn(null)}
        >
          <div 
            style={{ maxWidth: '460px', width: '100%' }}
            className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl overflow-hidden p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewingTxn(null)}
              className="absolute top-5 right-5 text-gray-300 hover:text-white bg-[#252A3A] hover:bg-[#31384D] p-2 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">Chi tiết giao dịch</h3>
            <p className="text-gray-300 text-xs mb-6">Mã giao dịch: #{viewingTxn.id}</p>

            <div className={`p-4 rounded-xl mb-5 border text-center ${
              viewingTxn.type === 'income' 
                ? 'bg-[#14532D] border-[#22C55E] text-white' 
                : 'bg-[#7F1D1D] border-[#EF4444] text-white'
            }`}>
              <span className="text-xs uppercase font-bold block mb-1 text-gray-200">
                {viewingTxn.type === 'income' ? 'Khoản thu nhập' : 'Khoản chi tiêu'}
              </span>
              <span className="text-2xl font-extrabold">
                {viewingTxn.type === 'income' ? '+' : '-'}{Number(viewingTxn.amount).toLocaleString('vi-VN')} {user?.currency || 'VND'}
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
                <span className="text-gray-300 flex items-center gap-2"><Clock size={16} /> Thời gian:</span>
                <span className="text-white font-semibold">
                  {new Date(viewingTxn.txn_date).toLocaleString('vi-VN')}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
                <span className="text-gray-300 flex items-center gap-2"><Wallet size={16} /> Ví thanh toán:</span>
                <span className="text-white font-semibold">
                  {WALLET_NAMES[viewingTxn.wallet_id] || `Ví #${viewingTxn.wallet_id}`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
                <span className="text-gray-300 flex items-center gap-2"><Tag size={16} /> Danh mục:</span>
                <span className="text-white font-semibold">
                  {CATEGORY_NAMES[viewingTxn.category_id] || `Danh mục #${viewingTxn.category_id}`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#2E3448]">
                <span className="text-gray-300 flex items-center gap-2"><Sparkles size={16} /> Phương thức nhập:</span>
                <span className="text-white font-semibold">
                  {viewingTxn.source?.toLowerCase() === 'nlp' ? 'Tự động (NLP)' : 'Thủ công'}
                </span>
              </div>

              <div className="py-2">
                <span className="text-gray-300 flex items-center gap-2 mb-1.5"><FileText size={16} /> Ghi chú:</span>
                <div className="bg-[#0F111A] border border-[#2E3448] rounded-xl p-3 text-white font-medium">
                  {viewingTxn.note || 'Không có ghi chú'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#2E3448]">
              <button 
                onClick={() => {
                  const txnToEdit = viewingTxn;
                  setViewingTxn(null);
                  handleOpenEditModal(txnToEdit);
                }}
                className="flex items-center gap-1.5 bg-[#D97706] hover:bg-[#B45309] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <Edit2 size={15} /> Chỉnh sửa
              </button>
              <button 
                onClick={() => setViewingTxn(null)}
                className="px-5 py-2 bg-[#252A3A] hover:bg-[#31384D] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại Xác nhận xóa */}
      {deletingTxn && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4"
          onClick={() => setDeletingTxn(null)}
        >
          <div 
            style={{ maxWidth: '440px', width: '100%' }}
            className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#991B1B] flex items-center justify-center text-white shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Xác nhận xóa giao dịch</h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Bạn có chắc chắn muốn xóa giao dịch <strong className="text-white">"{deletingTxn.note || 'Không có ghi chú'}"</strong> với số tiền <strong className="text-[#F87171]">{Number(deletingTxn.amount).toLocaleString('vi-VN')} {user?.currency || 'VND'}</strong> không?
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Số dư ví sẽ được hoàn lại tương ứng ngay sau khi xóa.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#2E3448]">
              <button 
                type="button"
                onClick={() => setDeletingTxn(null)}
                className="px-4 py-2.5 bg-[#252A3A] hover:bg-[#31384D] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={executeSoftDelete}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={16} /> Xóa giao dịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo Hoàn tác */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181B26] border border-[#3B82F6] shadow-2xl rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-sm font-bold text-white">{toastMessage.text}</p>
            <p className="text-xs text-gray-300">Bạn có thể hoàn tác trong vòng 5 giây.</p>
          </div>
          <button 
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={14} /> Hoàn tác
          </button>
        </div>
      )}
    </main>
  );
};

export default Transactions;