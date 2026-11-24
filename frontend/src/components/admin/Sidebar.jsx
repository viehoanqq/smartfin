import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ADMIN_NAV_ITEMS } from '../../mock/dashboardData';
import ConfirmModal from '../common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const executeLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <aside className="hidden lg:flex w-64 h-full py-8 px-6 flex-col justify-between border-r border-[#252836] bg-[#1a1c24] shrink-0">
        
        {/* Logo đồng nhất với Header */}
        <div className="mb-6 px-4">
          <Link to="/admin/customers" className="flex items-center gap-2 group">
            <span 
              className="text-3xl font-black tracking-wider bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent group-hover:brightness-110 transition drop-shadow-sm font-sans" 
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Smart<span className="text-emerald-400 font-extrabold">Fin</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const targetPath = `/admin/${item.id}`;
            const isActive = location.pathname.includes(item.id);

            return (
              <Link
                key={item.id}
                to={targetPath}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  isActive 
                    ? 'text-white font-semibold bg-[#252836]' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#252836]/40'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-500' : 'text-gray-500'} />
                <span>{item.label}</span>
              </Link>
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