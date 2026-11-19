import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Tag, ArrowLeftRight, PiggyBank } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const TransactionFilters = ({ filters, activeRange, onFilterChange, onQuickDateRange, onApply, onReset }) => {
  const [categories, setCategories] = useState([]);
  const [savingsList, setSavingsList] = useState([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [catRes, savRes] = await Promise.all([
          axios.get(`${API_BASE}/categories`, { headers }),
          axios.get(`${API_BASE}/savings`, { headers }).catch(() => ({ data: [] })),
        ]);

        if (Array.isArray(catRes.data)) {
          setCategories(catRes.data.filter((cat) => !cat.is_hidden));
        }

        const rawSav = savRes?.data;
        const list = Array.isArray(rawSav)
          ? rawSav
          : (rawSav?.items || rawSav?.data || rawSav?.savings || []);
        setSavingsList(list);
      } catch (err) {
        console.error('Không tải được dữ liệu cho bộ lọc:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  const selectedType = filters.type || '';
  const isExpenseFilterEnabled = selectedType === 'expense';
  const isSavingFilterEnabled = selectedType === 'saving';

  const handleTypeSelect = (e) => {
    const nextType = e.target.value;
    onFilterChange(e);

    if (nextType !== 'expense' && filters.category_id) {
      onFilterChange({ target: { name: 'category_id', value: '' } });
    }
    if (nextType !== 'saving' && filters.goal_id) {
      onFilterChange({ target: { name: 'goal_id', value: '' } });
    }
  };

  return (
    <form onSubmit={onApply} className="bg-[#181B26] border border-[#2E3448] p-5 rounded-2xl mb-8 shadow-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Từ ngày</label>
          <input
            type="date"
            name="from"
            value={filters.from || ''}
            onChange={onFilterChange}
            className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Đến ngày</label>
          <input
            type="date"
            name="to"
            value={filters.to || ''}
            onChange={onFilterChange}
            className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>

        {/* Loại giao dịch: chỉ có Chi tiêu và Tiết kiệm */}
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Loại giao dịch</label>
          <div className="relative flex items-center">
            <ArrowLeftRight size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
            <select
              name="type"
              value={selectedType}
              onChange={handleTypeSelect}
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none cursor-pointer"
            >
              <option value="" className="bg-[#181B26]">Tất cả loại</option>
              <option value="expense" className="bg-[#181B26]">Chi tiêu</option>
              <option value="saving" className="bg-[#181B26]">Tiết kiệm</option>
            </select>
          </div>
        </div>

        {/* Danh mục: chỉ mở khi chọn Chi tiêu */}
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Danh mục</label>
          <div className="relative flex items-center">
            <Tag size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
            <select
              name="category_id"
              value={isExpenseFilterEnabled ? (filters.category_id || '') : ''}
              onChange={onFilterChange}
              disabled={!isExpenseFilterEnabled}
              className={`w-full bg-[#0F111A] border border-[#2E3448] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none ${
                isExpenseFilterEnabled
                  ? 'focus:border-blue-500 cursor-pointer'
                  : 'opacity-45 cursor-not-allowed'
              }`}
            >
              <option value="" className="bg-[#181B26]">
                {isExpenseFilterEnabled ? 'Tất cả danh mục' : 'Danh mục'}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#181B26] text-white">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mục tiêu tiết kiệm: chỉ mở khi chọn Tiết kiệm */}
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Mục tiêu tiết kiệm</label>
          <div className="relative flex items-center">
            <PiggyBank size={16} className="absolute left-3 text-blue-400 pointer-events-none" />
            <select
              name="goal_id"
              value={isSavingFilterEnabled ? (filters.goal_id || '') : ''}
              onChange={onFilterChange}
              disabled={!isSavingFilterEnabled}
              className={`w-full bg-[#0F111A] border border-[#2E3448] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none ${
                isSavingFilterEnabled
                  ? 'focus:border-blue-500 cursor-pointer'
                  : 'opacity-45 cursor-not-allowed'
              }`}
            >
              <option value="" className="bg-[#181B26]">
                {isSavingFilterEnabled ? 'Tất cả tiết kiệm' : 'Tiết kiệm'}
              </option>
              {savingsList.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#181B26] text-white">
                  {s.name || s.title || `Mục tiêu #${s.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Tìm kiếm ghi chú</label>
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              value={filters.q || ''}
              onChange={onFilterChange}
              placeholder="VD: Ăn phở, cafe..."
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Hàng nút thao tác Lọc / Reset + Chọn nhanh ngày */}
      <div className="mt-4 pt-3 border-t border-[#2E3448] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5 mr-1">
            <Calendar size={14} className="text-blue-400" /> Chọn nhanh:
          </span>
          {[
            { key: '0', label: 'Hôm nay' },
            { key: '7', label: '7 ngày gần đây' },
            { key: '30', label: '30 ngày gần đây' }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onQuickDateRange(Number(item.key))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                activeRange === item.key
                  ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                  : 'bg-[#0F111A] hover:bg-[#252A3A] text-gray-200 border-[#2E3448]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Filter size={16} /> Lọc
          </button>
          <button
            type="button"
            onClick={onReset}
            className="bg-[#252A3A] hover:bg-[#31384D] text-gray-200 font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
};

export default TransactionFilters;