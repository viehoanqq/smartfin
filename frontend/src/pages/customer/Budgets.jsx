import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, CheckCircle2, 
  Wallet, Tag, Edit3, X 
} from 'lucide-react';

export default function Budget() {
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [editingCategoryIds, setEditingCategoryIds] = useState({});
  const [limitInputs, setLimitInputs] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const priorityOrder = ['nhà ở', 'di chuyển', 'ăn uống', 'mua sắm', 'giải trí', 'sức khỏe'];

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const userRes = await axios.get('http://localhost:8000/api/v1/users/me', { headers });
        if (userRes.data && userRes.data.monthly_income !== undefined) {
          setMonthlyIncome(userRes.data.monthly_income);
        }
      } catch (e) {
        console.log("Không lấy được thông tin lương user, mặc định = 0");
      }

      const catRes = await axios.get('http://localhost:8000/api/v1/categories', { headers });
      if (Array.isArray(catRes.data)) {
        const activeCategories = catRes.data.filter(cat => cat.is_hidden === false);

        activeCategories.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          
          const indexA = priorityOrder.findIndex(p => nameA.includes(p));
          const indexB = priorityOrder.findIndex(p => nameB.includes(p));

          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          
          return indexA - indexB;
        });

        setCategories(activeCategories);
      }

      try {
        const budgetRes = await axios.get('http://localhost:8000/api/v1/budget', { headers });
        if (Array.isArray(budgetRes.data)) {
          setBudgets(budgetRes.data);
        }
      } catch (err) {
        console.log("API Budget chưa có dữ liệu hoặc đang trống.");
        setBudgets([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Lỗi tải dữ liệu Budget:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (categoryId, value) => {
    setLimitInputs(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const toggleEditMode = (categoryId, currentLimit) => {
    setEditingCategoryIds(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    if (!limitInputs[categoryId] && currentLimit) {
      setLimitInputs(prev => ({
        ...prev,
        [categoryId]: currentLimit
      }));
    }
  };

  const handleSaveBudget = async (categoryId) => {
    const amount = limitInputs[categoryId];
    if (!amount || Number(amount) <= 0) {
      alert("Vui lòng nhập số tiền hạn mức hợp lệ!");
      return;
    }

    setSubmittingId(categoryId);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post('http://localhost:8000/api/v1/budget', {
        category_id: categoryId,
        limit_amount: Number(amount),
        period: "monthly"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditingCategoryIds(prev => ({ ...prev, [categoryId]: false }));
      setLimitInputs(prev => ({ ...prev, [categoryId]: '' }));
      setSubmittingId(null);
      fetchData();
    } catch (err) {
      console.error("Lỗi khi lưu budget:", err);
      const errorMsg = err.response?.data?.detail || "Không thể lưu ngân sách. Vui lòng thử lại.";
      alert(errorMsg);
      setSubmittingId(null);
    }
  };

  const getExistingBudget = (categoryId) => {
    return budgets.find(b => b.category_id === categoryId || b.category?.id === categoryId);
  };

  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalRemaining = monthlyIncome - totalLimit;

  return (
    <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full text-white relative space-y-6">
      
      {/* Header Bar - Chuẩn khung kính mờ giao dịch */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Layers size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Ngân Sách Chi Tiêu</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Thiết lập hạn mức chi tiêu trực quan theo thứ tự ưu tiên</p>
          </div>
        </div>

        {/* Khối hiển thị Ngân sách còn lại */}
        <div className="flex items-center gap-3 bg-[#141721] px-5 py-3 rounded-2xl border border-[#2d3142] shadow-inner w-full sm:w-auto justify-between sm:justify-start">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Ngân sách còn lại</span>
            <span className={`text-base font-extrabold ${totalRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {totalRemaining.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÁC DANH MỤC */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Tag size={14} className="text-blue-400" /> Danh Mục & Hạn Mức Chi Tiêu
          </h3>
          <span className="text-xs text-gray-400 font-medium">Sắp xếp theo thứ tự ưu tiên quan trọng</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-[#1e2330]/40 p-12 rounded-2xl border border-[#252836] border-dashed text-center text-gray-400 text-sm">
            Không tìm thấy danh mục nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const existingBudget = getExistingBudget(cat.id);
              const spent = existingBudget?.spent_amount || 0;
              const limit = existingBudget?.limit_amount || 0;
              const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
              const isOver = spent > limit && limit > 0;
              const isEditing = editingCategoryIds[cat.id];

              return (
                <div 
                  key={cat.id}
                  className="bg-[#1e2330] hover:bg-[#222736] p-6 rounded-2xl border border-[#252836] hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl space-y-4 relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl border bg-blue-500/10 border-blue-500/20 text-blue-400">
                          <Tag size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">{cat.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">Quản lý hạn mức chi</p>
                        </div>
                      </div>

                      {existingBudget ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                          <CheckCircle2 size={13} /> Đã thiết lập
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400 bg-[#141721] px-3 py-1 rounded-full border border-[#252836]">
                          Chưa đặt
                        </span>
                      )}
                    </div>

                    {existingBudget && (
                      <div className="bg-[#141721] p-3.5 rounded-xl border border-[#252836]/60 space-y-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-gray-400">Đã dùng: <strong className="text-white">{Number(spent).toLocaleString('vi-VN')} đ</strong></span>
                          <span className="text-blue-400 font-bold">Hạn mức: {Number(limit).toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="w-full bg-[#1e2330] h-3 rounded-full overflow-hidden p-0.5 border border-[#252836]">
                          <div 
                            className={`h-full transition-all duration-700 rounded-full ${isOver ? 'bg-gradient-to-r from-rose-600 to-red-500' : 'bg-gradient-to-r from-blue-600 to-indigo-500'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium pt-1">
                          <span>Tiến độ: {percent}%</span>
                          {isOver && <span className="text-rose-400 font-bold">Vượt hạn mức!</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#252836]">
                    {!isEditing ? (
                      <button
                        onClick={() => toggleEditMode(cat.id, limit)}
                        className="w-full py-2.5 bg-[#141721] hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 border border-[#252836] hover:border-blue-500/40 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Edit3 size={14} /> {existingBudget ? 'Cập nhật' : 'Đặt hạn mức'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              placeholder="Nhập số tiền..."
                              value={limitInputs[cat.id] !== undefined ? limitInputs[cat.id] : (limit || '')}
                              onChange={(e) => handleInputChange(cat.id, e.target.value)}
                              autoFocus
                              className="w-full bg-[#141721] border border-blue-500/60 rounded-xl py-2.5 pl-3 pr-7 text-xs font-semibold text-white placeholder-gray-500 focus:outline-none shadow-inner"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">₫</span>
                          </div>

                          <button
                            onClick={() => handleSaveBudget(cat.id)}
                            disabled={submittingId === cat.id}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            {submittingId === cat.id ? 'Lưu...' : 'Lưu'}
                          </button>

                          <button
                            onClick={() => toggleEditMode(cat.id, limit)}
                            className="p-2.5 bg-[#141721] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#252836] rounded-xl transition-all cursor-pointer"
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}