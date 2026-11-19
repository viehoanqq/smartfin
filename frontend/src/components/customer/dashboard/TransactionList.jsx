import React, { useEffect, useState, useMemo } from 'react';
import {
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
  PiggyBank,
  Receipt,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import TransactionDetailModal from '../transactions/TransactionDetailModal';

const API_BASE = 'http://localhost:8000/api/v1';
const PAGE_SIZE = 10;

const getTxnDateSource = (txn) => txn?.created_at || txn?.create_at || txn?.txn_date;

const toLocalISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [invoiceTxn, setInvoiceTxn] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const now = new Date();
        const firstDayOfMonth = toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
        const lastDayOfMonth = toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

        const fetchAllMonthPages = async () => {
          const batchSize = 100;
          let page = 1;
          let totalPagesFromApi = 1;
          const allItems = [];

          do {
            const res = await axios.get(`${API_BASE}/transactions`, {
              headers,
              params: {
                from: firstDayOfMonth,
                to: lastDayOfMonth,
                page,
                size: batchSize,
              },
            });

            const data = res?.data;
            const items = Array.isArray(data)
              ? data
              : (data?.items || data?.data || data?.transactions || []);

            allItems.push(...items);

            if (!Array.isArray(data) && data?.total_pages) {
              totalPagesFromApi = Number(data.total_pages) || 1;
            } else if (!Array.isArray(data) && typeof data?.total === 'number') {
              totalPagesFromApi = Math.max(1, Math.ceil(data.total / batchSize));
            } else if (items.length < batchSize) {
              break;
            }

            page += 1;
          } while (page <= totalPagesFromApi);

          return allItems;
        };

        const [rawTxns, catRes] = await Promise.all([
          fetchAllMonthPages(),
          axios.get(`${API_BASE}/categories`, { headers }).catch(() => ({ data: [] })),
        ]);

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthTxns = rawTxns
          .filter((txn) => {
            const rawDate = getTxnDateSource(txn);
            if (!rawDate) return true;
            const d = new Date(rawDate);
            if (Number.isNaN(d.getTime())) return true;
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .sort((a, b) => new Date(getTxnDateSource(b)) - new Date(getTxnDateSource(a)));

        setTransactions(currentMonthTxns);
        setCurrentPage(1);
        if (currentMonthTxns.length > 0) {
          setSelectedId(currentMonthTxns[0].id);
        } else {
          setSelectedId(null);
        }

        if (Array.isArray(catRes?.data)) {
          const map = {};
          catRes.data.forEach((c) => {
            map[c.id] = c.name;
          });
          setCategoriesMap(map);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách giao dịch thật:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return transactions.slice(start, start + PAGE_SIZE);
  }, [transactions, currentPage]);

  const getTypeConfig = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'income') {
      return {
        label: 'Thu nhập',
        Icon: ArrowDown,
        iconStyle: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
        amountStyle: 'text-emerald-400',
        badgeStyle: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      };
    }
    if (t === 'saving') {
      return {
        label: 'Tiết kiệm',
        Icon: PiggyBank,
        iconStyle: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
        amountStyle: 'text-blue-400',
        badgeStyle: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
      };
    }
    if (t === 'expense') {
      return {
        label: 'Chi tiêu',
        Icon: ArrowUp,
        iconStyle: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
        amountStyle: 'text-rose-400',
        badgeStyle: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
      };
    }
    return {
      label: type || 'Khác',
      Icon: Receipt,
      iconStyle: 'bg-gray-500/10 border-gray-700 text-gray-400',
      amountStyle: 'text-gray-200',
      badgeStyle: 'bg-gray-500/10 border-gray-700 text-gray-300',
    };
  };

  const formatDateAndTime = (rawDate) => {
    if (!rawDate) return { dateStr: '--', timeStr: '--' };
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return { dateStr: String(rawDate), timeStr: '' };
    return {
      dateStr: d.toLocaleDateString('vi-VN'),
      timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const formatSourceLabel = (source) => {
    const s = String(source || '').toLowerCase();
    if (!s || s === 'manual') return 'Thủ công';
    if (s === 'ai' || s === 'nlp') return 'AI';
    if (s === 'system') return 'Hệ thống';
    return source;
  };

  const formatSignedAmount = (txn) => {
    const absAmt = Math.abs(Number(txn.amount || 0));
    const formatted = absAmt.toLocaleString('vi-VN');
    const t = String(txn.type || '').toLowerCase();
    const prefix = t === 'income' ? '+' : '-';
    return `${prefix}${formatted} ₫`;
  };

  const currentMonthLabel = new Date().toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Giao dịch trong {currentMonthLabel}</h3>
        <MoreHorizontal size={20} className="text-gray-500 cursor-pointer" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-[#252836]/40 rounded-2xl border border-gray-800">
          Chưa có giao dịch nào trong tháng này.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paginatedTransactions.map((trx) => {
              const { label, Icon, iconStyle, amountStyle, badgeStyle } = getTypeConfig(trx.type);
              const isActive = selectedId === trx.id;
              const title =
                trx.note ||
                trx.raw_text ||
                categoriesMap[trx.category_id] ||
                `Giao dịch #${trx.id}`;
              const dateSource = getTxnDateSource(trx);
              const { dateStr, timeStr } = formatDateAndTime(dateSource);
              const sourceLabel = formatSourceLabel(trx.source);

              return (
                <div
                  key={trx.id}
                  onClick={() => setSelectedId(trx.id)}
                  className={`grid grid-cols-12 items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer ${
                    isActive ? 'bg-[#252836]' : 'hover:bg-[#252836]/50'
                  }`}
                >
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center ${iconStyle}`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="font-medium text-white truncate">{title}</span>
                  </div>

                  <div className="hidden sm:block sm:col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Date</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm text-gray-200">{dateStr}</span>
                      {timeStr && <span className="text-xs text-gray-400">{timeStr}</span>}
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Loại</p>
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="hidden lg:block lg:col-span-1">
                    <p className="text-xs text-gray-500 mb-1">Nguồn</p>
                    <span className="inline-block text-xs font-medium text-gray-300 bg-[#181920] border border-gray-800 px-2.5 py-0.5 rounded-lg">
                      {sourceLabel}
                    </span>
                  </div>

                  <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                    <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                    <p className={`text-sm font-semibold whitespace-nowrap ${amountStyle}`}>
                      {formatSignedAmount(trx)}
                    </p>
                  </div>

                  <div className="col-span-3 sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(trx.id);
                        setInvoiceTxn(trx);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                          : 'text-gray-400 border border-gray-700 hover:bg-gray-800'
                      }`}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 pt-4 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
              <span>
                Trang <strong className="text-white">{currentPage}</strong> /{' '}
                <strong className="text-white">{totalPages}</strong> ({transactions.length} giao dịch)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg bg-[#181920] border border-gray-800 text-gray-300 hover:bg-[#252836] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg font-semibold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#181920] border border-gray-800 text-gray-300 hover:bg-[#252836]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg bg-[#181920] border border-gray-800 text-gray-300 hover:bg-[#252836] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {invoiceTxn && (
        <TransactionDetailModal
          txn={invoiceTxn}
          categories={categoriesMap}
          onClose={() => setInvoiceTxn(null)}
        />
      )}
    </div>
  );
};

export default TransactionList;