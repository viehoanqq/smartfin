import axiosClient from './axiosClient';

export const chatAPI = {
  sessions: () => axiosClient.get('/chat/sessions'),
  messages: (id) => axiosClient.get(`/chat/sessions/${id}/messages`),
  remove: (id) => axiosClient.delete(`/chat/sessions/${id}`),
  send: (message, sessionId) => axiosClient.post('/chat/messages', { message, session_id: sessionId }),
};
