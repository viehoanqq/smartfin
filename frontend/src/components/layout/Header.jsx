import React from 'react';
import { Search, Bell, ChevronRight } from 'lucide-react';

const Header = ({ user }) => {
  const fullName = user?.full_name || 'Đang tải...';

  return (
    <header className="h-[88px] shrink-0 w-full border-b border-[#252836] bg-[#1a1c24] flex items-center px-8 z-50">
      
      {/* 1. Logo (Set width w-64 để thẳng hàng với Sidebar) */}
      <div className="w-64 shrink-0 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-500 to-cyan-300 relative flex items-center justify-center shadow-lg shadow-blue-500/30">
          <div className="w-2.5 h-2.5 bg-white rounded-full absolute -top-1 -left-1"></div>
        </div>
        <span className="text-2xl font-bold tracking-wide text-white">SmartFin.</span>
      </div>

      {/* 2. Giữa: Tiêu đề & Tìm kiếm */}
      <div className="flex-1 flex justify-between items-center pr-8">
        <h2 className="text-2xl font-semibold text-white">Tổng quan</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm giao dịch..." 
              className="bg-[#252836] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-72 transition-all"
            />
          </div>
          <button className="w-10 h-10 rounded-xl bg-[#252836] flex items-center justify-center text-gray-400 hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#252836]"></span>
          </button>
        </div>
      </div>

      {/* 3. Phải: User Profile (Chuyển từ WalletPanel lên) */}
      <div className="flex items-center gap-3 pl-8 border-l border-[#252836] cursor-pointer hover:bg-[#252836]/50 p-2 rounded-xl transition-all">
        <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-9 h-9 rounded-full border-2 border-[#252836]" />
        <span className="text-sm font-medium text-white hidden md:block">{fullName}</span>
        <ChevronRight size={16} className="text-gray-500" />
      </div>

    </header>
  );
};

export default Header;