import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

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
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Sai email hoặc mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f5f7] flex flex-col justify-center items-center font-sans p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 text-center">
        <h1 className="text-4xl font-extrabold text-[#ff4b2b] mb-2">SmartFin</h1>
        <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Đăng nhập</h2>
        
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleLoginSubmit} className="flex flex-col space-y-4">
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

          <div className="flex justify-end">
            <a href="#" className="text-xs text-gray-500 hover:text-[#ff4b2b] hover:underline">
              Quên mật khẩu?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 rounded-full border border-none bg-[#ff4b2b] text-white text-sm font-bold py-3.5 tracking-wider uppercase transform transition active:scale-95 hover:bg-[#e03d1e] focus:outline-none shadow-md disabled:bg-gray-400"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-[#ff416c] font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;