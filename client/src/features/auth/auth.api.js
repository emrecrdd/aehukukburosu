import axios from '../../app/config/axios.js';

const authApi = {
  // ====================================================
  // LOGIN
  // ====================================================

  login: (
    email,
    password
  ) => {
    return axios.post(
      '/auth/login',
      {
        email,
        password,
      },
      {
        /*
         * Backend refreshToken'ı HttpOnly cookie
         * olarak set ediyor.
         *
         * Frontend ve backend farklı origin olduğu
         * için credentials açık olmalı.
         */
        withCredentials:
          true,
      }
    );
  },

 
  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  refreshToken: () => {
    /*
     * Refresh token artık JavaScript tarafından
     * okunmaz veya request body'ye gönderilmez.
     *
     * Browser HttpOnly refreshToken cookie'sini
     * otomatik olarak gönderir.
     */
    return axios.post(
      '/auth/refresh-token',
      null,
      {
        withCredentials:
          true,
      }
    );
  },

  // ====================================================
  // LOGOUT
  // ====================================================

  logout: () => {
    /*
     * Logout için refresh token body'ye
     * gönderilmez.
     *
     * Backend HttpOnly cookie'den okuyacak.
     */
    return axios.post(
      '/auth/logout',
      null,
      {
        withCredentials:
          true,
      }
    );
  },

  // ====================================================
  // PROFILE
  // ====================================================

  getProfile: () => {
    return axios.get(
      '/auth/profile'
    );
  },

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  updateProfile: (
    data
  ) => {
    return axios.patch(
      '/auth/profile',
      data
    );
  },

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  changePassword: (
    data
  ) => {
    return axios.put(
      '/auth/change-password',
      data
    );
  },

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  forgotPassword: (
    email
  ) => {
    return axios.post(
      '/auth/forgot-password',
      {
        email,
      }
    );
  },

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  resetPassword: (
    token,
    password
  ) => {
    return axios.post(
      '/auth/reset-password',
      {
        token,
        password,
      }
    );
  },
};

export default authApi;