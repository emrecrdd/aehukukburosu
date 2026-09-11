import axios from '../../app/config/axios.js';

import {
  API_ROUTES,
} from '../../constants/apiRoutes.js';

const {
  CASES,
} = API_ROUTES;

const caseApi = {

  // ======================================================
  // CASES
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      CASES.GET_ALL,
      {
        params,
      }
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      CASES.GET_ONE(
        id
      )
    );
  },

  create: (
    data
  ) => {
    return axios.post(
      CASES.CREATE,
      data
    );
  },

  // ======================================================
  // ASSIGNABLE LAWYERS
  // ======================================================

  getAssignableLawyers:
    () => {
      return axios.get(
        '/cases/assignable-lawyers'
      );
    },

  // ======================================================
  // UPDATE
  // ======================================================

  // Normal tam güncelleme
  update: (
    id,
    data
  ) => {
    return axios.put(
      CASES.UPDATE(
        id
      ),
      data
    );
  },

  // AI önerileri / kısmi güncelleme
  // Sadece gönderilen alanları değiştirir
  patch: (
    id,
    data
  ) => {
    return axios.patch(
      CASES.UPDATE(
        id
      ),
      data
    );
  },

  delete: (
    id
  ) => {
    return axios.delete(
      CASES.DELETE(
        id
      )
    );
  },

  updateStatus: (
    id,
    status
  ) => {
    return axios.patch(
      CASES.UPDATE_STATUS(
        id
      ),
      {
        status,
      }
    );
  },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics:
    () => {
      return axios.get(
        CASES.STATISTICS
      );
    },

  // ======================================================
  // PARTIES
  // ======================================================

  getParties: (
    id
  ) => {
    return axios.get(
      CASES.GET_PARTIES(
        id
      )
    );
  },

  addParty: (
    id,
    data
  ) => {
    return axios.post(
      CASES.ADD_PARTY(
        id
      ),
      data
    );
  },

  removeParty: (
    id,
    partyId
  ) => {
    return axios.delete(
      CASES.REMOVE_PARTY(
        id,
        partyId
      )
    );
  },

  // ======================================================
  // RELATED DATA
  // ======================================================

  getDocuments: (
    id
  ) => {
    return axios.get(
      CASES.GET_DOCUMENTS(
        id
      )
    );
  },

  getTasks: (
    id
  ) => {
    return axios.get(
      CASES.GET_TASKS(
        id
      )
    );
  },

  getEvents: (
    id
  ) => {
    return axios.get(
      CASES.GET_EVENTS(
        id
      )
    );
  },

  getPayments: (
    id
  ) => {
    return axios.get(
      CASES.GET_PAYMENTS(
        id
      )
    );
  },

  getNotes: (
    id
  ) => {
    return axios.get(
      CASES.GET_NOTES(
        id
      )
    );
  },

};

export default caseApi;