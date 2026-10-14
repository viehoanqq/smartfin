import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Trash2, Edit2, 
  RotateCcw, ChevronLeft, ChevronRight, Wallet, Tag, Calendar, 
  CheckCircle, AlertTriangle, Loader2 
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { userAPI } from '../api/userAPI';
import { transactionAPI } from '../api/transactionAPI';
import ConfirmModal from '../components/common/ConfirmModal';
const Transactions = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State dữ liệu giao dịch & phân trang
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, total_pages: 1 });
  
  // State bộ lọc giao dịch (Khớp với ?from&to&category&wallet&type&q&page)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    type: '',
    wallet: '',
    q: ''
  });

  // State cho Modal Xóa & Thanh Toast Hoàn tác 5 giây
  const [deletedTxnId, setDeletedTxnId] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // State Modal Thông báo chung
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    isDanger: false,
    icon: AlertTriangle,
    onConfirm: null
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // 1. Lấy thông tin user và danh sách giao dịch ban đầu
  useEffect(() => {
    const initData = async () => {
      try {
        const userRes = await userAPI.getMe();
        setUser(userRes);
        await fetchTransactions(1);
      } catch (error) {
        console.error("Lỗi khởi tạo trang giao dịch:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Hàm gọi API lấy danh sách giao dịch kèm bộ lọc
  const fetchTransactions = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = { ...filters, page, size: 10 };
      const response = await transactionAPI.getTransactions(params);
      
      // Hỗ trợ cả 2 dạng trả về từ API (phân trang hoặc mảng thuần)
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

  // Xử lý khi thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  // 3. Xử lý Xóa mềm giao dịch & Cơ chế Hoàn tác trong 5 giây
  const handleDeleteClick = (txnId) => {
    setDeletedTxnId(txnId);
    
    // Gọi API xóa mềm ngay lập tức (BE tự động hoàn tiền vào ví)
    transactionAPI.deleteTransaction(txnId).then(() => {
      // Cập nhật lại danh sách trên UI bằng cách lọc bỏ giao dịch vừa xóa
      setTransactions(prev => prev.filter(t => t.id !== txnId));
      
      // Hiển thị thanh Toast kèm nút Hoàn tác đếm ngược
      setToastMessage({
        id: txnId,
        text: "Đã xóa giao dịch thành công. Hoàn lại số dư ví."
      });

      // Đặt bộ đếm 5 giây để xóa vĩnh viễn trên Toast
      const timer = setTimeout(() => {
        setToastMessage(null);
        setDeletedTxnId(null);
      }, 5000);
      
      setUndoTimeout(timer);
    }).catch(err => {
      console.error("Lỗi xóa giao dịch:", err);
    });
  };

  // 4. Xử lý bấm nút "Hoàn tác" trên Toast
  const handleUndoDelete = async () => {
    if (!deletedTxnId) return;
    try {
      if (undoTimeout) clearTimeout(undoTimeout);
      
      // Gọi API khôi phục
      await transactionAPI.restoreTransaction(deletedTxnId);
      
      // Tải lại danh sách giao dịch
      fetchTransactions(pagination.page);
      
      setToastMessage(null);
      setDeletedTxnId(null);
    } catch (error) {
      console.error("Lỗi hoàn tác:", error);
    }
  };

  // 5. Xuất CSV
  const handleExport = async () => {
    try {
      await transactionAPI.exportCSV(filters);
    } catch (error) {
      console.error("Lỗi xuất file CSV:", error);
    }
  };

  if (isLoading && !transactions.length) {
    return (
      <div className="w-full min-h-screen bg-[#0F111A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#161822] font-sans flex flex-col overflow-hidden text-white relative">
      <Header user={user} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <div className="flex flex-1 overflow-y-auto custom-scrollbar flex-col bg-[#0F111A]">
          <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full">
            
            {/* Tiêu đề trang & Các nút thao tác nhanh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">Quản lý giao dịch</h2>
                <p className="text-gray-400 text-sm">Theo dõi toàn bộ lịch sử thu chi, lọc dữ liệu và xuất báo cáo.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-[#1a1c24] hover:bg-[#252836] border border-[#2d3142] text-gray-200 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  <Download size={18} /> Xuất CSV
                </button>
                <button 
                  onClick={() => setModalConfig({
                    isOpen: true,
                    title: "Thêm giao dịch thủ công",
                    message: "Form thêm giao dịch sẽ được tích hợp tại đây.",
                    isDanger: false,
                    icon: Plus,
                    onConfirm: closeModal
                  })}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Plus size={18} /> Thêm giao dịch
                </button>
              </div>
            </div>

            {/* Thanh Bộ lọc đa điều kiện */}
            <form onSubmit={applyFilters} className="bg-[#1a1c24] border border-[#2d3142] p-5 rounded-3xl mb-8 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Từ ngày</label>
                <input 
                  type="date" 
                  name="from"
                  value={filters.from}
                  onChange={handleFilterChange}
                  className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Đến ngày</label>
                <input 
                  type="date" 
                  name="to"
                  value={filters.to}
                  onChange={handleFilterChange}
                  className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Loại giao dịch</label>
                <select 
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="">Tất cả (Thu / Chi)</option>
                  <option value="expense">Khoản chi</option>
                  <option value="income">Khoản thu</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tìm kiếm ghi chú</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input 
                    type="text" 
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    placeholder="VD: Ăn phở, cafe..."
                    className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Filter size={16} /> Lọc
                </button>
                <button 
                  type="button"
                  onClick={() => { setFilters({ from: '', to: '', type: '', wallet: '', q: '' }); fetchTransactions(1); }}
                  className="bg-[#252836] hover:bg-[#2d3142] text-gray-400 px-3 py-2.5 rounded-xl text-sm transition-all"
                  title="Đặt lại bộ lọc"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Bảng danh sách giao dịch */}
            <div className="bg-[#1a1c24] border border-[#2d3142] rounded-3xl shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2d3142] text-gray-400 text-xs uppercase tracking-wider bg-[#181920]/50">
                      <th className="py-4 px-6 font-semibold">Thời gian</th>
                      <th className="py-4 px-6 font-semibold">Ghi chú</th>
                      <th className="py-4 px-6 font-semibold">Loại</th>
                      <th className="py-4 px-6 font-semibold text-right">Số tiền</th>
                      <th className="py-4 px-6 font-semibold text-center">Nguồn</th>
                      <th className="py-4 px-6 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3142]/50 text-sm">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-gray-500">
                          Không tìm thấy giao dịch nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-[#252836]/40 transition-colors">
                          <td className="py-4 px-6 text-gray-300 whitespace-nowrap">
                            {new Date(txn.txn_date).toLocaleDateString('vi-VN')} {new Date(txn.txn_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-6 font-medium text-white">
                            {txn.note || 'Không có ghi chú'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              txn.type === 'income' 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {txn.type === 'income' ? 'Thu nhập' : 'Khoản chi'}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                            txn.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {txn.type === 'income' ? '+' : '-'}{Number(txn.amount).toLocaleString('vi-VN')} {user?.currency || 'VND'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs bg-[#252836] text-gray-300 px-2.5 py-1 rounded-md uppercase">
                              {txn.source || 'manual'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleDeleteClick(txn.id)}
                                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-all"
                                title="Xóa giao dịch"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Thanh phân trang (Pagination) */}
              <div className="py-4 px-6 border-t border-[#2d3142] flex items-center justify-between text-sm text-gray-400 bg-[#181920]/30">
                <span>Trang <strong className="text-white">{pagination.page}</strong> / {pagination.total_pages} (Tổng số: {pagination.total} giao dịch)</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fetchTransactions(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 bg-[#252836] hover:bg-[#2d3142] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => fetchTransactions(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="p-2 bg-[#252836] hover:bg-[#2d3142] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* Thanh Toast thông báo Hoàn tác trong 5 giây */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1c24] border border-blue-500/30 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium text-white">{toastMessage.text}</p>
            <p className="text-xs text-gray-400">Bạn có thể hoàn tác trong vòng 5 giây.</p>
          </div>
          <button 
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer shrink-0"
          >
            <RotateCcw size={14} /> Hoàn tác
          </button>
        </div>
      )}

      {/* Modal xác nhận chung */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isDanger={modalConfig.isDanger}
        icon={modalConfig.icon}
        confirmText="Đồng ý"
        cancelText="Đóng"
        onConfirm={modalConfig.onConfirm}
        onCancel={closeModal}
      />
    </div>
  );
};

export default Transactions;