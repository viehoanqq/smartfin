import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../../mock/dashboardData';
import ConfirmModal from '../common/ConfirmModal'; 

const Sidebar = () => {
  const navigate = useNavigate();
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
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  item.active 
                    ? 'text-white font-semibold bg-[#252836]' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#252836]/40'
                }`}
              >
                <Icon size={20} className={item.active ? 'text-blue-500' : 'text-gray-500'} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-4 pt-4 border-t border-[#252836] shrink-0">
          <button 
            onClick={() => setShowLogoutModal(true)} // Mở Modal
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
        isDanger={true} // Báo hiệu đây là hành động nguy hiểm (nút đỏ)
        onConfirm={executeLogout} // Truyền hàm đăng xuất vào
        onCancel={() => setShowLogoutModal(false)} // Truyền hàm đóng modal vào
      />
    </>
  );
};

export default Sidebar;