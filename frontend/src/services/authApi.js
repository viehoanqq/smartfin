import axiosClient from './axiosClient';

export const authApi = {
  // FastAPI OAuth2 yêu cầu dữ liệu gửi lên ở dạng Form URL Encoded (không phải JSON)
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // Lưu ý: Backend dùng key là 'username'
    formData.append('password', password);
    
    return axiosClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  register: (userData) => {
    return axiosClient.post('/auth/register', userData);
  },

  getMe: () => {
    return axiosClient.get('/auth/me');
  }
};