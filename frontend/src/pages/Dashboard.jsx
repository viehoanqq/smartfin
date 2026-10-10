import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  // Lấy thông tin user và hàm logout từ AuthContext
  const { user, logout } = useAuth(); 
  
  const [apiData, setApiData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Gọi test sức khỏe máy chủ
    axios.get('http://localhost:8000/api/health')
      .then((response) => setApiData(response.data))
      .catch((err) => {
        console.error("Lỗi gọi API:", err);
        setError('Không thể kết nối đến máy chủ Backend.');
      });
  }, []);

  return (
    <div className="p-10 font-sans max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">SmartFin Dashboard</h1>
        
        {/* Nút Đăng xuất */}
        <button 
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition"
        >
          Đăng xuất
        </button>
      </div>
      
      {/* Hiển thị lời chào cá nhân hóa */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h2 className="text-lg text-green-800">
          Xin chào, <strong>{user?.full_name}</strong>! Email của bạn là: {user?.email}
        </h2>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Trạng thái hệ thống Backend:</h2>
        
        {error ? (
          <p className="text-red-500 font-medium">{error}</p>
        ) : apiData ? (
          <ul className="space-y-2 text-gray-700">
            <li><strong>Status:</strong> {apiData.status}</li>
            {/* Tùy thuộc backend của bạn có trả về key database hay không */}
            <li><strong>Message:</strong> {apiData.message || apiData.database}</li> 
          </ul>
        ) : (
          <p className="text-gray-500 animate-pulse">Đang tải dữ liệu từ API...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;