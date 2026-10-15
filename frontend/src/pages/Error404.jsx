import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

const Error404 = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  // Bộ đếm ngược 10 giây tự động về trang chủ
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-[#0B0C10] font-sans flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      
      {/* Hiệu ứng ánh sáng nền mờ rộng toàn màn hình */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[180px] rounded-full pointer-events-none"></div>

      {/* Nội dung trải dài trực tiếp trên màn hình, không có khung thẻ (card) */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
        
        {/* Icon La bàn / Không gian */}
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 shadow-2xl animate-pulse">
          <Compass size={40} />
        </div>

        {/* Thẻ nhỏ báo lỗi */}
        <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20 mb-4">
          Lỗi 404
        </span>

        {/* Số 404 cực lớn */}
        <h1 className="text-8xl md:text-9xl font-extrabold tracking-tight text-white mb-2 tabular-nums drop-shadow-lg">
          404
        </h1>
        
        {/* Tiêu đề */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-3 tracking-tight">
          Trang bạn tìm kiếm không tồn tại
        </h2>

        {/* Câu thông báo đếm ngược */}
        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-md">
          Đường dẫn này không có sẵn hoặc đang được bảo trì. Hệ thống sẽ tự động đưa bạn về trang chủ sau <strong className="text-white font-semibold tabular-nums">{countdown} giây</strong>.
        </p>

        {/* Các nút bấm hành động */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-[#1E212D] hover:bg-[#272B3A] border border-white/[0.08] text-gray-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          
          <button
            onClick={() => navigate('/')}
            style={{ backgroundColor: '#2563EB' }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 text-white hover:opacity-95 rounded-xl text-sm font-semibold transition-opacity cursor-pointer shadow-lg shadow-blue-500/25"
          >
            <Home size={16} /> Trang chủ
          </button>
        </div>

      </div>
    </div>
  );
};

export default Error404;