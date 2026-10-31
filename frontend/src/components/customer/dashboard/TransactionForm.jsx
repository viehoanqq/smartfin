import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

const TransactionForm = () => {
  const [smartText, setSmartText] = useState('');

  const handleSmartSubmit = (e) => {
    e.preventDefault();
    if (!smartText.trim()) return;
    console.log("🤖 Đang phân tích chuỗi thông minh:", smartText);
    setSmartText('');
  };

  return (
    <div className="w-full mb-8">
      {/* Khung bọc ngoài tạo hiệu ứng viền Gradient phát sáng tinh tế */}
      <div className="relative p-[1.5px] rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
        
        <form 
          onSubmit={handleSmartSubmit} 
          className="bg-[#181a24] rounded-[22px] px-5 py-3.5 flex flex-col sm:flex-row items-center gap-4 w-full relative"
        >
          {/* Nhãn hiệu ứng AI nổi bật */}
          <div className="flex items-center gap-2.5 text-blue-400 font-semibold whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles size={20} className="animate-pulse text-indigo-400" />
            </div>
            <span className="text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 font-bold hidden sm:inline">
              Nhập thông minh
            </span>
          </div>
          
          <div className="h-7 w-[1px] bg-[#2d3142] hidden sm:block shrink-0"></div>
          
          {/* Ô input to bản, rõ ràng */}
          <input 
            type="text" 
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            placeholder="Ví dụ: Ăn phở bò 45k lúc sáng, đổ xăng 50k..." 
            className="flex-1 bg-transparent border-none text-base text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 w-full px-1"
          />
          
          {/* Nút Ghi chép cao cấp */}
          <button 
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl py-3 px-7 flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full sm:w-auto"
          >
            <Send size={16} />
            <span>Ghi chép</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;