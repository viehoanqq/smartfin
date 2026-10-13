import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { userAPI } from '../api/userAPI'; 
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import OverviewCards from '../components/dashboard/OverviewCards';
import TransactionList from '../components/dashboard/TransactionList';
import WalletPanel from '../components/dashboard/WalletPanel';
import ChatbotPanel from '../components/dashboard/ChatbotPanel';
import TransactionForm from '../components/dashboard/TransactionForm'; 

const Dashboard = () => {
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
      
      {/* ĐÃ XÓA THẺ <Settings /> Ở ĐÂY ĐỂ TRÁNH DÍNH CHÙM GIAO DIỆN */}

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <div className="flex flex-1 overflow-y-auto custom-scrollbar flex-col bg-[#0F111A]">
          <main className="flex-1 p-6 md:p-8 max-w-[1800px] mx-auto w-full">
            
            <div className="flex flex-col xl:flex-row gap-6 mb-8">
              <div className="flex-1 w-full min-w-0">
                <OverviewCards />
              </div>
              <div className="w-full xl:w-[380px] shrink-0">
                <WalletPanel user={user} />
              </div>
            </div>

            <TransactionForm />
            <TransactionList />
          </main>
        </div>

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

        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="absolute bottom-8 right-8 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-110 transition-all z-30"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;