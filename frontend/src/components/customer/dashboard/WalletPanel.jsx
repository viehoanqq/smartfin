import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';

const WalletPanel = ({ user }) => {
  const nameOnCard = user?.full_name ? user.full_name.toUpperCase() : 'SMARTFIN USER';

  return (
    <div className="w-full xl:w-[380px] h-[220px] flex flex-col justify-between shrink-0">
      
      {/* Tiêu đề & Menu */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Ví của tôi</h3>
        <MoreHorizontal size={18} className="text-gray-500 cursor-pointer hover:text-white" />
      </div>
      
      {/* Thẻ Ngân hàng cao cấp */}
      <div className="relative flex-1">
        {/* Hào quang gradient phát sáng phía sau tạo chiều sâu (Glow Effect) */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-500/20 rounded-[24px] blur-lg opacity-70"></div>
        
        {/* Khung thẻ chính với Glassmorphic nhám mờ */}
        <div className="relative h-full bg-gradient-to-br from-[#2e303e]/90 via-[#3a2f4c]/90 to-[#22352b]/90 rounded-[24px] p-5 overflow-hidden shadow-2xl border border-white/5 flex flex-col justify-between">
          {/* Họa tiết ánh sáng & cầu vồng bên trong */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-2xl -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl translate-y-8 -translate-x-8"></div>
          
          {/* Trên: Logo Visa & Chip vàng sang trọng */}
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-lg font-black italic text-white tracking-widest drop-shadow-md">VISA</span>
            {/* Chip thẻ giả lập tinh xảo */}
            <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded flex flex-col justify-between p-1 opacity-90 shadow-sm">
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

          {/* Giữa: Số dư khả dụng */}
          <div className="relative z-10 my-1">
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mb-0.5">Số dư khả dụng</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold text-white tracking-wide">15.000.000</h3>
              <span className="text-sm font-semibold text-white/80">₫</span>
            </div>
          </div>

          {/* Dưới: Họ tên và thời hạn */}
          <div className="relative z-10 flex justify-between items-end text-[10px] text-white/60 tracking-wider font-semibold font-mono">
            <span className="truncate max-w-[200px] uppercase font-bold">{nameOnCard}</span>
            <span className="shrink-0">12/28</span>
          </div>

        </div>

        {/* Nút Cộng (+) bay lơ lửng, cân đối ở sườn bên phải */}
        <button className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-[#252836] hover:bg-blue-600 rounded-full border border-gray-700/60 hover:border-blue-500 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-115 shadow-lg z-20">
          <Plus size={16} />
        </button>
      </div>

    </div>
  );
};

export default WalletPanel;