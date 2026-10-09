import { useEffect, useState } from 'react';
import axios from 'axios';

export default function App() {
  const [apiData, setApiData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Gọi thẳng xuống Backend
    axios.get('http://localhost:8000/api/health')
      .then((response) => {
        setApiData(response.data);
      })
      .catch((err) => {
        console.error("Lỗi gọi API:", err);
        setError('Không thể kết nối đến máy chủ Backend.');
      });
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>SmartFin Dashboard</h1>
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f0f9ff', 
        border: '1px solid #bae0ff',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>Trạng thái hệ thống:</h2>
        
        {error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : apiData ? (
          <ul>
            <li><strong>Status:</strong> {apiData.status}</li>
            <li><strong>Database:</strong> {apiData.database}</li>
          </ul>
        ) : (
          <p>Đang tải dữ liệu từ API...</p>
        )}
      </div>
    </div>
  );
}