import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Search, Bell, User, HelpCircle, LogOut, ChevronDown, 
  Home, BarChart2, Wallet, ArrowLeftRight, PiggyBank, Activity, Receipt, Layers
} from 'lucide-react';
import { NAV_ITEMS } from '../../mock/dashboardData';
import defaultAvatar from '../../assets/imgs/avt-default.png';
import ConfirmModal from '../common/ConfirmModal';

const iconMap = {
  home: Home,
  analytics: BarChart2,
  wallets: Wallet,
  transactions: Activity,
  savings: PiggyBank,
  budget: Layers,
  profile: User
};

const Header = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName = user?.full_name || 'Nguyễn Việt Hoàng';
  const email = user?.email || 'hoang.nv@smartfin.vn';
  const role = user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên';

  const executeLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <>
      <header className="h-[96px] flex justify-between items-center px-8 shrink-0 relative z-40 bg-[#1a1c24] border-b border-[#252836]">
        <div className="flex items-center">
          <Link to="/home" className="flex items-center gap-2 group">
            <span className="text-3xl font-black tracking-wider bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent group-hover:brightness-110 transition drop-shadow-sm font-sans" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Smart<span className="text-emerald-400 font-extrabold">Fin</span>
            </span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.id] || item.icon;
            const isActive = location.pathname === `/${item.id}` || location.pathname.startsWith(`/${item.id}/`);

            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive 
                    ? 'text-white font-semibold bg-[#252836] shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-[#252836]/50'
                }`}
              >
                {Icon && <Icon size={18} className={isActive ? 'text-blue-500' : 'text-gray-400'} />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-5">
          <div className="relative hidden md:block w-60">
            <input 
              type="text" 
              placeholder="Tìm kiếm giao dịch..." 
              className="w-full bg-[#181920] border border-[#2d3142] rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>

          <button className="relative w-10 h-10 rounded-full bg-[#181920] border border-[#2d3142] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#181920]"></span>
          </button>

          <div className="relative group cursor-pointer flex items-center gap-3 bg-[#181920]/50 hover:bg-[#252836] border border-transparent hover:border-[#2d3142] p-1.5 pr-3 rounded-full transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-[2px]">
              <img 
                src={defaultAvatar} 
                alt="avatar" 
                className="w-full h-full rounded-full object-cover border-2 border-[#181920]" 
              />
            </div>
            
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
            </div>

            <ChevronDown size={14} className="text-gray-500 transition-transform duration-300 group-hover:rotate-180" />

            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1c24] border border-[#2d3142] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] 
              opacity-0 invisible translate-y-4 scale-95
              group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 
              transition-all duration-300 ease-out origin-top-right z-50"
            >
              <div className="absolute -top-4 right-0 w-full h-4 bg-transparent"></div>

              <div className="p-5 border-b border-[#2d3142]/60">
                <p className="text-base font-bold text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5 mb-2">{email}</p>
                <span className="inline-block px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded-md">
                  {role}
                </span>
              </div>

              <div className="p-2">
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#252836] rounded-xl transition-colors group/item">
                  <div className="w-8 h-8 rounded-lg bg-[#252836] group-hover/item:bg-blue-500/20 group-hover/item:text-blue-400 flex items-center justify-center transition-colors">
                    <User size={16} />
                  </div>
                  <span>Thông tin cá nhân</span>
                </Link>

                <a href="#help" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#252836] rounded-xl transition-colors group/item">
                  <div className="w-8 h-8 rounded-lg bg-[#252836] group-hover/item:bg-emerald-500/20 group-hover/item:text-emerald-400 flex items-center justify-center transition-colors">
                    <HelpCircle size={16} />
                  </div>
                  <span>Trung tâm trợ giúp</span>
                </a>
              </div>

              <div className="p-2 border-t border-[#2d3142]/60">
                <button 
                  onClick={() => setShowLogoutModal(true)}
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

export default Header;