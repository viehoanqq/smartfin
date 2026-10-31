import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold">SmartFin Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.full_name || user?.email}</span>
          <button onClick={handleLogout} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600">
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
