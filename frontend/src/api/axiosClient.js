import axios from 'axios';

// 1. Khởi tạo một instance của Axios với baseURL trỏ về FastAPI
const axiosClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. REQUEST INTERCEPTOR: Tự động đính kèm Token trước khi gửi API lên server
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ Local Storage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. RESPONSE INTERCEPTOR: Xử lý lỗi trả về từ Server một cách tập trung
axiosClient.interceptors.response.use(
  (response) => {
    // Nếu API thành công, chỉ lấy đúng data, bỏ qua các wrapper dài dòng của Axios
    return response.data;
  },
  (error) => {
    // Nếu server trả về lỗi 401 (Unauthorized) -> Token hết hạn hoặc sai
    if (error.response && error.response.status === 401) {
      console.warn("Token không hợp lệ hoặc đã hết hạn. Đang đăng xuất...");
      localStorage.removeItem('access_token');
      // Tự động đá người dùng về trang đăng nhập
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;