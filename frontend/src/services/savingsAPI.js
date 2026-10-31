import axiosClient from './axiosClient';

export const getSavings = async () => {
  const response = await axiosClient.get('/savings');
  return response.data ?? response;
};

export const getSavingDetail = async (goalId) => {
  const response = await axiosClient.get(`/savings/${goalId}`);
  return response.data ?? response;
};

export const createSavingGoal = async (data) => {
  const response = await axiosClient.post('/savings', data);
  return response.data ?? response;
};

export const depositToSaving = async (goalId, data) => {
  const response = await axiosClient.post(`/savings/${goalId}/deposit`, data);
  return response.data ?? response;
};