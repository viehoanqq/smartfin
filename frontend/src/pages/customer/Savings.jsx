import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  PiggyBank, Plus, Clock, Target, Sparkles, X, 
  AlertCircle, CheckCircle2, RefreshCw, Wallet, Ban 
} from 'lucide-react';

export default function Savings() {
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'expired', 'completed', 'cancelled'
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'thang', 'nam'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states cho tạo hũ mới
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [durationValue, setDurationValue] = useState(1);
  const [period, setPeriod] = useState('nam');

  // Lấy dữ liệu thật từ Backend FastAPI
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get('http://localhost:8000/api/v1/savings', { headers });
      
      if (Array.isArray(response.data)) {
        setGoals(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setGoals(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi tải mục tiêu tiết kiệm:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
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

  // Phân loại và Sắp xếp từ dữ liệu thật
  const categorizedGoals = useMemo(() => {
    const now = new Date();
    const sorted = [...goals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const activeList = [];
    const expiredList = [];
    const completedList = [];
    const cancelledList = [];

    sorted.forEach((goal) => {
      if (periodFilter !== 'all' && goal.period !== periodFilter) {
        return;
      }

      const rawStatus = (goal.status || '').toLowerCase();
      const current = goal.current_amount || 0;
      const isCancelled = rawStatus === 'cancelled' || rawStatus === 'failed';
      const isCompleted = !isCancelled && (rawStatus === 'completed' || current >= goal.target_amount);
      const dueDate = getDueDate(goal.created_at, goal.duration_value, goal.period);
      const isExpired = !isCancelled && !isCompleted && dueDate && dueDate < now;

      if (isCancelled) {
        cancelledList.push({ ...goal, computedStatus: 'cancelled' });
      } else if (isCompleted) {
        completedList.push({ ...goal, computedStatus: 'completed' });
      } else if (isExpired) {
        expiredList.push({ ...goal, computedStatus: 'expired' });
      } else {
        activeList.push({ ...goal, computedStatus: 'active' });
      }
    });

    return {
      active: activeList,
      expired: expiredList,
      completed: completedList,
      cancelled: cancelledList,
    };
  }, [goals, periodFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post('http://localhost:8000/api/v1/savings', {
        name,
        target_amount: Number(targetAmount),
        period,
        duration_value: Number(durationValue),
      }, { headers });

      setShowModal(false);
      setName('');
      setTargetAmount('');
      setDurationValue(1);
      setPeriod('nam');
      fetchGoals();
    } catch (error) {
      console.error('Lỗi tạo mục tiêu:', error);
      alert('Tạo mục tiêu thất bại!');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const currentDisplayGoals = categorizedGoals[activeTab] || [];

  // Tính số tiền cần tiết kiệm hàng tháng dự kiến trong Modal
  const calculatedMonthlySaving = useMemo(() => {
    const target = Number(targetAmount) || 0;
    const duration = Number(durationValue) || 1;
    if (target <= 0 || duration <= 0) return 0;
    const totalMonths = period === 'nam' ? duration * 12 : duration;
    return Math.round(target / totalMonths);
  }, [targetAmount, durationValue, period]);

  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full text-white relative space-y-6">
      
      {/* Header Bar - Đồng bộ chuẩn kích thước với trang Giao dịch */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <PiggyBank size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Mục Tiêu Tiết Kiệm</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Quản lý các hũ tích lũy tài chính và theo dõi tiến độ</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} /> Tạo mục tiết kiệm
        </button>
      </div>

      {/* Tabs Filter theo Trạng thái & Chu kỳ - Canh lề chuẩn */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#252836] gap-4 pb-3">
        {/* Tab Trạng thái */}
        <div className="flex flex-wrap gap-2 sm:gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock size={16} /> Đang tích lũy ({categorizedGoals.active.length})
          </button>

          <button
            onClick={() => setActiveTab('expired')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === 'expired'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <AlertCircle size={16} /> Quá hạn ({categorizedGoals.expired.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle2 size={16} /> Đã hoàn thành ({categorizedGoals.completed.length})
          </button>

          <button
            onClick={() => setActiveTab('cancelled')}
            className={`pb-1 px-2 flex items-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === 'cancelled'
                ? 'border-gray-400 text-gray-200 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Ban size={16} /> Đã hủy ({categorizedGoals.cancelled.length})
          </button>
        </div>

        {/* Sub-Filter: Phân loại Theo Tháng / Theo Năm */}
        <div className="flex items-center gap-1.5 bg-[#141721] p-1 rounded-xl border border-[#252836] text-xs self-start md:self-auto">
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
              periodFilter === 'all'
                ? 'bg-[#252836] text-white shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setPeriodFilter('thang')}
            className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
              periodFilter === 'thang'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Theo Tháng
          </button>
          <button
            onClick={() => setPeriodFilter('nam')}
            className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
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
                        goal.computedStatus === 'cancelled' ? 'bg-gray-500/10 border-gray-500/20 text-gray-400' :
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

                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                      goal.computedStatus === 'cancelled'
                        ? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        : goal.computedStatus === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : goal.computedStatus === 'expired'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      {goal.computedStatus === 'cancelled' ? 'Đã hủy' :
                       goal.computedStatus === 'completed' ? 'Đã hoàn thành' :
                       goal.computedStatus === 'expired' ? 'Quá hạn' : 'Đang tích lũy'}
                    </span>
                  </div>

                  {/* Tiến độ */}
                  <div className="my-5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Tiến độ</span>
                      <span className={`font-bold text-sm ${
                        goal.computedStatus === 'cancelled' ? 'text-gray-400' :
                        goal.computedStatus === 'completed' ? 'text-emerald-400' :
                        goal.computedStatus === 'expired' ? 'text-rose-400' : 'text-blue-400'
                      }`}>{percent}%</span>
                    </div>
                    <div className="w-full bg-[#141721] h-3 rounded-full overflow-hidden p-0.5 border border-[#252836]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          goal.computedStatus === 'cancelled'
                            ? 'bg-gray-600'
                            : goal.computedStatus === 'completed'
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

                {goal.computedStatus === 'active' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/savings/${goal.id}`); }}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <Wallet size={16} /> Nạp tiền
                  </button>
                )}

                {goal.computedStatus === 'expired' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/savings/${goal.id}`); }}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    <RefreshCw size={16} /> Gia hạn mục tiêu
                  </button>
                )}

                {goal.computedStatus === 'completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/savings/${goal.id}`); }}
                    className="w-full py-2.5 bg-[#252836] hover:bg-[#2e3346] text-gray-200 hover:text-white border border-[#32374a] rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    Đã hoàn thành
                  </button>
                )}

                {goal.computedStatus === 'cancelled' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/savings/${goal.id}`); }}
                    className="w-full py-2.5 bg-[#141721] hover:bg-[#1a1e2b] text-gray-400 border border-[#252836] rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Ban size={15} /> Đã hủy
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
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"><X size={20} /></button>
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
                  placeholder="32000000"
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
                    className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl p-3.5 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="thang">Tháng</option>
                    <option value="nam">Năm</option>
                  </select>
                </div>
              </div>

              {/* Box hiển thị gợi ý số tiền tiết kiệm hàng tháng */}
              {calculatedMonthlySaving > 0 && (
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-medium">Cần tiết kiệm dự kiến:</span>
                  <span className="text-sm font-bold text-blue-400">
                    {calculatedMonthlySaving.toLocaleString('vi-VN')} đ / tháng
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-[#252836] hover:bg-[#31384D] text-gray-300 py-3 rounded-xl font-medium transition cursor-pointer">Hủy</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-semibold transition cursor-pointer">Tạo mục tiêu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}