import axios from '../../app/config/axios.js';

const eventApi = {
  // ======================================================
  // EVENTS
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      '/events',
      {
        params,
      }
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      `/events/${id}`
    );
  },

  // ======================================================
  // CALENDAR / ICS
  // ======================================================

  downloadCalendar: (
    id
  ) => {
    return axios.get(
      `/events/${id}/calendar`,
      {
        responseType:
          'blob',
      }
    );
  },

  create: (
    data
  ) => {
    return axios.post(
      '/events',
      data
    );
  },

  update: (
    id,
    data
  ) => {
    return axios.patch(
      `/events/${id}`,
      data
    );
  },

  updateStatus: (
    id,
    status
  ) => {
    return axios.patch(
      `/events/${id}/status`,
      {
        status,
      }
    );
  },

  remove: (
    id
  ) => {
    return axios.delete(
      `/events/${id}`
    );
  },

  // ======================================================
  // USER
  // ======================================================

  getMyEvents: () => {
    return axios.get(
      '/events/my'
    );
  },

  // ======================================================
  // CALENDAR
  // ======================================================

  getCalendarEvents: (
    params = {}
  ) => {
    return axios.get(
      '/events/calendar',
      {
        params,
      }
    );
  },

  // ======================================================
  // CASE
  // ======================================================

  getByCase: (
    caseId
  ) => {
    return axios.get(
      `/events/case/${caseId}`
    );
  },
};

export default eventApi;