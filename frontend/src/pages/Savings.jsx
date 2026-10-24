import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavings, createSavingGoal } from '../api/savingsAPI';
import { 
  PiggyBank, Plus, Clock, Target, Sparkles, X, 
  AlertCircle, CheckCircle2, RefreshCw, Wallet, CalendarDays 
} from 'lucide-react';

export default function Savings() {
  const navigate = useNavigate();

  // Mock Data test giao diện
  const [goals, setGoals] = useState([
    {
      id: 1,
      name: "Mua iPhone 18 Pro Max",
      target_amount: 35000000,
      current_amount: 24500000,
      duration_value: 1,
      period: "thang",
      status: "active",
      created_at: "2026-09-10T08:30:00Z" // Quá hạn
    },
    {
      id: 2,
      name: "Du lịch Nhật Bản",
      target_amount: 50000000,
      current_amount: 50000000,
      duration_value: 1,
      period: "nam",
      status: "completed",
      created_at: "2026-01-10T10:15:00Z" // Đã hoàn thành
    },
    {
      id: 3,
      name: "Mua xe máy mới",
      target_amount: 45000000,
      current_amount: 12000000,
      duration_value: 12,
      period: "thang",
      status: "active",
      created_at: "2026-09-01T14:20:00Z" // Đang tích lũy (Tháng)
    },
    {
      id: 4,
      name: "Quỹ mua nhà đất",
      target_amount: 1000000000,
      current_amount: 250000000,
      duration_value: 5,
      period: "nam",
      status: "active",
      created_at: "2026-02-01T09:00:00Z" // Đang tích lũy (Năm)
    }
  ]);

  const [activeTab, setActiveTab] = useState('active'); // 'active', 'expired', 'completed'
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'thang', 'nam'
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form states cho tạo hũ mới
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [durationValue, setDurationValue] = useState(6);
  const [period, setPeriod] = useState('thang');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await getSavings();
      if (data) setGoals(data);
    } catch (error) {
      console.error('Lỗi tải mục tiêu tiết kiệm:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Bỏ comment khi chạy API thật từ Database
    // fetchGoals();
  }, []);

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

  // Phân loại và Sắp xếp
  const categorizedGoals = useMemo(() => {
    const now = new Date();
    const sorted = [...goals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const activeList = [];
    const expiredList = [];
    const completedList = [];

    sorted.forEach((goal) => {
      // Áp dụng bộ lọc Theo Tháng / Theo Năm
      if (periodFilter !== 'all' && goal.period !== periodFilter) {
        return;
      }

      const current = goal.current_amount || 0;
      const isCompleted = goal.status === 'completed' || current >= goal.target_amount;
      const dueDate = getDueDate(goal.created_at, goal.duration_value, goal.period);
      const isExpired = !isCompleted && goal.status !== 'failed' && dueDate && dueDate < now;

      if (isCompleted) {
        completedList.push({ ...goal, computedStatus: 'completed' });
      } else if (isExpired) {
        expiredList.push({ ...goal, computedStatus: 'expired' });
      } else if (goal.status === 'active') {
        activeList.push({ ...goal, computedStatus: 'active' });
      }
    });

    return { active: activeList, expired: expiredList, completed: completedList };
  }, [goals, periodFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createSavingGoal({
        name,
        target_amount: Number(targetAmount),
        period,
        duration_value: Number(durationValue),
      });
      setShowModal(false);
      setName('');
      setTargetAmount('');
      setDurationValue(6);
      setPeriod('thang');
      fetchGoals();
    } catch (error) {
      alert('Tạo mục tiêu thất bại!');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const currentDisplayGoals = categorizedGoals[activeTab] || [];

  return (
    <div className="w-full min-h-screen text-white space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <PiggyBank size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Mục Tiêu Tiết Kiệm</h1>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          <Plus size={18} /> Tạo mục tiết kiệm
        </button>
      </div>

      {/* Tabs Filter theo Trạng thái & Chu kỳ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#252836] gap-4 pb-3">
        {/* Tab Trạng thái */}
        <div className="flex gap-2 sm:gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock size={16} /> Đang tích lũy ({categorizedGoals.active.length})
          </button>

          <button
            onClick={() => setActiveTab('expired')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 ${
              activeTab === 'expired'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <AlertCircle size={16} /> Quá hạn ({categorizedGoals.expired.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 ${
              activeTab === 'completed'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle2 size={16} /> Đã hoàn thành ({categorizedGoals.completed.length})
          </button>
        </div>

        {/* Sub-Filter: Phân loại Theo Tháng / Theo Năm */}
        <div className="flex items-center gap-1.5 bg-[#141721] p-1 rounded-xl border border-[#252836] text-xs self-start md:self-auto">
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              periodFilter === 'all'
                ? 'bg-[#252836] text-white shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setPeriodFilter('thang')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              periodFilter === 'thang'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Theo Tháng
          </button>
          <button
            onClick={() => setPeriodFilter('nam')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              periodFilter === 'nam'
                ? 'bg-purple-600/30 text-purple-400 border border-purple-500/30 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Theo Năm
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500"></div>
        </div>
      ) : currentDisplayGoals.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-16 px-4 bg-[#1e2330]/40 rounded-2xl border border-[#252836] border-dashed text-center">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
            <Sparkles size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Không tìm thấy mục tiêu nào phù hợp
          </h3>
          <p className="text-gray-400 text-sm">
            Thử chuyển bộ lọc theo Tháng/Năm hoặc tạo thêm mục tiêu tiết kiệm mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentDisplayGoals.map((goal) => {
            const current = goal.current_amount || 0;
            const percent = Math.min(100, Math.round((current / goal.target_amount) * 100));
            const dueDate = getDueDate(goal.created_at, goal.duration_value, goal.period);

            return (
              <div
                key={goal.id}
                onClick={() => navigate(`/savings/${goal.id}`)}
                className="cursor-pointer group relative bg-[#1e2330] hover:bg-[#222736] p-6 rounded-2xl border border-[#252836] hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl"
              >
                <div>
                  {/* Card Header & Badges */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        goal.computedStatus === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        goal.computedStatus === 'expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        <Target size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                          {goal.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Hạn: {formatDate(dueDate)}
                          </span>
                          <span>•</span>
                          {/* Tag hiển thị Tháng / Năm */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            goal.period === 'nam' 
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}>
                            {goal.duration_value} {goal.period === 'nam' ? 'Năm' : 'Tháng'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge trạng thái */}
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                      goal.computedStatus === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : goal.computedStatus === 'expired'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      {goal.computedStatus === 'completed' ? 'Đã hoàn thành' :
                       goal.computedStatus === 'expired' ? 'Quá hạn' : 'Đang tích lũy'}
                    </span>
                  </div>

                  {/* Tiến độ */}
                  <div className="my-5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Tiến độ</span>
                      <span className={`font-bold text-sm ${
                        goal.computedStatus === 'completed' ? 'text-emerald-400' :
                        goal.computedStatus === 'expired' ? 'text-rose-400' : 'text-blue-400'
                      }`}>{percent}%</span>
                    </div>
                    <div className="w-full bg-[#141721] h-3 rounded-full overflow-hidden p-0.5 border border-[#252836]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          goal.computedStatus === 'completed'
                            ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                            : goal.computedStatus === 'expired'
                            ? 'bg-gradient-to-r from-rose-600 to-red-500'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Chi tiết tiền */}
                  <div className="grid grid-cols-2 gap-3 bg-[#141721] p-3.5 rounded-xl border border-[#252836]/60 mb-6">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Hiện có</p>
                      <p className="font-extrabold text-emerald-400 text-base">{current.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span></p>
                    </div>
                    <div className="text-right border-l border-[#252836] pl-3">
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Mục tiêu</p>
                      <p className="font-extrabold text-gray-200 text-base">{goal.target_amount.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span></p>
                    </div>
                  </div>
                </div>

                {/* Nút nhấn chuyển hướng sang chi tiết */}
                {goal.computedStatus === 'active' && (
                  <button
                    onClick={() => navigate(`/savings/${goal.id}`)}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-500/20"
                  >
                    <Wallet size={16} /> Nạp tiền
                  </button>
                )}

                {goal.computedStatus === 'expired' && (
                  <button
                    onClick={() => navigate(`/savings/${goal.id}`)}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-rose-500/20"
                  >
                    <RefreshCw size={16} /> Gia hạn mục tiêu
                  </button>
                )}

                {goal.computedStatus === 'completed' && (
                  <button
                    onClick={() => navigate(`/savings/${goal.id}`)}
                    className="w-full py-2.5 bg-[#252836] hover:bg-[#2e3346] text-gray-200 hover:text-white border border-[#32374a] rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition"
                  >
                    Đã hoàn thành
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tạo Mục Tiêu Mới */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] p-6 sm:p-8 rounded-2xl w-full max-w-md border border-[#252836] shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white"><X size={20} /></button>
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <PiggyBank size={24} />
              <h2 className="text-xl font-bold text-white">Tạo Mục Tiêu Mới</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">Tên mục tiêu</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua xe máy, Đổi iPhone..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">Số tiền mục tiêu (VNĐ)</label>
                <input
                  type="number"
                  required
                  placeholder="30000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">Thời hạn</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5 uppercase tracking-wider">Đơn vị</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none"
                  >
                    <option value="thang">Tháng</option>
                    <option value="nam">Năm</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-[#252836] text-gray-300 py-3 rounded-xl font-medium">Hủy</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold">Tạo mục tiêu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}