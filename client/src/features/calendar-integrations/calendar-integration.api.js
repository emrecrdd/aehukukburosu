import axios
  from '../../app/config/axios.js';

// ======================================================
// ENDPOINTS
// ======================================================

const CALENDAR_INTEGRATIONS = {
  GOOGLE_STATUS:
    '/calendar-integrations/google/status',

  GOOGLE_CONNECT:
    '/calendar-integrations/google/connect',

  GOOGLE_DISCONNECT:
    '/calendar-integrations/google',
};

// ======================================================
// API
// ======================================================

export const calendarIntegrationApi = {
  // ====================================================
  // GOOGLE CONNECTION STATUS
  // ====================================================

  getGoogleStatus: () => {
    return axios.get(
      CALENDAR_INTEGRATIONS
        .GOOGLE_STATUS
    );
  },

  // ====================================================
  // GOOGLE OAUTH URL
  // ====================================================

  getGoogleConnectUrl: () => {
    return axios.get(
      CALENDAR_INTEGRATIONS
        .GOOGLE_CONNECT
    );
  },

  // ====================================================
  // GOOGLE DISCONNECT
  // ====================================================

  disconnectGoogle: () => {
    return axios.delete(
      CALENDAR_INTEGRATIONS
        .GOOGLE_DISCONNECT
    );
  },
};

export default calendarIntegrationApi;