import axios from '../../app/config/axios.js';

export const powerOfAttorneyApi = {
  // ✅ Tüm Vekaletnameleri Getir
  getAll: (params) => {
    return axios.get('/power-of-attorney', { params });
  },

  // ✅ Tek Vekaletname Getir
  getOne: (id) => {
    return axios.get(`/power-of-attorney/${id}`);
  },

  // ✅ Müvekkile Göre Vekaletnameler
  getByClient: (clientId) => {
    return axios.get(`/power-of-attorney/client/${clientId}`);
  },

  // ✅ Yeni Vekaletname Oluştur (FormData desteği)
  create: (data) => {
    // Eğer data FormData ise, header'ları otomatik ayarla
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return axios.post('/power-of-attorney', data, config);
  },

  // ✅ Vekaletname Güncelle
  update: (id, data) => {
    return axios.put(`/power-of-attorney/${id}`, data);
  },

  // ✅ Vekaletname Sil
  delete: (id) => {
    return axios.delete(`/power-of-attorney/${id}`);
  },

  // ✅ Durum Güncelle
  updateStatus: (id, status) => {
    return axios.patch(`/power-of-attorney/${id}/status`, { status });
  },

  // ✅ İstatistik
  getStatistics: () => {
    return axios.get('/power-of-attorney/statistics');
  },
};

export default powerOfAttorneyApi;