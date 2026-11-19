import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // 1. Import thêm useLocation
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../../mock/dashboardData';
import ConfirmModal from '../common/ConfirmModal'; 

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 2. Lấy thông tin URL hiện tại
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Hàm xử lý logic khi bấm nút Xác nhận Đăng xuất
  const executeLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <>
      <aside className="w-64 h-full py-8 px-6 flex flex-col justify-between border-r border-[#252836] hidden lg:flex bg-[#1a1c24] shrink-0">
        
        <nav className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            
            // 3. Kiểm tra xem item này có đang khớp với URL hiện tại không 
            // (Giả lập item.id hoặc item.path tương ứng với đường dẫn, ví dụ: "/wallets" hoặc "wallets")
            const currentPath = location.pathname;
            const isActive = currentPath.includes(item.id); 

            return (
              <a
                key={item.id}
                href={`/${item.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  isActive 
                    ? 'text-white font-semibold bg-[#252836]' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#252836]/40'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-500' : 'text-gray-500'} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-4 pt-4 border-t border-[#252836] shrink-0">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-4 px-4 py-3.5 w-full rounded-xl transition-all text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-medium"
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Tái sử dụng Confirm Modal */}
      <ConfirmModal 
        isOpen={showLogoutModal}
        title="Đăng xuất tài khoản?"
        message="Bạn có chắc chắn muốn đăng xuất khỏi SmartFin? Phiên làm việc của bạn sẽ kết thúc."
        confirmText="Đăng xuất"
        cancelText="Hủy"
        isDanger={true}
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};

export default Sidebar;