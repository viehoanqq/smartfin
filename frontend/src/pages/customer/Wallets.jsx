import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wallet as WalletIcon, TrendingUp, 
  ArrowUpRight, ArrowDownLeft, History, AlertCircle, ShieldCheck, CreditCard 
} from 'lucide-react';

export default function Wallets() {
  const [wallet, setWallet] = useState({
    name: "Ví mặc định",
    balance: 0,
    monthly_income: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get('http://localhost:8000/api/v1/wallets/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setWallet({
          id: response.data.id,
          name: response.data.name || "Ví mặc định",
          balance: response.data.balance || 0,
          monthly_income: response.data.initial_balance || 0
        });

        setLoading(false);
      } catch (err) {
        console.error("Lỗi khi tải thông tin ví:", err);
        setError("Không thể tải thông tin ví. Vui lòng đăng nhập lại.");
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-white">
        <p className="animate-pulse text-blue-400 font-semibold">Đang đồng bộ dữ liệu ví từ hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-white space-y-3">
        <AlertCircle size={40} className="text-rose-400" />
        <p className="text-rose-400 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <WalletIcon size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Ví Của Tôi</h1>
            <p className="text-gray-400 text-sm mt-0.5">Quản lý nguồn thu nhập lương hằng tháng và số dư</p>
          </div>
        </div>

        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Đã đồng bộ lương tháng tự động
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e2330] via-[#222736] to-[#1a1d29] p-7 rounded-2xl border border-[#252836] shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} /> {wallet.name}
                </span>
              </div>
              <ShieldCheck className="text-emerald-400" size={20} />
            </div>

            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Số Dư Khả Dụng Hiện Tại</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {wallet.balance.toLocaleString('vi-VN')} <span className="text-lg font-normal text-emerald-400">VNĐ</span>
            </h2>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1e2330] via-[#222736] to-[#1a1d29] p-7 rounded-2xl border border-[#252836] shadow-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} /> Thu Nhập Hằng Tháng
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Mức Lương Cố Định</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">
              {wallet.monthly_income.toLocaleString('vi-VN')} <span className="text-lg font-normal text-gray-400">VNĐ</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-[#1e2330] p-6 rounded-2xl border border-[#252836] shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-[#252836]">
          <div className="flex items-center gap-2">
            <History className="text-blue-400" size={20} />
            <h3 className="font-bold text-lg text-white">Lịch Sử Giao Dịch & Biến Động</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">Đồng bộ tự động</span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Chưa có giao dịch phát sinh nào trong tháng này.</p>
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
                    {tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}