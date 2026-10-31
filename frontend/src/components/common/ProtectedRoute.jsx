import { Navigate } from 'react-router-dom';
import { useAuth, getHomePath  } from '../../context/AuthContext';

const ProtectedRoute = ({ children ,allowedRoles }) => {
  const { user } = useAuth();

  // Nếu không có user (chưa đăng nhập hoặc token hết hạn), điều hướng về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
   if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  

  // Nếu đã đăng nhập, cho phép đi tiếp vào trong
  return children;
};

export default ProtectedRoute;