import React from 'react';
import { Send, X, Bot, Maximize2, Minimize2 } from 'lucide-react';

const ChatbotPanel = ({ isOpen, onClose, isFullscreen, setIsFullscreen, message, setMessage }) => {
  return (
    <aside 
      // BÍ QUYẾT: Neo cứng ở right-0. Thay đổi top và width để tạo hiệu ứng bung tỏa từ góc phải
      className={`fixed right-0 z-[100] bg-[#1a1c24] border-[#252836] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col overflow-hidden ${
        isOpen 
          ? isFullscreen 
            ? 'w-full h-full top-0 translate-x-0 rounded-none border-l-0' // Bung full màn hình từ phải sang trái
            : 'w-[380px] h-[calc(100vh-88px)] top-[88px] translate-x-0 rounded-tl-2xl border-l border-t' // Trạng thái bảng bên phải
          : 'w-[380px] h-[calc(100vh-88px)] top-[88px] translate-x-full opacity-0' // Ẩn ra ngoài mép phải
      }`}
    >
      <div className={`${isFullscreen ? 'w-full max-w-4xl mx-auto h-full border-x border-[#252836] shadow-2xl' : 'w-full h-full'} flex flex-col bg-[#1a1c24] transition-all duration-500`}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[#252836] shrink-0 bg-[#1a1c24]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Trợ lý SmartFin</h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Trực tuyến
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#252836] transition-all">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={() => { setIsFullscreen(false); onClose(); }} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white mt-1">
              <Bot size={14} />
            </div>
            <div className="bg-[#252836] text-sm text-gray-200 p-4 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sm border border-white/5">
              Xin chào! Mình là AI của SmartFin. Bạn cần hỗ trợ gì?
            </div>
          </div>
        </div>

        {/* Khung nhập */}
        <div className="p-5 border-t border-[#252836] shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập yêu cầu của bạn..." 
              className="w-full bg-[#181920] border border-[#2d3142] rounded-2xl py-3.5 pl-5 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && setMessage('')} 
            />
            <button onClick={() => setMessage('')} className="absolute right-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ChatbotPanel;