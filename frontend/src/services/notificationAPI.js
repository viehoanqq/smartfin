import axiosClient from './axiosClient';

export const notificationAPI = {
  list: (page = 1) => axiosClient.get('/notifications', { params: { page, page_size: 10 } }),
  unreadCount: () => axiosClient.get('/notifications/unread-count'),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
};
