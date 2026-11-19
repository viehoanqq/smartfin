import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MoreHorizontal, Plus } from 'lucide-react';

const WalletPanel = () => {
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState('SMARTFIN USER');

  useEffect(() => {
    const fetchWalletAndUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Lấy thông tin ví
        const walletRes = await axios.get('http://localhost:8000/api/v1/wallets/me', { headers });
        if (walletRes.data && typeof walletRes.data.balance === 'number') {
          setBalance(walletRes.data.balance);
        }

        // 2. Lấy thông tin user (nếu API profile của bạn ở đường dẫn này, hoặc điều chỉnh lại cho khớp)
        // Nếu dự án của bạn lưu thông tin user trong localStorage lúc đăng nhập, bạn có thể lấy trực tiếp từ đó luôn cho nhanh.
        const storedUser = localStorage.getItem('user_info');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.full_name) {
            setUserName(parsedUser.full_name);
          }
        } else {
          // Hoặc gọi API lấy thông tin cá nhân nếu có endpoint
          const userRes = await axios.get('http://localhost:8000/api/v1/users/me', { headers });
          if (userRes.data?.full_name) {
            setUserName(userRes.data.full_name);
          }
        }
      } catch (err) {
        console.error("Lỗi tải thông tin ví hoặc user:", err);
      }
    };

    fetchWalletAndUser();
  }, []);

  const nameOnCard = userName.toUpperCase();

  return (
    <div className="w-full h-[260px] flex flex-col justify-between shrink-0">
      
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Ví của tôi</h3>
        <MoreHorizontal size={18} className="text-gray-500 cursor-pointer hover:text-white" />
      </div>
      
      <div className="relative flex-1">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-500/20 rounded-[32px] blur-xl opacity-80"></div>
        
        <div className="relative h-full bg-gradient-to-br from-[#2e303e]/90 via-[#3a2f4c]/90 to-[#22352b]/90 rounded-[32px] p-7 overflow-hidden shadow-2xl border border-white/5 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-blue-500/15 to-transparent rounded-full blur-3xl -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl translate-y-8 -translate-x-8"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-2xl font-black italic text-white tracking-widest drop-shadow-md">VISA</span>
            <div className="w-11 h-8 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded-md flex flex-col justify-between p-1 opacity-90 shadow-sm">
              <div className="grid grid-cols-3 gap-0.5 h-1/3">
                <span className="border-r border-b border-black/10"></span>
                <span className="border-r border-b border-black/10"></span>
                <span className="border-b border-black/10"></span>
              </div>
              <div className="grid grid-cols-3 gap-0.5 h-1/3 border-t border-black/10">
                <span className="border-r border-black/10"></span>
                <span className="border-r border-black/10 bg-amber-500/20"></span>
                <span className="border-black/10"></span>
              </div>
            </div>
          </div>

          <div className="relative z-10 my-2">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Số dư khả dụng</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide">{balance.toLocaleString('vi-VN')}</h3>
              <span className="text-base font-semibold text-white/80">₫</span>
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-end text-xs text-white/60 tracking-wider font-semibold font-mono">
            <span className="truncate max-w-[280px] uppercase font-bold">{nameOnCard}</span>
            <span className="shrink-0">12/28</span>
          </div>

        </div>

        <button className="absolute top-1/2 -right-4 -translate-y-1/2 w-10 h-10 bg-[#252836] hover:bg-blue-600 rounded-full border border-gray-700/60 hover:border-blue-500 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-115 shadow-xl z-20">
          <Plus size={20} />
        </button>
      </div>

    </div>
  );
};

export default WalletPanel;