import axios from '../../app/config/axios.js';

const dashboardApi = {
  getStats: () => {
    return axios.get('/dashboard/stats');
  },

  getHearings: () => {
    return axios.get('/dashboard/hearings');
  },

  getTasks: () => {
    return axios.get('/dashboard/tasks');
  },

  getActivities: () => {
    return axios.get('/dashboard/activities');
  },
};

export default dashboardApi;