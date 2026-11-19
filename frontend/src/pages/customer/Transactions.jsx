import React, { useState, useEffect } from 'react';
import { 
  Plus, Download, 
  RotateCcw, AlertTriangle, Loader2, X, Wallet, Tag, Clock, FileText, Sparkles, Receipt, Activity
} from 'lucide-react';
import { userAPI } from '../../services/userAPI';
import { transactionAPI } from '../../services/transactionAPI';
import TransactionModal from '../../components/customer/dashboard/TransactionModal';
import TransactionFilters from '../../components/customer/transactions/TransactionFilters'; 
import TransactionDetailModal from '../../components/customer/transactions/TransactionDetailModal'; 
import TransactionTable from '../../components/customer/transactions/TransactionTable';
import axios from 'axios';

const Transactions = () => {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0, total_pages: 1 });
  
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    category_id: '',
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
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        const userRes = await userAPI.getMe();
        setUser(userRes);

        try {
          const catRes = await axios.get('http://localhost:8000/api/v1/categories', { headers });
          if (Array.isArray(catRes.data)) {
            const catMap = {};
            catRes.data.forEach(cat => {
              catMap[cat.id] = cat.name;
            });
            setCategories(catMap);
          }
        } catch (err) {
          console.error("Không tải được danh mục thật:", err);
        }

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
      } else if (Array.isArray(response)) {
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
    const emptyFilters = { from: '', to: '', category_id: '', q: '' };
    setActiveRange('');
    setFilters(emptyFilters);
    fetchTransactions(1, emptyFilters);
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
        text: "Đã xóa khoản chi thành công. Hoàn lại số dư ví."
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
      <div className="w-full flex-1 flex items-center justify-center bg-[#0F111A] min-h-[400px]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full text-white relative space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Activity size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Giao Dịch</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Theo dõi lịch sử và tiếm kiếm các khoản chi tiêu</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#252A3A] hover:bg-[#31384D] border border-[#3A425A] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <button 
            onClick={() => { setEditingTxn(null); setIsFormModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} /> Thêm giao dịch
          </button>
        </div>
      </div>

      <TransactionFilters 
        filters={filters}
        activeRange={activeRange}
        onFilterChange={handleFilterChange}
        onQuickDateRange={handleQuickDateRange}
        onApply={applyFilters}
        onReset={handleResetFilters}
      />

      {/* Component Bảng danh sách giao dịch */}
      <TransactionTable 
        transactions={transactions}
        categories={categories}
        userCurrency={user?.currency}
        pagination={pagination}
        onPageChange={(newPage) => fetchTransactions(newPage, filters)}
        onView={(txn) => setViewingTxn(txn)}
        onEdit={(txn) => { setEditingTxn(txn); setIsFormModalOpen(true); }}
        onDelete={(txn) => setDeletingTxn(txn)}
      />

      {/* Modal Thêm / Chỉnh sửa */}
      <TransactionModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => fetchTransactions(pagination.page, filters)}
        editData={editingTxn}
      />

      {/* Modal Xem chi tiết (Sử dụng TransactionDetailModal có sẵn) */}
      <TransactionDetailModal 
        isOpen={!!viewingTxn}
        txn={viewingTxn}
        categories={categories}
        currency={user?.currency}
        onClose={() => setViewingTxn(null)}
        onEdit={(txn) => {
          setViewingTxn(null);
          setEditingTxn(txn);
          setIsFormModalOpen(true);
        }}
      />

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
                Xóa giao dịch
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