import axios from '../../app/config/axios.js';

const notificationApi = {
  // Tüm bildirimleri getir
  getMyNotifications: (params) => {
    console.log('📡 API getMyNotifications çağrıldı', params);
    return axios.get('/notifications/my', { params });
  },

  // Okunmamış bildirim sayısı
  getUnreadCount: () => {
    console.log('📡 API getUnreadCount çağrıldı');
    return axios.get('/notifications/unread-count');
  },

  // Tek bildirim getir
  getOne: (id) => {
    return axios.get(`/notifications/${id}`);
  },

  // Okundu işaretle
  markAsRead: (id) => {
    return axios.patch(`/notifications/${id}/read`);
  },

  // Tümünü okundu işaretle
  markAllAsRead: () => {
    return axios.post('/notifications/mark-all-read');
  },

  // Sil
  delete: (id) => {
    return axios.delete(`/notifications/${id}`);
  },

  // Tümünü sil
  deleteAll: () => {
    return axios.delete('/notifications/remove-all');
  },
};

export default notificationApi;