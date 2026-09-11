import axios from '../../app/config/axios.js';

import {
  API_ROUTES,
} from '../../constants/apiRoutes.js';

const {
  TASKS,
} =
  API_ROUTES;

const taskApi = {

  // ======================================================
  // LIST
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      TASKS.GET_ALL,
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
      TASKS.GET_ONE(
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
      `${TASKS.GET_ONE(
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
      TASKS.CREATE,
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
      TASKS.UPDATE(
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
      TASKS.DELETE(
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
      TASKS.UPDATE_STATUS(
        id
      ),
      {
        status,
      }
    );
  },

  // ======================================================
  // ASSIGN MULTIPLE USERS
  // ======================================================

  /*
   * Body:
   *
   * {
   *   assignee_ids: [
   *     'user-uuid-1',
   *     'user-uuid-2'
   *   ]
   * }
   */
  assignTask: (
    id,
    assignee_ids
  ) => {
    return axios.patch(
      TASKS.ASSIGN(
        id
      ),
      {
        assignee_ids,
      }
    );
  },

  // ======================================================
  // ASSIGNABLE USERS
  // ======================================================

  getAssignableUsers:
    () => {
      return axios.get(
        TASKS.ASSIGNABLE_USERS
      );
    },

  // ======================================================
  // MY TASKS
  // ======================================================

  getMyTasks: (
    params = {}
  ) => {
    return axios.get(
      TASKS.MY_TASKS,
      {
        params,
      }
    );
  },

  getMyOverdue:
    () => {
      return axios.get(
        TASKS.MY_OVERDUE
      );
    },

  getMyUpcoming:
    () => {
      return axios.get(
        TASKS.MY_UPCOMING
      );
    },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics:
    () => {
      return axios.get(
        TASKS.STATISTICS
      );
    },

  // ======================================================
  // CLIENT TASKS
  // ======================================================

  getByClient: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      TASKS.CLIENT_TASKS(
        clientId
      ),
      {
        params,
      }
    );
  },

  // ======================================================
  // CLIENT OVERVIEW
  // ======================================================

  getClientOverview: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      TASKS.CLIENT_OVERVIEW(
        clientId
      ),
      {
        params,
      }
    );
  },

  // ======================================================
  // START
  // ======================================================

  startTask: (
    id
  ) => {
    return axios.post(
      TASKS.START(
        id
      )
    );
  },

  // ======================================================
  // COMPLETE
  // ======================================================

  completeTask: (
    id,
    data
  ) => {
    return axios.post(
      TASKS.COMPLETE(
        id
      ),
      data
    );
  },

  // ======================================================
  // PROGRESS
  // ======================================================

  updateProgress: (
    id,
    progress
  ) => {
    return axios.patch(
      TASKS.PROGRESS(
        id
      ),
      {
        progress,
      }
    );
  },

  // ======================================================
  // APPROVE
  // ======================================================

  approveTask: (
    id
  ) => {
    return axios.post(
      TASKS.APPROVE(
        id
      )
    );
  },

  // ======================================================
  // NOTES
  // ======================================================

  addNote: (
    id,
    content
  ) => {
    return axios.post(
      TASKS.NOTES(
        id
      ),
      {
        content,
      }
    );
  },

  getNotes: (
    id
  ) => {
    return axios.get(
      TASKS.NOTES(
        id
      )
    );
  },
};

export default taskApi;