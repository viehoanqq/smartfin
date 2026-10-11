import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  // Quản lý bước: 1 (Nhập Email), 2 (Nhập OTP & Pass mới)
  const [step, setStep] = useState(1); 
  
  // States cho dữ liệu form
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // States thông báo
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // Xử lý Bước 1: Yêu cầu mã OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/api/v1/auth/forgot-password', {
        email: email
      });
      setSuccess(response.data.message || 'Mã khôi phục đã được gửi!');
      setStep(2); // Chuyển sang form nhập OTP
    } catch (err) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Bước 2: Đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/api/v1/auth/reset-password', {
        email: email,
        reset_code: resetCode,
        new_password: newPassword
      });
      setSuccess(response.data.message || 'Đặt lại mật khẩu thành công!');
      // Sau 2 giây tự động đá về trang Đăng nhập
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Mã OTP không hợp lệ hoặc lỗi kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f5f7] flex flex-col justify-center items-center font-sans p-4">
      {/* Main Container Card */}
      <div className="relative bg-white rounded-3xl shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)] overflow-hidden w-full max-w-4xl min-h-[550px] flex flex-col md:flex-row">
        
        {/* PANEL TRÁI (FORM QUÊN MẬT KHẨU) */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 py-12">
          
          {/* Form Bước 1: Nhập Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="flex flex-col items-center">
              <h1 className="text-4xl font-extrabold text-[red] mb-4">SmartFin</h1>
              <h1 className="text-2xl font-extrabold text-[#2c3e50] mb-2 text-center">Khôi phục mật khẩu</h1>
              <p className="text-xs text-gray-500 mb-6 text-center">Nhập email đăng ký của bạn để nhận mã xác nhận OTP.</p>
              
              {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded mb-3 w-full text-center">{error}</div>}
              {success && <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded mb-3 w-full text-center">{success}</div>}

              <div className="w-full space-y-3">
                <input 
                  type="email" 
                  placeholder="Nhập Email của bạn" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#eee] border-none px-4 py-3 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="mt-8 rounded-full border border-none bg-[#ff4b2b] text-white text-xs font-bold px-12 py-3.5 tracking-wider uppercase transform transition active:scale-95 hover:bg-[#e03d1e] focus:outline-none shadow-md disabled:bg-gray-400"
              >
                {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>
          )}

          {/* Form Bước 2: Đặt lại mật khẩu */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="flex flex-col items-center">
              <h1 className="text-4xl font-extrabold text-[red] mb-4">SmartFin</h1>
              <h1 className="text-2xl font-extrabold text-[#2c3e50] mb-2 text-center">Đặt lại mật khẩu</h1>
              <p className="text-xs text-gray-500 mb-6 text-center">Mã OTP (tạm thời là 123456) đã được gửi tới <strong>{email}</strong></p>
              
              {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded mb-3 w-full text-center">{error}</div>}
              {success && <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded mb-3 w-full text-center">{success}</div>}

              <div className="w-full space-y-3">
                <input 
                  type="text" 
                  placeholder="Mã xác nhận (OTP)" 
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="bg-[#eee] border-none px-4 py-3 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
                />
                <input 
                  type="password" 
                  placeholder="Mật khẩu mới" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-[#eee] border-none px-4 py-3 text-sm rounded-lg w-full outline-none focus:ring-2 focus:ring-[#ff4b2b]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="mt-8 rounded-full border border-none bg-[#ff4b2b] text-white text-xs font-bold px-12 py-3.5 tracking-wider uppercase transform transition active:scale-95 hover:bg-[#e03d1e] focus:outline-none shadow-md disabled:bg-gray-400"
              >
                {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi'}
              </button>
            </form>
          )}

          {/* Nút chuyển đổi phụ trên Mobile */}
          <p className="md:hidden mt-6 text-sm text-gray-500 text-center">
            Bạn đã nhớ mật khẩu?{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-[#ff416c] font-bold underline">Đăng nhập</button>
          </p>
        </div>

        {/* PANEL PHẢI (MẢNG ĐỎ CHUYỂN HƯỚNG VỀ ĐĂNG NHẬP) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-tr from-[#ff4b2b] to-[#ff416c] text-white flex-col justify-center items-center px-12 text-center rounded-l-[100px]">
          <h1 className="text-4xl font-extrabold mb-4">Nhớ ra rồi à?</h1>
          <p className="text-sm font-light mb-8 leading-relaxed">
            Tuyệt vời! Hãy quay lại trang đăng nhập để tiếp tục hành trình quản lý tài chính cùng chúng tôi nhé.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="border border-white rounded-full bg-transparent text-white text-xs font-bold uppercase px-12 py-3.5 tracking-wider hover:bg-white hover:text-[#ff416c] active:scale-95 transition-all duration-150 outline-none"
          >
            Đăng nhập ngay
          </button>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;