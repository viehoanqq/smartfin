import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  Eye,
  Trash2,
  X,
  RefreshCw,
  Calendar,
  Layers,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const API_ADMIN_TX_URL = 'http://localhost:8000/api/v1/transactions/admin';

const formatVND = (val) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const extractErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && detail.message) return detail.message;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');
  }
  return err?.response?.data?.message || err?.message || fallback;
};

const detectKind = (tx) => {
  const raw = String(tx?.type || tx?.transaction_type || '').toLowerCase();
  if (raw === 'saving' || raw === 'savings' || raw === 'goal') return 'saving';
  if (raw === 'income' || raw === 'thu' || raw === 'deposit' || raw === 'refund') return 'income';
  if (raw === 'expense' || raw === 'chi' || raw === 'withdraw') return 'expense';
  return Number(tx?.amount) >= 0 ? 'income' : 'expense';
};

const resolveCategoryName = (tx) =>
  tx?.category_name ||
  tx?.category?.name ||
  (typeof tx?.category === 'string' ? tx.category : null) ||
  (tx?.category_id ? `Danh mục #${tx.category_id}` : 'Chi tiêu');

const buildKindDisplay = (tx, kind) => {
  if (kind === 'expense') {
    return {
      label: resolveCategoryName(tx),
      badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      amountClass: 'text-rose-400',
      sign: '-',
    };
  }
  if (kind === 'saving') {
    return {
      label: 'Tiết kiệm',
      badgeClass: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
      amountClass: 'text-sky-400',
      sign: '',
    };
  }
  return {
    label: 'Thu nhập',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amountClass: 'text-emerald-400',
    sign: '+',
  };
};

const normalizeTransaction = (tx) => {
  const kind = detectKind(tx);
  const kindMeta = buildKindDisplay(tx, kind);

  const userLabel =
    tx?.user_email ||
    tx?.user?.email ||
    tx?.user_name ||
    tx?.user?.full_name ||
    (tx?.user_id ? `User #${tx.user_id}` : '—');

  const timestamp =
    tx?.occurred_at ||
    tx?.transaction_date ||
    tx?.create_at ||
    tx?.created_at ||
    tx?.date ||
    null;

  return {
    ...tx,
    _userLabel: String(userLabel),
    _titleLabel: tx?.description || tx?.note || tx?.title || 'Giao dịch',
    _timestamp: timestamp,
    _kind: kind,
    _kindLabel: kindMeta.label,
    _badgeClass: kindMeta.badgeClass,
    _amountClass: kindMeta.amountClass,
    _sign: kindMeta.sign,
    _absAmount: Math.abs(Number(tx?.amount) || 0),
  };
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense' | 'saving'

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailTx, setDetailTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get(`${API_ADMIN_TX_URL}/all`, {
        headers: getAuthHeaders(),
      });
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
      setTransactions(rawList.map(normalizeTransaction));
    } catch (err) {
      console.error('Lỗi tải danh sách giao dịch:', err);
      setTransactions([]);
      setErrorMsg(extractErrorMessage(err, 'Không thể tải danh sách giao dịch từ máy chủ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx._kind === 'income') {
        totalIncome += tx._absAmount;
      } else if (tx._kind === 'expense') {
        totalExpense += tx._absAmount;
      }
    });

    return {
      count: transactions.length,
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx._kind !== typeFilter) return false;

      if (!kw) return true;
      return (
        tx._userLabel.toLowerCase().includes(kw) ||
        tx._titleLabel.toLowerCase().includes(kw) ||
        tx._kindLabel.toLowerCase().includes(kw) ||
        String(tx.id || '').toLowerCase().includes(kw)
      );
    });
  }, [transactions, search, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`${API_ADMIN_TX_URL}/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });
      if (detailTx?.id === deleteTarget.id) setDetailTx(null);
      setDeleteTarget(null);
      await fetchTransactions();
    } catch (err) {
      console.error('Lỗi xóa giao dịch:', err);
      alert(extractErrorMessage(err, 'Không thể xóa giao dịch.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <ArrowLeftRight size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Quản Lý Giao Dịch</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Giám sát dòng tiền thu - chi, tiết kiệm và lịch sử giao dịch của người dùng
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTransactions}
          title="Tải lại danh sách"
          className="inline-flex items-center gap-2 rounded-xl bg-[#141721] hover:bg-[#252836] border border-[#252836] px-4 py-2.5 text-sm font-medium text-gray-200 hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Thông báo lỗi API */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={fetchTransactions}
            className="shrink-0 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Tổng giao dịch</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.count}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Tổng thu</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatVND(summary.totalIncome)}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Tổng chi</p>
            <p className="text-xl font-bold text-rose-400 mt-1">{formatVND(summary.totalExpense)}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Chênh lệch ròng</p>
            <p
              className={`text-xl font-bold mt-1 ${
                summary.netFlow >= 0 ? 'text-teal-300' : 'text-amber-400'
              }`}
            >
              {summary.netFlow >= 0 ? '+' : '-'}
              {formatVND(Math.abs(summary.netFlow))}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
            <ArrowLeftRight size={20} />
          </div>
        </div>
      </div>

      {/* Bộ lọc & tìm kiếm */}
      <div className="bg-[#1e2330]/80 border border-[#252836] rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo nội dung, người dùng, loại/danh mục hoặc ID..."
            className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Mọi loại giao dịch</option>
            <option value="income">Thu nhập</option>
            <option value="expense">Chi tiêu (Theo danh mục)</option>
            <option value="saving">Tiết kiệm</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>
      </div>

      {/* Bảng giao dịch */}
      <div className="bg-[#1e2330] border border-[#252836] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            {errorMsg ? 'Chưa có dữ liệu do lỗi kết nối API.' : 'Không có giao dịch nào phù hợp.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#141721] border-b border-[#252836] text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-4">STT</th>
                    <th className="py-3.5 px-4">Nội dung / Ghi chú</th>
                    <th className="py-3.5 px-4">Người dùng</th>
                    <th className="py-3.5 px-4">Loại</th>
                    <th className="py-3.5 px-4">Số tiền</th>
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252836] text-sm">
                  {paginatedTransactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-[#252836]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-400">
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white truncate max-w-xs">{tx._titleLabel}</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">{tx._userLabel}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${tx._badgeClass}`}
                        >
                          {tx._kindLabel}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-bold whitespace-nowrap ${tx._amountClass}`}>
                        {tx._sign}
                        {formatVND(tx._absAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(tx._timestamp)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailTx(tx)}
                            title="Xem chi tiết"
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#141721] transition cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(tx)}
                            title="Xóa giao dịch"
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thanh phân trang */}
            <div className="px-4 py-3.5 bg-[#141721]/60 border-t border-[#252836] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
              <span>
                Hiển thị {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, filteredTransactions.length)} trên tổng{' '}
                {filteredTransactions.length} giao dịch
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e2330] border border-[#252836] text-gray-200 hover:bg-[#252836] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Trước</span>
                </button>

                {Array.from({ length: totalPages }, (_, pageIdx) => pageIdx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg border font-medium transition cursor-pointer ${
                      pageNum === safePage
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#1e2330] border-[#252836] text-gray-300 hover:bg-[#252836]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e2330] border border-[#252836] text-gray-200 hover:bg-[#252836] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <span>Sau</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal chi tiết giao dịch */}
      {detailTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#252836] pb-3.5">
              <div>
                <h2 className="text-lg font-bold text-white">Chi tiết giao dịch #{detailTx.id}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Loại: {detailTx._kindLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTx(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2.5 text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <FileText size={15} className="text-blue-400 shrink-0" />
                <span>{detailTx._titleLabel}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-emerald-400 shrink-0" />
                <span>{detailTx._userLabel}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Layers size={15} className="text-teal-300 shrink-0" />
                <span>Loại: {detailTx._kindLabel}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-purple-400 shrink-0" />
                <span>Thời gian: {formatDateTime(detailTx._timestamp)}</span>
              </div>
            </div>

            <div className="bg-[#141721] border border-[#252836] rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase font-semibold">Số tiền</span>
              <span className={`text-base font-extrabold ${detailTx._amountClass}`}>
                {detailTx._sign}
                {formatVND(detailTx._absAmount)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailTx(null)}
                className="px-4 py-2 rounded-xl bg-[#252836] hover:bg-[#31384d] text-sm font-medium text-gray-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Xóa giao dịch #{deleteTarget.id}?</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa giao dịch "{deleteTarget._titleLabel}"? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#252836] hover:bg-[#31384d] text-sm font-medium text-gray-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}