import axiosClient from './axiosClient';

export const nlpAPI = {
  parseText: (text) => axiosClient.post('/nlp/parse', { text }),
  getOptions: () => axiosClient.get('/nlp/options'),
  saveFeedback: (data) => axiosClient.post('/nlp/feedback', data),
  saveDrafts: (transactions) => axiosClient.post('/transactions/bulk', { transactions }),
};
