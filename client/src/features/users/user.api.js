import axios from '../../app/config/axios.js';

const userApi = {
  // ======================================================
  // LIST
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      '/users',
      {
        params,
      }
    );
  },

  // ======================================================
  // DETAIL
  // ======================================================

  getOne: (id) => {
    return axios.get(
      `/users/${id}`
    );
  },

  // ======================================================
  // CREATE
  // Admin only
  // ======================================================

  create: (data) => {
    return axios.post(
      '/users',
      data
    );
  },

  // ======================================================
  // LAWYERS
  // ======================================================

  getLawyers: () => {
    return axios.get(
      '/users',
      {
        params: {
          role: 'lawyer',
        },
      }
    );
  },

  // ======================================================
  // PROFILE UPDATE
  // Rol ve aktiflik burada değiştirilmez.
  // ======================================================

  update: (id, data) => {
    return axios.patch(
      `/users/${id}`,
      data
    );
  },

  // ======================================================
  // ROLE
  // ======================================================

  changeRole: (
    id,
    role
  ) => {
    return axios.patch(
      `/users/${id}/role`,
      {
        role,
      }
    );
  },

  // ======================================================
  // ACTIVE / PASSIVE
  // Backend mevcut değeri toggle ediyor.
  // ======================================================

  toggleActive: (id) => {
    return axios.patch(
      `/users/${id}/toggle-active`
    );
  },

  // ======================================================
  // PERMISSIONS - GET
  // Rol varsayılanları + kullanıcı override'ları +
  // efektif yetkiler
  // ======================================================

  getPermissions: (id) => {
    return axios.get(
      `/users/${id}/permissions`
    );
  },

  // ======================================================
  // PERMISSIONS - UPDATE
  //
  // data:
  // {
  //   permissions: {
  //     delete_documents: true,
  //     edit_payments: false
  //   }
  // }
  // ======================================================

  updatePermissions: (
    id,
    permissions
  ) => {
    return axios.patch(
      `/users/${id}/permissions`,
      {
        permissions,
      }
    );
  },

  // ======================================================
  // PERMISSIONS - RESET
  // Kullanıcıyı rol varsayılanlarına döndürür.
  // ======================================================

  resetPermissions: (id) => {
    return axios.delete(
      `/users/${id}/permissions`
    );
  },

  // ======================================================
  // PERMISSIONS - PRESET
  //
  // preset örnek:
  // STANDARD_LAWYER
  // SENIOR_LAWYER
  // MANAGING_LAWYER
  // ======================================================

  applyPermissionPreset: (
    id,
    preset
  ) => {
    return axios.post(
      `/users/${id}/permissions/preset`,
      {
        preset,
      }
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  delete: (id) => {
    return axios.delete(
      `/users/${id}`
    );
  },
};

export default userApi;