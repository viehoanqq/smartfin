import React from 'react';
import { Search, Bell, User, Settings, HelpCircle, LogOut, ChevronDown } from 'lucide-react';

const Header = ({ user }) => {
  // Lấy tên và email từ dữ liệu user (nếu có), nếu không dùng mặc định
  const displayName = user?.full_name || 'Nguyễn Việt Hoàng';
  const email = user?.email || 'hoang.nv@smartfin.vn';
  const role = user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên';

  return (
    <header className="h-[88px] flex justify-between items-center px-8 shrink-0 relative z-40">
      {/* Bên trái: Tiêu đề trang */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Tổng quan</h2>
      </div>

      {/* Bên phải: Tìm kiếm, Thông báo, Profile */}
      <div className="flex items-center gap-6">
        
        {/* Khung tìm kiếm */}
        <div className="relative hidden md:block w-64">
          <input 
            type="text" 
            placeholder="Tìm kiếm giao dịch..." 
            className="w-full bg-[#181920] border border-[#2d3142] rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>

        {/* Nút Thông báo */}
        <button className="relative w-10 h-10 rounded-full bg-[#181920] border border-[#2d3142] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
          {/* Chấm đỏ thông báo */}
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#181920]"></span>
        </button>

        {/* KHU VỰC PROFILE (Có Dropdown) */}
        {/* Class 'group' là chìa khóa để bắt sự kiện hover cho toàn bộ khối này */}
        <div className="relative group cursor-pointer flex items-center gap-3 bg-[#181920]/50 hover:bg-[#252836] border border-transparent hover:border-[#2d3142] p-1.5 pr-3 rounded-full transition-all duration-300">
          
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-[2px]">
            <img 
              src="https://i.pravatar.cc/150?u=hoang" 
              alt="avatar" 
              className="w-full h-full rounded-full object-cover border-2 border-[#181920]" 
            />
          </div>
          
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
          </div>

          {/* Mũi tên xoay 180 độ khi hover */}
          <ChevronDown size={14} className="text-gray-500 transition-transform duration-300 group-hover:rotate-180" />

          {/* --- KHUNG DROPDOWN MENU --- */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1c24] border border-[#2d3142] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] 
            opacity-0 invisible translate-y-4 scale-95
            group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 
            transition-all duration-300 ease-out origin-top-right z-50"
          >
            {/* CẦU NỐI TÀNG HÌNH: Giúp chuột đi từ Avatar xuống Menu mà không bị mất hover */}
            <div className="absolute -top-4 right-0 w-full h-4 bg-transparent"></div>

            {/* Thông tin vắn tắt */}
            <div className="p-5 border-b border-[#2d3142]/60">
              <p className="text-base font-bold text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5 mb-2">{email}</p>
              <span className="inline-block px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded-md">
                {role}
              </span>
            </div>

            {/* Các tùy chọn */}
            <div className="p-2">
              <a href="profile" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#252836] rounded-xl transition-colors group/item">
                <div className="w-8 h-8 rounded-lg bg-[#252836] group-hover/item:bg-blue-500/20 group-hover/item:text-blue-400 flex items-center justify-center transition-colors">
                  <User size={16} />
                </div>
                <span>Thông tin cá nhân</span>
              </a>
              

              <a href="#help" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#252836] rounded-xl transition-colors group/item">
                <div className="w-8 h-8 rounded-lg bg-[#252836] group-hover/item:bg-emerald-500/20 group-hover/item:text-emerald-400 flex items-center justify-center transition-colors">
                  <HelpCircle size={16} />
                </div>
                <span>Trung tâm trợ giúp</span>
              </a>
            </div>

            {/* Nút Đăng xuất trong Menu */}
            <div className="p-2 border-t border-[#2d3142]/60">
              <button 
                onClick={() => {
                  // Bạn có thể kích hoạt Modal đăng xuất từ đây nếu muốn, 
                  // Tạm thời mình gọi lệnh chuyển trang cơ bản
                  localStorage.removeItem('access_token');
                  window.location.href = '/login';
                }}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center transition-colors">
                  <LogOut size={16} />
                </div>
                <span className="font-medium">Đăng xuất</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;