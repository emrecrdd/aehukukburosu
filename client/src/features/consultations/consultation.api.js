import axios from '../../app/config/axios.js';
import { API_ROUTES } from '../../constants/apiRoutes.js';

const { CONSULTATIONS } = API_ROUTES;

const consultationApi = {
  getAll: (params = {}) =>
    axios.get(CONSULTATIONS.GET_ALL, { params }),

  getOne: (id) =>
    axios.get(CONSULTATIONS.GET_ONE(id)),

  create: (data) =>
    axios.post(CONSULTATIONS.CREATE, data),

  // Backend normal consultation update'i PATCH ile kabul eder.
  update: (id, data) =>
    axios.patch(CONSULTATIONS.UPDATE(id), data),

  delete: (id) =>
    axios.delete(CONSULTATIONS.DELETE(id)),

  updateStatus: (id, status) =>
    axios.patch(CONSULTATIONS.UPDATE_STATUS(id), { status }),

  getAssignableUsers: () =>
    axios.get(CONSULTATIONS.ASSIGNABLE_USERS),

  getStatistics: () =>
    axios.get(CONSULTATIONS.STATISTICS),

  addAssignee: (id, data) =>
    axios.post(CONSULTATIONS.ADD_ASSIGNEE(id), data),

  removeAssignee: (id, userId) =>
    axios.delete(CONSULTATIONS.REMOVE_ASSIGNEE(id, userId)),

  getTasks: (id) =>
    axios.get(CONSULTATIONS.GET_TASKS(id)),

  getMeetings: (id) =>
    axios.get(CONSULTATIONS.GET_MEETINGS(id)),

  getDocuments: (id) =>
    axios.get(CONSULTATIONS.GET_DOCUMENTS(id)),

  // Notes akışı mevcut frontend uyumluluğu için korunuyor.
  // Notes domain hardening'i sonraki aşamada ele alınacak.
  getNotes: (id) =>
    axios.get(CONSULTATIONS.GET_NOTES(id)),

  addNote: (id, data) =>
    axios.post(CONSULTATIONS.ADD_NOTE(id), data),

  convertToClient: (id, data = {}) =>
    axios.post(CONSULTATIONS.CONVERT_TO_CLIENT(id), data),

  convertToCase: (id, data) =>
    axios.post(CONSULTATIONS.CONVERT_TO_CASE(id), data),
};

export default consultationApi;
