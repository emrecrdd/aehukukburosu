import axios from '../../app/config/axios.js';

import {
  API_ROUTES,
} from '../../constants/apiRoutes.js';

const {
  MEETINGS,
} =
  API_ROUTES;

const meetingApi = {

  // ======================================================
  // LIST
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      MEETINGS.GET_ALL,
      {
        params,
      }
    );
  },

  // ======================================================
  // DETAIL
  // ======================================================

  getOne: (
    id
  ) => {
    return axios.get(
      MEETINGS.GET_ONE(
        id
      )
    );
  },

  // ======================================================
  // CALENDAR / ICS
  // ======================================================

  downloadCalendar: (
    id
  ) => {
    return axios.get(
      `${MEETINGS.GET_ONE(
        id
      )}/calendar`,
      {
        responseType:
          'blob',
      }
    );
  },

  // ======================================================
  // CREATE
  // ======================================================

  create: (
    data
  ) => {
    return axios.post(
      MEETINGS.CREATE,
      data
    );
  },

  // ======================================================
  // UPDATE
  // ======================================================

  update: (
    id,
    data
  ) => {
    return axios.put(
      MEETINGS.UPDATE(
        id
      ),
      data
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  delete: (
    id
  ) => {
    return axios.delete(
      MEETINGS.DELETE(
        id
      )
    );
  },

  // ======================================================
  // STATUS
  // ======================================================

  updateStatus: (
    id,
    status
  ) => {
    return axios.patch(
      MEETINGS.UPDATE_STATUS(
        id
      ),
      {
        status,
      }
    );
  },

  // ======================================================
  // MY MEETINGS
  // ======================================================

  getMyMeetings: (
    params = {}
  ) => {
    return axios.get(
      MEETINGS.MY_MEETINGS,
      {
        params,
      }
    );
  },

  // ======================================================
  // UPCOMING
  // ======================================================

  getUpcoming: (
    params = {}
  ) => {
    return axios.get(
      MEETINGS.UPCOMING,
      {
        params,
      }
    );
  },

  // ======================================================
  // BY CASE
  // ======================================================

  getByCase: (
    caseId,
    params = {}
  ) => {
    return axios.get(
      MEETINGS.BY_CASE(
        caseId
      ),
      {
        params,
      }
    );
  },

  // ======================================================
  // BY CLIENT
  // ======================================================

  getByClient: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      MEETINGS.BY_CLIENT(
        clientId
      ),
      {
        params,
      }
    );
  },

  // ======================================================
  // CLIENT COCKPIT TIMELINE
  // ======================================================

  getClientTimeline: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      MEETINGS.CLIENT_TIMELINE(
        clientId
      ),
      {
        params,
      }
    );
  },
};

export default meetingApi;