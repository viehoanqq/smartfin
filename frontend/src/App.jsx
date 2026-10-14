import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import ProtectedRoute from './components/ProtectedRoute';
// Component phụ để chặn người dùng đã đăng nhập quay lại trang Login
const RedirectIfAuthenticated = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    // Bọc toàn bộ App bằng AuthProvider để chia sẻ state User
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* TRANG ĐĂNG NHẬP (Chỉ dành cho người CHƯA đăng nhập) */}
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
          {/* TRANG CHỦ DASHBOARD (Được bảo vệ nghiêm ngặt) */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />  
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />  
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Settings />  
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedRoute>
                <Transactions />  
              </ProtectedRoute>
            } 
          />
          {/* Bắt lỗi đường dẫn sai 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}