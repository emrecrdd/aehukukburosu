export const API_PREFIX = '/api';

export const ROUTES = {
  // Auth
  AUTH: {
    BASE: '/auth',
    LOGIN: '/login',
    LOGOUT: '/logout',
    REFRESH_TOKEN: '/refresh-token',
    PROFILE: '/profile',
    CHANGE_PASSWORD: '/change-password',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_EMAIL: '/verify-email',
  },

  // Clients
  CLIENTS: {
    BASE: '/clients',
    GET_ALL: '/',
    GET_ONE: '/:id',
    CREATE: '/',
    UPDATE: '/:id',
    DELETE: '/:id',
    STATISTICS: '/statistics',
    CASE_HISTORY: '/:id/cases',
    PAYMENTS: '/:id/payments',
    NOTES: '/:id/notes',
  },

  // Cases
  CASES: {
    BASE: '/cases',
    GET_ALL: '/',
    GET_ONE: '/:id',
    CREATE: '/',
    UPDATE: '/:id',
    DELETE: '/:id',
    STATISTICS: '/statistics',
    UPDATE_STATUS: '/:id/status',
    ADD_PARTY: '/:id/parties',
    REMOVE_PARTY: '/:id/parties/:partyId',
    GET_PARTIES: '/:id/parties',
    GET_DOCUMENTS: '/:id/documents',
    GET_TASKS: '/:id/tasks',
    GET_EVENTS: '/:id/events',
    GET_PAYMENTS: '/:id/payments',
    GET_NOTES: '/:id/notes',
  },

  // Documents
  DOCUMENTS: {
    BASE: '/documents',
    GET_ALL: '/',
    GET_ONE: '/:id',
    UPLOAD: '/upload',
    UPLOAD_MULTIPLE: '/upload-multiple',
    UPDATE: '/:id',
    DELETE: '/:id',
    DOWNLOAD: '/:id/download',
    PREVIEW: '/:id/preview',
    VERSIONS: '/:id/versions',
    CATEGORIES: '/categories',
    STATISTICS: '/statistics',
  },

  // Tasks
  TASKS: {
    BASE: '/tasks',
    GET_ALL: '/',
    GET_ONE: '/:id',
    CREATE: '/',
    UPDATE: '/:id',
    DELETE: '/:id',
    UPDATE_STATUS: '/:id/status',
    ASSIGN: '/:id/assign',
    MY_TASKS: '/my',
    MY_OVERDUE: '/my/overdue',
    MY_UPCOMING: '/my/upcoming',
    STATISTICS: '/statistics',
  },

  // Finance
  FINANCE: {
    BASE: '/finance',
    GET_ALL: '/',
    GET_ONE: '/:id',
    CREATE: '/',
    UPDATE: '/:id',
    DELETE: '/:id',
    SUMMARY: '/summary',
    MONTHLY_REVENUE: '/monthly-revenue',
    OUTSTANDING: '/outstanding',
    STATISTICS: '/statistics',
    CLIENT_PAYMENTS: '/client/:clientId',
    CLIENT_SUMMARY: '/client/:clientId/summary',
    CASE_PAYMENTS: '/case/:caseId',
  },

  // Search
  SEARCH: {
    BASE: '/search',
    SEARCH: '/',
    ALL: '/all',
    CLIENTS: '/clients',
    CASES: '/cases',
    DOCUMENTS: '/documents',
    TASKS: '/tasks',
    NOTES: '/notes',
    SUGGESTIONS: '/suggestions',
  },

  // AI
  AI: {
    BASE: '/ai',
    ANALYZE_DOCUMENT: '/analyze-document',
    SUMMARIZE_CASE: '/summarize-case/:caseId',
    LEGAL_ADVICE: '/legal-advice',
    EXTRACT_ENTITIES: '/extract-entities',
    GENERATE_DRAFT: '/generate-draft',
    CLASSIFY_DOCUMENT: '/classify-document',
    RECOMMENDATIONS: '/case-recommendations/:caseId',
    SENTIMENT: '/analyze-sentiment',
  },
};

// Helper to get full path
export const getFullPath = (route) => {
  return `${API_PREFIX}${route}`;
};

// Helper to build URL with params
export const buildUrl = (route, params = {}) => {
  let url = route;
  Object.keys(params).forEach((key) => {
    url = url.replace(`:${key}`, params[key]);
  });
  return url;
};

export default {
  API_PREFIX,
  ROUTES,
  getFullPath,
  buildUrl,
};