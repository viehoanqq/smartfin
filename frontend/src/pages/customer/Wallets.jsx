import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, PlusCircle, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownLeft, History, Calendar, DollarSign, Sparkles, X, AlertCircle 
} from 'lucide-react';

export default function Wallets() {
  // Mock dữ liệu Ví chính
  const [wallet, setWallet] = useState({
    id: 1,
    name: "Ví Thu Nhập Chính",
    balance: 15500000,
    total_income_month: 25000000,
    total_expense_month: 9500000
  });

  // Lịch sử biến động số dư ví
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      type: "income",
      title: "Lương tháng 10/2026",
      amount: 20000000,
      created_at: "2026-10-01T08:00:00Z",
      note: "Chuyển khoản từ công ty"
    },
    {
      id: 2,
      type: "income",
      title: "Thu nhập làm thêm (Freelance)",
      amount: 5000000,
      created_at: "2026-10-05T14:30:00Z",
      note: "Thanh toán dự án Java Spring Boot"
    },
    {
      id: 3,
      type: "expense",
      title: "Nộp tiền vào hũ mua iPhone 16",
      amount: 4500000,
      created_at: "2026-10-10T09:15:00Z",
      note: "Trích tiết kiệm"
    },
    {
      id: 4,
      type: "expense",
      title: "Chi tiêu tiền nhà & ăn uống",
      amount: 5000000,
      created_at: "2026-10-15T18:20:00Z",
      note: "Chi tiêu sinh hoạt"
    }
  ]);

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeNote, setIncomeNote] = useState('');

  // Xử lý nạp thu nhập mới vào ví
  const handleAddIncome = (e) => {
    e.preventDefault();
    const amount = Number(incomeAmount);
    if (!amount || amount <= 0) return;

    // Cập nhật số dư ví
    setWallet(prev => ({
      ...prev,
      balance: prev.balance + amount,
      total_income_month: prev.total_income_month + amount
    }));

    // Bổ sung vào lịch sử
    const newTx = {
      id: Date.now(),
      type: "income",
      title: incomeTitle || "Nhập thu nhập đầu tháng",
      amount: amount,
      created_at: new Date().toISOString(),
      note: incomeNote || "Nạp tiền vào ví"
    };

    setTransactions(prev => [newTx, ...prev]);

    // Reset Form
    setShowIncomeModal(false);
    setIncomeAmount('');
    setIncomeTitle('');
    setIncomeNote('');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full min-h-screen text-white space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <WalletIcon size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Ví Của Tôi</h1>
            <p className="text-gray-400 text-sm mt-0.5">Quản lý nguồn thu nhập và tổng số dư tài chính</p>
          </div>
        </div>

        <button
          onClick={() => setShowIncomeModal(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
        >
          <PlusCircle size={18} /> Nhập thu nhập mới
        </button>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thẻ Ví chính (Hero Card) */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#1e2330] via-[#222736] to-[#1a1d29] p-7 rounded-2xl border border-[#252836] shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Main Wallet
                </span>
                <span className="text-gray-400 text-sm font-medium">{wallet.name}</span>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Đang hoạt động
              </span>
            </div>

            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Số Dư Khả Dụng Hiện Tại</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {wallet.balance.toLocaleString('vi-VN')} <span className="text-lg font-normal text-emerald-400">VNĐ</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-[#252836]">
            <div className="bg-[#141721]/80 p-3.5 rounded-xl border border-[#252836]">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <TrendingUp size={14} className="text-emerald-400" /> Tổng thu nhập tháng này
              </div>
              <p className="text-base font-extrabold text-emerald-400">
                +{wallet.total_income_month.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div className="bg-[#141721]/80 p-3.5 rounded-xl border border-[#252836]">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <TrendingDown size={14} className="text-rose-400" /> Tổng trích/chi tháng này
              </div>
              <p className="text-base font-extrabold text-rose-400">
                -{wallet.total_expense_month.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>
        </div>

        {/* Thẻ gợi ý / Hướng dẫn quản lý */}
        <div className="bg-[#1e2330] p-6 rounded-2xl border border-[#252836] flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 pb-3 border-b border-[#252836]">
              <Sparkles size={20} />
              <h3 className="font-bold text-base text-white">Quy Tắc Đầu Tháng</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Mỗi khi nhận lương hoặc thu nhập mới, hãy cập nhật ngay vào Ví chính để hệ thống tính toán ngân sách chi tiêu và phân bổ vào các hũ tiết kiệm chính xác nhất.
            </p>
          </div>

          <div className="bg-[#141721] p-4 rounded-xl border border-[#252836] mt-4 space-y-2">
            <p className="text-[11px] text-gray-400 font-semibold uppercase">Mẹo Quản Lý</p>
            <p className="text-xs text-gray-300">
              Áp dụng nguyên tắc <span className="text-blue-400 font-bold">Pay Yourself First</span>: Trích ngay 10% - 20% thu nhập nộp vào các Hũ tiết kiệm trước khi bắt đầu chi tiêu sinh hoạt.
            </p>
          </div>
        </div>
      </div>

      {/* Lịch Sử Biến Động Số Dư (Transactions) */}
      <div className="bg-[#1e2330] p-6 rounded-2xl border border-[#252836] shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-[#252836]">
          <div className="flex items-center gap-2">
            <History className="text-blue-400" size={20} />
            <h3 className="font-bold text-lg text-white">Lịch Sử Biến Động Số Dư</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">Cập nhật theo thời gian thực</span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Chưa có giao dịch biến động số dư nào.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-4 bg-[#141721] hover:bg-[#181c28] rounded-xl border border-[#252836] transition duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl border ${
                    tx.type === 'income' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {tx.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{tx.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tx.note} • <span className="text-gray-500">{formatDate(tx.created_at)}</span></p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-extrabold text-base ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                  </p>
                  <span className="text-[10px] text-gray-400 bg-[#1e2330] px-2 py-0.5 rounded border border-[#252836]">
                    {tx.type === 'income' ? 'Thu nhập' : 'Trích tiền/Chi tiêu'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nhập Thu Nhập Mới / Nạp Tiền Vào Ví */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] p-6 sm:p-8 rounded-2xl w-full max-w-md border border-[#2d3345] shadow-2xl relative">
            <button
              onClick={() => setShowIncomeModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition p-1 hover:bg-[#252836] rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <WalletIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nhập Thu Nhập Mới</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cộng thêm tiền vào Ví chính của bạn</p>
              </div>
            </div>

            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">
                  Số tiền thu nhập (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  min="10000"
                  placeholder="VD: 15000000"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="w-full bg-[#141721] border border-[#2d3345] focus:border-emerald-500 rounded-xl p-3.5 text-white focus:outline-none text-base font-bold transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">
                  Tên khoản thu nhập
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Lương tháng 10, Thu nhập làm thêm..."
                  value={incomeTitle}
                  onChange={(e) => setIncomeTitle(e.target.value)}
                  className="w-full bg-[#141721] border border-[#2d3345] focus:border-emerald-500 rounded-xl p-3.5 text-white focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">
                  Ghi chú thêm (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="VD: Nhận qua tài khoản Vietcombank"
                  value={incomeNote}
                  onChange={(e) => setIncomeNote(e.target.value)}
                  className="w-full bg-[#141721] border border-[#2d3345] focus:border-emerald-500 rounded-xl p-3.5 text-white focus:outline-none text-sm"
                />
              </div>

              {/* Các chip chọn nhanh số tiền */}
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-2">Chọn nhanh số tiền:</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[5000000, 10000000, 15000000, 20000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setIncomeAmount(amt.toString())}
                      className="py-2 bg-[#141721] hover:bg-[#252836] border border-[#2d3345] hover:border-emerald-500/50 text-gray-300 hover:text-white rounded-lg transition font-medium text-[11px]"
                    >
                      +{amt / 1000000}Tr
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="flex-1 bg-[#252836] hover:bg-[#2d3345] text-gray-300 py-3 rounded-xl font-medium text-sm transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  Xác nhận cộng tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}