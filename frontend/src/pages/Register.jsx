import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';

const Register = () => {
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCurrency, setRegCurrency] = useState('VND');
  const [regIncome, setRegIncome] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authApi.register({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        currency: regCurrency,
        monthly_income: Number(regIncome)
      });
      
      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/login'); 
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Đã xảy ra lỗi khi đăng ký.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f5f7] flex flex-col justify-center items-center font-sans p-4">
      {/* Main Container Card */}
      <div className="relative bg-white rounded-3xl shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)] overflow-hidden w-full max-w-4xl min-h-[550px] flex flex-col md:flex-row">
        
        {/* PANEL TRÁI (MẢNG ĐỎ CHUYỂN HƯỚNG VỀ ĐĂNG NHẬP) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-tr from-[#ff4b2b] to-[#ff416c] text-white flex-col justify-center items-center px-12 text-center rounded-r-[100px]">
          <h1 className="text-4xl font-extrabold mb-4">Chào mừng trở lại!</h1>
          <p className="text-sm font-light mb-8 leading-relaxed">
            Để duy trì kết nối với chúng tôi, vui lòng đăng nhập bằng thông tin cá nhân của bạn.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="border border-white rounded-full bg-transparent text-white text-xs font-bold uppercase px-12 py-3.5 tracking-wider hover:bg-white hover:text-[#ff416c] active:scale-95 transition-all duration-150 outline-none"
          >
            Đăng nhập
          </button>
        </div>

        {/* PANEL PHẢI (FORM ĐĂNG KÝ) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-8">
          <form onSubmit={handleRegisterSubmit} className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold text-[red] mb-4">SmartFin</h1>
            <h1 className="text-3xl font-extrabold text-[#2c3e50] mb-6">Tạo tài khoản</h1>
            
            {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded mb-3 w-full text-center">{error}</div>}
            {success && <div className="text-xs text-green-500 bg-green-50 px-3 py-1 rounded mb-3 w-full text-center">{success}</div>}

            <div className="w-full space-y-3">
              <input 
                type="text" 
                placeholder="Họ và Tên" 
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="bg-[#eee] border-none px-4 py-2.5 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
              />
              <input 
                type="email" 
                placeholder="Email" 
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="bg-[#eee] border-none px-4 py-2.5 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
              />
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="bg-[#eee] border-none px-4 py-2.5 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
              />
              
              <div className="flex gap-2">
                <select 
                  value={regCurrency}
                  onChange={(e) => setRegCurrency(e.target.value)}
                  className="bg-[#eee] border-none px-3 py-2.5 text-sm rounded-lg w-1/3 outline-none focus:ring-2 focus:ring-[#ff4b2b] cursor-pointer"
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Thu nhập/tháng" 
                  required
                  value={regIncome || ''}
                  onChange={(e) => setRegIncome(e.target.value)}
                  className="bg-[#eee] border-none px-4 py-2.5 text-sm rounded-lg w-2/3 outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-6 rounded-full border border-none bg-[#ff4b2b] text-white text-xs font-bold px-12 py-3.5 tracking-wider uppercase transform transition active:scale-95 hover:bg-[#e03d1e] focus:outline-none shadow-md disabled:bg-gray-400"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>

            {/* Nút chuyển đổi phụ trên Mobile */}
            <p className="md:hidden mt-6 text-sm text-gray-500">
              Đã có tài khoản?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-[#ff416c] font-bold underline">Đăng nhập</button>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Register;