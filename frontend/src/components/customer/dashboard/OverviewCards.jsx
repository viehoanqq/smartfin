import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

const toLocalISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCompactVND = (amount) => {
  const val = Number(amount || 0);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
  return `${val}`;
};

const OverviewCards = () => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [topExpense, setTopExpense] = useState({
    label: 'Chưa có dữ liệu',
    totalAmount: 0,
    weeklyAvg: 0,
    weeklySeries: [0, 0, 0, 0],
  });

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const now = new Date();
        const firstDayOfMonth = toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
        const lastDayOfMonth = toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

        const [walletRes, txnRes, catRes] = await Promise.all([
          axios.get(`${API_BASE}/wallets/me`, { headers }).catch((e) => {
            console.error('Lỗi tải ví:', e);
            return null;
          }),
          axios
            .get(`${API_BASE}/transactions`, {
              headers,
              params: {
                type: 'expense',
                from: firstDayOfMonth,
                to: lastDayOfMonth,
                page: 1,
                size: 100,
              },
            })
            .catch((e) => {
              console.error('Lỗi tải giao dịch chi tiêu:', e);
              return null;
            }),
          axios.get(`${API_BASE}/categories`, { headers }).catch((e) => {
            console.error('Lỗi tải danh mục:', e);
            return null;
          }),
        ]);

        if (walletRes?.data) {
          const initial = Number(walletRes.data.initial_balance || 0);
          const current = Number(walletRes.data.balance || 0);
          setTotalIncome(initial);
          setTotalExpense(Math.max(0, initial - current));
        }

        const categoriesMap = {};
        const rawCats = Array.isArray(catRes?.data)
          ? catRes.data
          : catRes?.data?.items || catRes?.data?.data || [];
        rawCats.forEach((c) => {
          categoriesMap[c.id] = c.name;
        });

        const rawTxns = Array.isArray(txnRes?.data)
          ? txnRes.data
          : txnRes?.data?.items || txnRes?.data?.data || txnRes?.data?.transactions || [];

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const expenseTxns = rawTxns.filter((t) => {
          if (String(t.type || '').toLowerCase() !== 'expense') return false;
          const rawDate = t.created_at || t.create_at || t.txn_date;
          if (!rawDate) return true;
          const d = new Date(rawDate);
          if (Number.isNaN(d.getTime())) return true;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        if (expenseTxns.length > 0) {
          const grouped = {};

          expenseTxns.forEach((t) => {
            const catName = t.category_id != null ? categoriesMap[t.category_id] : null;
            const key =
              t.category_id != null
                ? `cat_${t.category_id}`
                : `note_${(t.note || 'Chi tiêu khác').trim()}`;
            const label = catName || t.note || `Danh mục #${t.category_id ?? ''}`;

            if (!grouped[key]) {
              grouped[key] = { label, total: 0, weeks: [0, 0, 0, 0] };
            }

            const amt = Math.abs(Number(t.amount || 0));
            grouped[key].total += amt;

            const rawDate = t.created_at || t.create_at || t.txn_date;
            const d = rawDate ? new Date(rawDate) : now;
            const dayOfMonth = Number.isNaN(d.getTime()) ? now.getDate() : d.getDate();
            const weekIdx = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
            grouped[key].weeks[weekIdx] += amt;
          });

          const topItem = Object.values(grouped).sort((a, b) => b.total - a.total)[0];
          if (topItem) {
            setTopExpense({
              label: topItem.label,
              totalAmount: topItem.total,
              weeklyAvg: Math.round(topItem.total / 4),
              weeklySeries: topItem.weeks,
            });
          }
        } else {
          setTopExpense({
            label: 'Chưa có dữ liệu',
            totalAmount: 0,
            weeklyAvg: 0,
            weeklySeries: [0, 0, 0, 0],
          });
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu tổng quan thu chi:', err);
      }
    };

    fetchOverviewData();
  }, []);

  const maxWeekVal = Math.max(...topExpense.weeklySeries, 1);
  const chartPoints = topExpense.weeklySeries.map((val, idx) => {
    const x = idx * (500 / 3);
    const y = topExpense.totalAmount > 0 ? 80 - (val / maxWeekVal) * 60 : 65;
    return { x, y };
  });

  const linePath =
    chartPoints.length === 4
      ? `M${chartPoints[0].x},${chartPoints[0].y} L${chartPoints[1].x},${chartPoints[1].y} L${chartPoints[2].x},${chartPoints[2].y} L${chartPoints[3].x},${chartPoints[3].y}`
      : 'M0,70 L500,70';

  const areaPath = `${linePath} L500,150 L0,150 Z`;
  const highlightPoint = chartPoints[2] || { x: 333, y: 50 };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {/* Thẻ 2: Chi tiêu nhiều nhất */}
      <div className="h-[260px] bg-[#252836] rounded-[32px] p-7 flex flex-col justify-between relative overflow-hidden border border-[#2d3142]/40 shadow-xl">
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <TrendingUp size={16} />
            </div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Chi tiêu nhiều nhất
            </span>
          </div>
          <MoreHorizontal size={18} className="text-gray-500 cursor-pointer hover:text-white" />
        </div>

        <div className="absolute inset-x-0 bottom-12 h-20 pointer-events-none opacity-40">
          <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chart-gradient)" />
          </svg>
        </div>

        <div className="relative z-10 w-full my-2">
          <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-12 overflow-visible">
            <path
              d={linePath}
              fill="none"
              stroke="#a3e635"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={highlightPoint.x} cy={highlightPoint.y} r="4" fill="#a3e635" />
            <circle
              cx={highlightPoint.x}
              cy={highlightPoint.y}
              r="8"
              fill="#a3e635"
              fillOpacity="0.25"
              className="animate-ping"
            />
          </svg>
          <div className="absolute top-2 right-4 bg-[#a3e635]/15 text-[#a3e635] text-[10px] px-2.5 py-1 rounded-md font-bold border border-[#a3e635]/30 shadow-sm">
            {formatCompactVND(topExpense.totalAmount)}
          </div>
        </div>

        <div className="flex justify-between items-end z-10 gap-2">
          <div className="min-w-0">
            <p className="text-gray-400 text-xs font-medium mb-1 truncate">{topExpense.label}</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                {topExpense.totalAmount.toLocaleString('vi-VN')}
              </h3>
              <span className="text-xs font-semibold text-gray-400">₫</span>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-gray-400 font-medium bg-[#1e2330] px-2.5 py-1 rounded-lg border border-[#2d3142]">
            TB {formatCompactVND(topExpense.weeklyAvg)} / tuần
          </span>
        </div>
      </div>

      {/* Thẻ 1: Tổng quan thu chi */}
      <div className="h-[260px] bg-[#252836] rounded-[32px] p-7 relative overflow-hidden flex flex-col justify-between border border-[#2d3142]/40 shadow-xl">
        <div className="z-10 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Tổng thu</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {totalIncome.toLocaleString('vi-VN')}
              </h3>
              <span className="text-sm font-bold text-blue-400">₫</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="z-10 border-t border-gray-700/40 pt-4 flex justify-between items-end">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Tổng chi</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-bold text-gray-100 tracking-tight">
                {totalExpense.toLocaleString('vi-VN')}
              </h3>
              <span className="text-xs font-bold text-rose-400">₫</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ArrowDownRight size={18} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-30 pointer-events-none">
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="wave-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0,100 C80,140 120,40 200,80 C280,120 320,20 400,50 L400,150 L0,150 Z"
              fill="url(#wave-grad-blue)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default OverviewCards;