import { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phục hồi phiên đăng nhập khi load lại trang
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Token lỗi hoặc hết hạn");
          localStorage.removeItem('access_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Hàm xử lý Đăng nhập
  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    // Sau khi có token, gọi ngay API lấy thông tin user
    const userData = await authApi.getMe();
    setUser(userData);
  };

  // Hàm xử lý Đăng xuất
  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);