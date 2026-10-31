import { useState } from 'react';
import { useAuth,getHomePath  } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const me = await login(loginEmail, loginPassword);
      navigate(getHomePath(me), { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Sai email hoặc mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f5f7] flex flex-col justify-center items-center font-sans p-4">
      {/* Main Container Card */}
      <div className="relative bg-white rounded-3xl shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)] overflow-hidden w-full max-w-4xl min-h-[550px] flex flex-col md:flex-row">
        
        {/* PANEL TRÁI (FORM ĐĂNG NHẬP) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-12">
          <form onSubmit={handleLoginSubmit} className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold text-[red] mb-4">SmartFin</h1>
            <h1 className="text-3xl font-extrabold text-[#2c3e50] mb-6">Đăng nhập</h1>
            
            {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded mb-3 w-full text-center">{error}</div>}

            <div className="w-full space-y-3">
              <input 
                type="email" 
                placeholder="Email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="bg-[#eee] border-none px-4 py-3 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
              />
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="bg-[#eee] border-none px-4 py-3 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
              />
            </div>

            <a href="reset-password" className="text-xs text-gray-500 hover:underline my-4">Quên mật khẩu?</a>

            <button 
              type="submit" 
              disabled={isLoading}
              className="rounded-full border border-none bg-[#ff4b2b] text-white text-xs font-bold px-12 py-3.5 tracking-wider uppercase transform transition active:scale-95 hover:bg-[#e03d1e] focus:outline-none shadow-md disabled:bg-gray-400"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            {/* Nút chuyển đổi phụ trên Mobile */}
            <p className="md:hidden mt-6 text-sm text-gray-500">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => navigate('/register')} className="text-[#ff416c] font-bold underline">Đăng ký</button>
            </p>
          </form>
        </div>

        {/* PANEL PHẢI (MẢNG ĐỎ CHUYỂN HƯỚNG SANG ĐĂNG KÝ) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-tr from-[#ff4b2b] to-[#ff416c] text-white flex-col justify-center items-center px-12 text-center rounded-l-[100px]">
          <h1 className="text-4xl font-extrabold mb-4">Xin chào!</h1>
          <p className="text-sm font-light mb-8 leading-relaxed">
            Nhập thông tin cá nhân của bạn và bắt đầu hành trình quản lý tài chính thông minh cùng SmartFin.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="border border-white rounded-full bg-transparent text-white text-xs font-bold uppercase px-12 py-3.5 tracking-wider hover:bg-white hover:text-[#ff416c] active:scale-95 transition-all duration-150 outline-none"
          >
            Đăng ký
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;