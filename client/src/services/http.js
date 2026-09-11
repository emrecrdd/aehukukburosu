import axios from 'axios';
import { env } from '../app/config/env.js';
import { errorHandler } from '../utils/errorHandler.js';

class HttpService {
  constructor() {
    this.api = axios.create({
      baseURL: env.API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
            if (tokens?.refreshToken) {
              const response = await axios.post(`${env.API_URL}/auth/refresh-token`, {
                refreshToken: tokens.refreshToken,
              });
              
              const { accessToken, refreshToken } = response.data.data;
              localStorage.setItem('tokens', JSON.stringify({ accessToken, refreshToken }));
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('tokens');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get(url, params = {}) {
    return this.api.get(url, { params });
  }

  post(url, data = {}) {
    return this.api.post(url, data);
  }

  put(url, data = {}) {
    return this.api.put(url, data);
  }

  patch(url, data = {}) {
    return this.api.patch(url, data);
  }

  delete(url) {
    return this.api.delete(url);
  }

  upload(url, data) {
    return this.api.post(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  download(url, filename) {
    return this.api.get(url, {
      responseType: 'blob',
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  }
}

export const httpService = new HttpService();
export default httpService;