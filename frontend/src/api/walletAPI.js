import axiosClient from './axiosClient';

export const walletAPI = {
  getMyWallet: () => {
    return axiosClient.get('/wallets/me');
  }
};
