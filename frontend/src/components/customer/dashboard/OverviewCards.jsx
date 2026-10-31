import React from 'react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const OverviewCards = () => (
  // Chia lưới chuẩn để 2 thẻ này tự động co lại cân đối, không bị bè rộng quá khổ
  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
    
    {/* Thẻ 1: Tổng quan thu chi */}
    <div className="min-h-[220px] h-full bg-[#252836] rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between border border-[#2d3142]/40 shadow-lg">
      <div className="z-10 flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Tổng thu</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-bold text-white tracking-tight">15.720.000</h3>
            <span className="text-sm font-semibold text-blue-400">₫</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <ArrowUpRight size={18} />
        </div>
      </div>

      <div className="z-10 border-t border-gray-700/30 pt-3 flex justify-between items-end">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Tổng chi</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl font-bold text-gray-100">5.720.000</h3>
            <span className="text-xs font-semibold text-rose-400">₫</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
          <ArrowDownRight size={16} />
        </div>
      </div>

      {/* Sóng mờ chân thẻ */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
        <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="wave-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d="M0,100 C80,140 120,40 200,80 C280,120 320,20 400,50 L400,150 L0,150 Z" fill="url(#wave-grad-blue)" />
        </svg>
      </div>
    </div>

    {/* Thẻ 2: Chi tiêu nhiều nhất (Đã vẽ lại biểu đồ mượt mà, sang trọng) */}
    <div className="min-h-[220px] h-full bg-[#252836] rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden border border-[#2d3142]/40 shadow-lg">
      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <TrendingUp size={15} />
          </div>
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Chi tiêu nhiều nhất</span>
        </div>
        <MoreHorizontal size={18} className="text-gray-500 cursor-pointer hover:text-white" />
      </div>

      {/* BIỂU ĐỒ ĐƯỢC VẼ LẠI TINH TẾ (Sử dụng SVG Area Chart mượt dịu) */}
      <div className="absolute inset-x-0 bottom-12 h-20 pointer-events-none opacity-40">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,100 Q125,20 250,70 T500,40 L500,150 L0,150 Z" fill="url(#chart-gradient)" />
        </svg>
      </div>

      <div className="relative z-10 w-full my-2">
        <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-12 overflow-visible">
          <path d="M0,70 Q125,10 250,50 T500,20" fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" />
          {/* Điểm nhấn đỉnh biểu đồ */}
          <circle cx="375" cy="28" r="4" fill="#a3e635" />
          <circle cx="375" cy="28" r="8" fill="#a3e635" fillOpacity="0.25" className="animate-ping" />
        </svg>
        <div className="absolute top-2 right-4 bg-[#a3e635]/15 text-[#a3e635] text-[10px] px-2 py-0.5 rounded-md font-bold border border-[#a3e635]/30 shadow-sm">
          1.5M
        </div>
      </div>

      <div className="flex justify-between items-end z-10">
        <div>
          <p className="text-gray-400 text-[11px] mb-0.5 font-medium">Rạp chiếu phim</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-bold text-white tracking-tight">1.235.300</h3>
            <span className="text-xs font-semibold text-gray-400">₫</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 font-medium">Bình quân / tuần</span>
      </div>
    </div>

  </div>
);

export default OverviewCards;