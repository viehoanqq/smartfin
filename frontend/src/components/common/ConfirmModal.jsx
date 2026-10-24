import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Xác nhận", 
  cancelText = "Hủy", 
  onConfirm, 
  onCancel,
  icon: Icon = AlertTriangle, // Cho phép truyền icon khác vào, mặc định là AlertTriangle
  isDanger = true // Nếu là true thì nút Xác nhận màu đỏ, false thì màu xanh
}) => {
  // Nếu state isOpen là false thì không render gì cả
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1a1c24] border border-[#252836] rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-[fadeIn_0.2s_ease-out]">
        
        <div className="flex flex-col items-center text-center">
          {/* Khu vực Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-inner ${
            isDanger ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
          }`}>
            <Icon size={28} />
          </div>
          
          {/* Tiêu đề & Nội dung truyền từ Props */}
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm mb-8 px-2">{message}</p>
          
          {/* Hai nút Hủy & Xác nhận */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-[#252836] hover:bg-[#2d3142] text-gray-300 hover:text-white font-semibold transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-xl text-white font-semibold transition-all shadow-lg active:scale-95 ${
                isDanger 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfirmModal;