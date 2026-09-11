import axios from '../../app/config/axios.js';

const auditLogApi = {
  // ✅ Logları getir (filtreli)
  getAll: (params = {}) => {
    return axios.get('/audit-logs', { params });
  },

  // ✅ Tek bir log detayı
  getOne: (id) => {
    return axios.get(`/audit-logs/${id}`);
  },

  // ✅ Log filtreleri için seçenekler
  getFilters: () => {
    return axios.get('/audit-logs/filters');
  },

  // ✅ YENİ: Tek log sil
  delete: (id) => {
    return axios.delete(`/audit-logs/${id}`);
  },

  // ✅ YENİ: Toplu log sil
  bulkDelete: (ids) => {
    return axios.post('/audit-logs/bulk-delete', { ids });
  },

  // ✅ YENİ: Eski logları temizle (varsayılan 30 gün)
  cleanOldLogs: (days = 30) => {
    return axios.delete('/audit-logs/clean-old', { params: { days } });
  },
};

export default auditLogApi;