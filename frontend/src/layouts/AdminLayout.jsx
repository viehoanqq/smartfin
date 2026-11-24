import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/admin/Sidebar';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#141721] text-white">
      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Khu vực bên phải gồm Header và Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;