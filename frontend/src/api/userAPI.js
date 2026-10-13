import axiosClient from './axiosClient';

export const userAPI = {

  getMe: () => {
    return axiosClient.get('/users/me');
  },
  updateUser: (userData) => {
    return axiosClient.put('/users/update-profile', userData);
  }
};