import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // Hoặc dùng { children } tùy cấu trúc router của bạn
import { MessageSquare } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatbotPanel from '../dashboard/ChatbotPanel';
import { userAPI } from '../../api/userAPI';

const AppLayout = () => {
  const [user, setUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await userAPI.getMe();
        setUser(response);
      } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
      }
    };
    fetchUserProfile();
  }, []);

  return (
    <div className="h-screen w-full bg-[#161822] font-sans flex flex-col overflow-hidden text-white relative">
      <Header user={user} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        {/* Khu vực nội dung thay đổi linh hoạt tùy theo trang (Dashboard, Transactions,...) */}
        <div className="flex flex-1 overflow-y-auto custom-scrollbar flex-col bg-[#0F111A]">
          <Outlet /> {/* Hoặc {children} */}
        </div>

        {/* Khung trượt Chatbot dùng chung */}
        <div 
          className={`transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] shrink-0 ${
            isChatOpen && !isFullscreen ? 'w-[380px]' : 'w-0'
          }`}
        ></div>

        <ChatbotPanel 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          isFullscreen={isFullscreen} 
          setIsFullscreen={setIsFullscreen} 
          message={chatMessage}
          setMessage={setChatMessage}
        />

        {/* Nút bong bóng chat nổi góc phải dùng chung */}
        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="absolute bottom-8 right-8 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-110 transition-all z-30 cursor-pointer"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLayout;