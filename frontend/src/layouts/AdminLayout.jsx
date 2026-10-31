import { Outlet } from 'react-router-dom';

// Khung trang quản trị; bổ sung sidebar/header riêng cho admin khi làm các trang trong pages/admin
const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
