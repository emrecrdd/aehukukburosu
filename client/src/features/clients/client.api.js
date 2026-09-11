import axios from '../../app/config/axios.js';
import { API_ROUTES } from '../../constants/apiRoutes.js';

const {
  CLIENTS,
} = API_ROUTES;

const clientApi = {
  // ======================================================
  // CLIENTS
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      CLIENTS.GET_ALL,
      {
        params,
      }
    );
  },

  getOne: (id) => {
    return axios.get(
      CLIENTS.GET_ONE(id)
    );
  },

  create: (data) => {
    return axios.post(
      CLIENTS.CREATE,
      data
    );
  },

  update: (id, data) => {
    return axios.patch(
      CLIENTS.UPDATE(id),
      data
    );
  },

  delete: (id) => {
    return axios.delete(
      CLIENTS.DELETE(id)
    );
  },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics: () => {
    return axios.get(
      CLIENTS.STATISTICS
    );
  },

  // ======================================================
  // RELATED DATA
  // ======================================================

  getCaseHistory: (id) => {
    return axios.get(
      CLIENTS.CASE_HISTORY(id)
    );
  },

  getPayments: (id) => {
    return axios.get(
      CLIENTS.PAYMENTS(id)
    );
  },

  getNotes: (id) => {
    return axios.get(
      CLIENTS.NOTES(id)
    );
  },
};

export default clientApi;