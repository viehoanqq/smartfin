import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  // Nếu không có user (chưa đăng nhập hoặc token hết hạn), điều hướng về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập, cho phép đi tiếp vào trong
  return children;
};

export default ProtectedRoute;