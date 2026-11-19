import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, PiggyBank,
  Wallet, History, PlusCircle, RefreshCw, LogOut, X, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

export default function SavingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [extendValue, setExtendValue] = useState(3);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [goalRes, walletRes] = await Promise.all([
        axios.get(`${API_BASE}/savings/${id}`, { headers }),
        axios.get(`${API_BASE}/wallets/me`, { headers }).catch(() => null),
      ]);

      if (goalRes?.data) {
        setGoal(goalRes.data);
      }
      if (walletRes?.data?.balance != null) {
        setWalletBalance(Number(walletRes.data.balance));
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết mục tiêu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const getDueDate = (createdAtStr, durationValue, period) => {
    if (!createdAtStr) return null;
    const date = new Date(createdAtStr);
    if (period === 'nam') {
      date.setFullYear(date.getFullYear() + Number(durationValue));
    } else {
      date.setMonth(date.getMonth() + Number(durationValue));
    }
    return date;
  };

  // Nộp tiền vào hũ (gọi đúng endpoint /savings/${id}/deposit)
  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) return;

    if (amount > walletBalance) {
      alert('Số dư ví không đủ để nộp!');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post(
        `${API_BASE}/savings/${id}/deposit`,
        { amount },
        { headers }
      );

      setShowDepositModal(false);
      setDepositAmount('');
      await fetchDetail();
    } catch (error) {
      console.error('Lỗi nộp tiền:', error);
      alert(error?.response?.data?.detail || 'Nộp tiền vào hũ thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  // Gia hạn mục tiêu
  const handleExtendGoal = async (e) => {
    e.preventDefault();
    const addedDuration = Number(extendValue);
    if (!addedDuration || addedDuration <= 0) {
      alert('Vui lòng nhập thời gian gia hạn lớn hơn 0!');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const nextDuration = Number(goal.duration_value || 0) + addedDuration;
      await axios.put(
        `${API_BASE}/savings/${id}`,
        { duration_value: nextDuration },
        { headers }
      );

      setShowExtendModal(false);
      setExtendValue(3);
      alert(`Đã gia hạn thành công thêm ${addedDuration} ${goal.period === 'thang' ? 'tháng' : 'năm'}!`);
      await fetchDetail();
    } catch (error) {
      console.error('Lỗi gia hạn:', error);
      alert(error?.response?.data?.detail || 'Gia hạn mục tiêu thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  // Dừng & Rút tiền về ví -> current_amount về 0, status = 'cancelled', cộng ví & tạo giao dịch type = 'income'
  const handleStopAndWithdraw = async () => {
    const currentAmt = Number(goal.current_amount || 0);
    const confirmMsg = `Bạn có chắc muốn hủy mục tiêu "${goal.name}" không?\n\nSố tiền ${currentAmt.toLocaleString('vi-VN')} đ đã tích lũy sẽ được chuyển về Ví chính (ghi nhận giao dịch Thu nhập) và mục tiêu chuyển sang trạng thái Đã hủy.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post(`${API_BASE}/savings/${id}/withdraw`, {}, { headers });

      alert(`Đã rút ${currentAmt.toLocaleString('vi-VN')} đ về ví chính và hủy mục tiêu!`);
      await fetchDetail();
    } catch (error) {
      console.error('Lỗi rút tiền và hủy mục tiêu:', error);
      alert(error?.response?.data?.detail || 'Không thể rút tiền và hủy mục tiêu lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-20 text-gray-400">
        Không tìm thấy thông tin mục tiêu tiết kiệm.
      </div>
    );
  }

  const now = new Date();
  const current = Number(goal.current_amount || 0);
  const percent = Math.min(100, Math.round((current / goal.target_amount) * 100));
  const dueDate = getDueDate(goal.created_at, goal.duration_value, goal.period);
  const isCancelled = goal.status === 'cancelled';
  const isCompleted = !isCancelled && (goal.status === 'completed' || percent >= 100);
  const isExpired = !isCancelled && !isCompleted && dueDate && dueDate < now;
  const isOverBalance = Number(depositAmount) > walletBalance;

  const statusBadge = isCancelled
    ? { label: 'Đã hủy', cls: 'bg-gray-500/10 border-gray-500/30 text-gray-400' }
    : isCompleted
      ? { label: 'Đã hoàn thành', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
      : isExpired
        ? { label: 'Quá hạn', cls: 'bg-rose-500/10 border-rose-500/30 text-rose-400' }
        : { label: 'Đang tích lũy', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-400' };

  return (
    <div className="w-full min-h-screen text-white space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/savings')}
          className="p-2.5 bg-[#181B26] hover:bg-[#252A3A] border border-[#2E3448] rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{goal.name}</h1>
          <p className="text-gray-400 text-xs mt-0.5">Chi tiết tiến độ & lịch sử đóng góp</p>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#181B26] p-6 rounded-2xl border border-[#2E3448] space-y-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-3 border rounded-2xl ${statusBadge.cls}`}>
                <PiggyBank size={28} />
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Mục tiêu tiết kiệm</span>
                <h2 className="text-xl font-bold">{goal.name}</h2>
              </div>
            </div>

            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 bg-[#0F111A] p-4 rounded-xl border border-[#2E3448]">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tỉ lệ hoàn thành</span>
              <span className="font-bold text-blue-400">{percent}%</span>
            </div>
            <div className="w-full bg-[#181B26] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#2E3448]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isCancelled ? 'bg-gray-600' :
                  isCompleted ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  isExpired ? 'bg-gradient-to-r from-rose-600 to-red-500' :
                  'bg-gradient-to-r from-blue-600 to-indigo-500'
                }`}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>

          {/* Money Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-[#0F111A] p-4 rounded-xl border border-[#2E3448]">
              <p className="text-xs text-gray-400 mb-1">Đã tích lũy</p>
              <p className="text-lg font-extrabold text-emerald-400">{current.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="bg-[#0F111A] p-4 rounded-xl border border-[#2E3448]">
              <p className="text-xs text-gray-400 mb-1">Mục tiêu</p>
              <p className="text-lg font-extrabold text-white">{goal.target_amount.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="bg-[#0F111A] p-4 rounded-xl border border-[#2E3448] col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Còn thiếu</p>
              <p className="text-lg font-extrabold text-rose-400">
                {Math.max(0, goal.target_amount - current).toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isCancelled ? (
            <button
              disabled
              className="w-full py-3.5 bg-[#0F111A] text-gray-500 font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#2E3448] cursor-not-allowed"
            >
              <LogOut size={18} /> Mục tiêu đã hủy
            </button>
          ) : isExpired ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={submitting}
                onClick={() => setShowExtendModal(true)}
                className="py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                <RefreshCw size={18} /> Gia hạn mục tiêu
              </button>
              <button
                disabled={submitting}
                onClick={handleStopAndWithdraw}
                className="py-3.5 bg-[#252A3A] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut size={18} /> Dừng & Rút tiền về ví
              </button>
            </div>
          ) : isCompleted ? (
            <button
              disabled
              className="w-full py-3.5 bg-[#0F111A] text-gray-500 font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#2E3448] cursor-not-allowed"
            >
              <CheckCircle2 size={18} /> Mục tiêu đã hoàn thành
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                disabled={submitting}
                onClick={() => setShowDepositModal(true)}
                className="sm:col-span-2 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <PlusCircle size={18} /> Nạp thêm tiền
              </button>
              <button
                disabled={submitting}
                onClick={handleStopAndWithdraw}
                className="py-3.5 bg-[#252A3A] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut size={18} /> Dừng mục tiêu
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Lịch Sử */}
        <div className="bg-[#181B26] p-6 rounded-2xl border border-[#2E3448] flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#2E3448]">
              <History className="text-blue-400" size={20} />
              <h3 className="font-bold text-lg">Lịch Sử Nạp Tiền</h3>
            </div>

            {!goal.contributions || goal.contributions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nạp tiền nào.</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {goal.contributions.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3.5 bg-[#0F111A] rounded-xl border border-[#2E3448] hover:border-blue-500/30 transition"
                  >
                    <div>
                      <p className="font-semibold text-emerald-400 text-sm">
                        +{item.amount.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(item.contributed_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Thành công
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL NỘP TIỀN */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-[#090A0F]/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#181B26] p-6 sm:p-7 rounded-2xl w-full max-w-md border border-[#2E3448] shadow-2xl relative">
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition p-1 bg-[#252A3A] hover:bg-[#31384D] rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <Wallet size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Nộp Tiền Vào Hũ</h2>
                <p className="text-xs text-gray-400">Trích tiền từ ví chính để hoàn thành mục tiêu</p>
              </div>
            </div>

            <div className="bg-[#0F111A] p-4 rounded-xl border border-[#2E3448] mb-5 space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span className="font-medium">Nguồn thanh toán</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">Ví chính <ArrowUpRight size={12} /></span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-gray-300">Số dư khả dụng</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {walletBalance.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">
                  Số tiền muốn nộp (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="10000"
                    placeholder="VD: 500000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={`w-full bg-[#0F111A] border rounded-xl p-3.5 text-white focus:outline-none text-base font-bold transition ${
                      isOverBalance ? 'border-rose-500/80 focus:border-rose-500' : 'border-[#2E3448] focus:border-blue-500'
                    }`}
                  />
                  {depositAmount && (
                    <span className="absolute right-4 top-4 text-xs font-medium text-gray-400">đ</span>
                  )}
                </div>

                {isOverBalance && (
                  <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle size={13} /> Số dư ví không đủ để nộp số tiền này!
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-2">Chọn nhanh số tiền:</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[500000, 1000000, 2000000, 5000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="py-2 bg-[#0F111A] hover:bg-[#252A3A] border border-[#2E3448] hover:border-blue-500/50 text-gray-300 hover:text-white rounded-lg transition font-medium text-[11px] cursor-pointer"
                    >
                      +{(amt / 1000000) >= 1 ? `${amt / 1000000}Tr` : `${amt / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 bg-[#252A3A] hover:bg-[#31384D] text-gray-300 py-3 rounded-xl font-medium text-sm transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || isOverBalance || !depositAmount}
                  className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#181B26] disabled:text-gray-500 text-white py-3 rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận nộp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gia Hạn */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-[#090A0F]/85 flex items-center justify-center p-4 z-50">
          <div className="bg-[#181B26] p-6 sm:p-7 rounded-2xl w-full max-w-md border border-[#2E3448] shadow-2xl relative">
            <button onClick={() => setShowExtendModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2 text-rose-400">
              <RefreshCw size={24} />
              <h2 className="text-xl font-bold text-white">Gia Hạn Mục Tiêu</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Mục tiêu: <span className="text-white font-semibold">{goal.name}</span>
            </p>

            <form onSubmit={handleExtendGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">
                  Cộng thêm thời gian ({goal.period === 'thang' ? 'Tháng' : 'Năm'})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={extendValue}
                  onChange={(e) => setExtendValue(e.target.value)}
                  className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-rose-500 rounded-xl p-3.5 text-white focus:outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="flex-1 bg-[#252A3A] text-gray-300 py-3 rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white py-3 rounded-xl font-semibold cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận gia hạn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}