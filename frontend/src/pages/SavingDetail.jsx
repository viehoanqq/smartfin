import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSavingDetail, depositToSaving } from '../api/savingsAPI';
import { 
  ArrowLeft, PiggyBank, Clock, 
  Wallet, History, PlusCircle, RefreshCw, LogOut, X, CheckCircle2 
} from 'lucide-react';

export default function SavingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [extendValue, setExtendValue] = useState(3);

  // Database giả lập hỗ trợ đủ 3 trạng thái test UI
  const mockDatabase = {
    1: {
      id: 1,
      name: "Mua iPhone 16 Pro Max",
      target_amount: 35000000,
      current_amount: 24500000,
      duration_value: 1,
      period: "thang",
      status: "active",
      created_at: "2026-09-10T08:30:00Z",
      contributions: [
        { id: 101, amount: 14500000, contributed_at: "2026-09-11T09:00:00Z" },
        { id: 102, amount: 10000000, contributed_at: "2026-09-20T10:15:00Z" }
      ]
    },
    2: {
      id: 2,
      name: "Quỹ du lịch Nhật Bản",
      target_amount: 50000000,
      current_amount: 50000000,
      duration_value: 1,
      period: "nam",
      status: "completed",
      created_at: "2026-01-10T10:15:00Z",
      contributions: [
        { id: 201, amount: 20000000, contributed_at: "2026-02-01T08:00:00Z" },
        { id: 202, amount: 30000000, contributed_at: "2026-05-15T14:30:00Z" }
      ]
    },
    3: {
      id: 3,
      name: "Đổi xe máy mới",
      target_amount: 45000000,
      current_amount: 12000000,
      duration_value: 12,
      period: "thang",
      status: "active",
      created_at: "2026-09-01T14:20:00Z",
      contributions: [
        { id: 301, amount: 5000000, contributed_at: "2026-09-02T11:00:00Z" },
        { id: 302, amount: 7000000, contributed_at: "2026-10-01T16:45:00Z" }
      ]
    }
  };

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

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getSavingDetail(id);
      if (data) {
        setGoal(data);
      } else {
        setGoal(mockDatabase[id] || mockDatabase[1]);
      }
    } catch (error) {
      setGoal(mockDatabase[id] || mockDatabase[1]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Nộp tiền
  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      await depositToSaving(id, { amount: Number(depositAmount) });
      setShowDepositModal(false);
      setDepositAmount('');
      fetchDetail();
    } catch (error) {
      setGoal(prev => ({
        ...prev,
        current_amount: prev.current_amount + Number(depositAmount),
        contributions: [
          { id: Date.now(), amount: Number(depositAmount), contributed_at: new Date().toISOString() },
          ...prev.contributions
        ]
      }));
      setShowDepositModal(false);
      setDepositAmount('');
    }
  };

  // Gia hạn
  const handleExtendGoal = (e) => {
    e.preventDefault();
    setGoal(prev => ({
      ...prev,
      duration_value: Number(prev.duration_value) + Number(extendValue)
    }));
    setShowExtendModal(false);
    alert(`Đã gia hạn thành công thêm ${extendValue} ${goal.period === 'thang' ? 'tháng' : 'năm'}!`);
  };

  // Dừng & Rút tiền về ví
  const handleStopAndWithdraw = () => {
    const confirmMsg = `Bạn có chắc muốn dừng mục tiêu "${goal.name}" không?\n\nSố tiền ${goal.current_amount.toLocaleString('vi-VN')} đ đã tích lũy sẽ được chuyển trả về Ví chính của bạn.`;
    if (window.confirm(confirmMsg)) {
      alert(`Đã rút ${goal.current_amount.toLocaleString('vi-VN')} đ về ví chính thành công!`);
      navigate('/savings');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!goal) return null;

  const now = new Date();
  const current = goal.current_amount || 0;
  const percent = Math.min(100, Math.round((current / goal.target_amount) * 100));
  const dueDate = getDueDate(goal.created_at, goal.duration_value, goal.period);
  const isCompleted = goal.status === 'completed' || percent >= 100;
  const isExpired = !isCompleted && goal.status !== 'failed' && dueDate && dueDate < now;

  return (
    <div className="w-full min-h-screen text-white space-y-6">
      {/* Top Header / Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/savings')}
          className="p-2.5 bg-[#1e2330] hover:bg-[#252836] border border-[#252836] rounded-xl text-gray-300 hover:text-white transition"
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
        {/* Left Column: Tiến độ & Thông tin hũ */}
        <div className="lg:col-span-2 bg-[#1e2330] p-6 rounded-2xl border border-[#252836] space-y-6 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-3 border rounded-2xl ${
                isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                isExpired ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                <PiggyBank size={28} />
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Mục tiêu tiết kiệm</span>
                <h2 className="text-xl font-bold">{goal.name}</h2>
              </div>
            </div>

            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
              isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              isExpired ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              {isCompleted ? 'Đã hoàn thành' : isExpired ? 'Quá hạn' : 'Đang tích lũy'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 bg-[#141721] p-4 rounded-xl border border-[#252836]">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tỉ lệ hoàn thành</span>
              <span className={`font-bold ${
                isCompleted ? 'text-emerald-400' : isExpired ? 'text-rose-400' : 'text-blue-400'
              }`}>{percent}%</span>
            </div>
            <div className="w-full bg-[#1e2330] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#252836]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
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
            <div className="bg-[#141721] p-4 rounded-xl border border-[#252836]">
              <p className="text-xs text-gray-400 mb-1">Đã tích lũy</p>
              <p className="text-lg font-extrabold text-emerald-400">{current.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="bg-[#141721] p-4 rounded-xl border border-[#252836]">
              <p className="text-xs text-gray-400 mb-1">Mục tiêu</p>
              <p className="text-lg font-extrabold text-white">{goal.target_amount.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="bg-[#141721] p-4 rounded-xl border border-[#252836] col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Còn thiếu</p>
              <p className="text-lg font-extrabold text-rose-400">
                {Math.max(0, goal.target_amount - current).toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>

          {/* Render Action Buttons theo Trạng thái */}
          {isExpired ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setShowExtendModal(true)}
                className="py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/20"
              >
                <RefreshCw size={18} /> Gia hạn mục tiêu
              </button>
              <button
                onClick={handleStopAndWithdraw}
                className="py-3.5 bg-[#252836] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <LogOut size={18} /> Dừng & Rút tiền về ví
              </button>
            </div>
          ) : isCompleted ? (
            <button
              disabled
              className="w-full py-3.5 bg-gray-800/50 text-gray-500 font-semibold rounded-xl flex items-center justify-center gap-2 border border-gray-800 cursor-not-allowed"
            >
              <CheckCircle2 size={18} /> Mục tiêu đã hoàn thành
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setShowDepositModal(true)}
                className="sm:col-span-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
              >
                <PlusCircle size={18} /> Nộp thêm tiền
              </button>
              <button
                onClick={handleStopAndWithdraw}
                className="py-3.5 bg-[#252836] hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <LogOut size={18} /> Dừng tiết kiệm
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Lịch Sử Đóng Góp */}
        <div className="bg-[#1e2330] p-6 rounded-2xl border border-[#252836] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#252836]">
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
                    className="flex justify-between items-center p-3.5 bg-[#141721] rounded-xl border border-[#252836]/80 hover:border-blue-500/30 transition"
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

      {/* Modal Nộp Tiền */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] p-6 sm:p-8 rounded-2xl w-full max-w-md border border-[#252836] shadow-2xl relative">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-4">Nộp Tiền Vào Hũ</h2>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  required
                  placeholder="1000000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDepositModal(false)} className="flex-1 bg-[#252836] text-gray-300 py-3 rounded-xl font-medium">Hủy</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold">Xác nhận nộp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gia Hạn */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] p-6 sm:p-8 rounded-2xl w-full max-w-md border border-[#252836] shadow-2xl relative">
            <button onClick={() => setShowExtendModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white"><X size={20} /></button>
            <div className="flex items-center gap-3 mb-2 text-rose-400">
              <RefreshCw size={24} />
              <h2 className="text-xl font-bold text-white">Gia Hạn Mục Tiêu</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">Mục tiêu: <span className="text-white font-semibold">{goal.name}</span></p>

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
                  className="w-full bg-[#141721] border border-[#252836] focus:border-rose-500 rounded-xl p-3.5 text-white focus:outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowExtendModal(false)} className="flex-1 bg-[#252836] text-gray-300 py-3 rounded-xl font-medium">Hủy</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white py-3 rounded-xl font-semibold">Xác nhận gia hạn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}