import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Error404 from './pages/Error404';

import Dashboard from './pages/customer/Dashboard';
import Settings from './pages/customer/Profile';
import Transactions from './pages/customer/Transactions';
import Savings from './pages/customer/Savings';
import SavingDetail from './pages/customer/SavingDetail';
import Wallets from './pages/customer/Wallets';

// Component phụ để chặn người dùng đã đăng nhập quay lại trang Login/Register
const RedirectIfAuthenticated = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- CÁC TRANG CÔNG KHAI (CHƯA ĐĂNG NHẬP) --- */}
          <Route 
            path="/login" 
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            } 
          />
          <Route 
            path="/register" 
            element={
              <RedirectIfAuthenticated>
                <Register />
              </RedirectIfAuthenticated>
            } 
          />
          <Route 
            path="/reset-password" 
            element={
              <RedirectIfAuthenticated>
                <ForgotPassword />
              </RedirectIfAuthenticated>
            } 
          />

          {/* --- CÁC TRANG NỘI BỘ (ĐÃ ĐĂNG NHẬP - DÙNG CHUNG MAINLAYOUT & PROTECTEDROUTE) --- */}
          <Route 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Settings />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/savings/:id" element={<SavingDetail />} />
            <Route path="/wallets" element={<Wallets />} /> 
          </Route>

          {/* Bắt lỗi đường dẫn sai 404 */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}