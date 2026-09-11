import axios from '../../app/config/axios.js';

const performanceApi = {
  // ======================================================
  // MY PERFORMANCE
  // ======================================================

  getMyPerformance: (
    params = {}
  ) => {
    return axios.get(
      '/performance/me',
      {
        params,
      }
    );
  },

  // ======================================================
  // TEAM OVERVIEW
  // Yetki:
  // view_team_performance
  // ======================================================

  getTeamOverview: (
    params = {}
  ) => {
    return axios.get(
      '/performance/overview',
      {
        params,
      }
    );
  },

  // ======================================================
  // USERS PERFORMANCE
  // Yetki:
  // view_team_performance
  // ======================================================

  getUsersPerformance: (
    params = {}
  ) => {
    return axios.get(
      '/performance/users',
      {
        params,
      }
    );
  },

  // ======================================================
  // USER PERFORMANCE DETAIL
  // Yetki:
  // view_team_performance
  // ======================================================

  getUserPerformance: (
    userId,
    params = {}
  ) => {
    return axios.get(
      `/performance/users/${userId}`,
      {
        params,
      }
    );
  },
};

export default performanceApi;