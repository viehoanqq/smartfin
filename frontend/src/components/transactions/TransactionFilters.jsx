import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

const TransactionFilters = ({ filters, activeRange, onFilterChange, onQuickDateRange, onApply, onReset }) => {
  return (
    <form onSubmit={onApply} className="bg-[#181B26] border border-[#2E3448] p-5 rounded-2xl mb-8 shadow-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Từ ngày</label>
          <input 
            type="date" 
            name="from"
            value={filters.from}
            onChange={onFilterChange}
            className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Đến ngày</label>
          <input 
            type="date" 
            name="to"
            value={filters.to}
            onChange={onFilterChange}
            className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Loại giao dịch</label>
          <select 
            name="type"
            value={filters.type}
            onChange={onFilterChange}
            className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
          >
            <option value="" className="bg-[#181B26]">Tất cả (Thu / Chi)</option>
            <option value="expense" className="bg-[#181B26]">Khoản chi</option>
            <option value="income" className="bg-[#181B26]">Khoản thu</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Tìm kiếm ghi chú</label>
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input 
              type="text" 
              name="q"
              value={filters.q}
              onChange={onFilterChange}
              placeholder="VD: Ăn phở, cafe..."
              className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            type="submit"
            className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Filter size={16} /> Lọc
          </button>
          <button 
            type="button"
            onClick={onReset}
            className="bg-[#252A3A] hover:bg-[#31384D] text-gray-200 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Chọn nhanh ngày */}
      <div className="mt-4 pt-3 border-t border-[#2E3448] flex flex-wrap items-center gap-2">
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
    </form>
  );
};

export default TransactionFilters;