const createCrudRoutes = (base) => ({
  BASE: base,
  GET_ALL: base,
  GET_ONE: (id) => `${base}/${id}`,
  CREATE: base,
  UPDATE: (id) => `${base}/${id}`,
  DELETE: (id) => `${base}/${id}`,
});

export const API_ROUTES = {
  // ====================================================
  // AUTH
  // ====================================================

  AUTH: {
    LOGIN: '/auth/login',

    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',

    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',

    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // ====================================================
  // USERS
  // ====================================================

  USERS: {
    ...createCrudRoutes('/users'),

    ME: '/users/me',
  },

  // ====================================================
  // CLIENTS
  // ====================================================

  CLIENTS: {
    ...createCrudRoutes('/clients'),

    STATISTICS:
      '/clients/statistics',

    CASE_HISTORY:
      (id) =>
        `/clients/${id}/cases`,

    PAYMENTS:
      (id) =>
        `/clients/${id}/payments`,

    NOTES:
      (id) =>
        `/clients/${id}/notes`,
  },

  // ====================================================
  // CASES
  // ====================================================

  CASES: {
    ...createCrudRoutes('/cases'),

    STATISTICS:
      '/cases/statistics',

    UPDATE_STATUS:
      (id) =>
        `/cases/${id}/status`,

    ADD_PARTY:
      (id) =>
        `/cases/${id}/parties`,

    REMOVE_PARTY:
      (id, partyId) =>
        `/cases/${id}/parties/${partyId}`,

    GET_PARTIES:
      (id) =>
        `/cases/${id}/parties`,

    GET_DOCUMENTS:
      (id) =>
        `/cases/${id}/documents`,

    GET_TASKS:
      (id) =>
        `/cases/${id}/tasks`,

    GET_EVENTS:
      (id) =>
        `/cases/${id}/events`,

    GET_PAYMENTS:
      (id) =>
        `/cases/${id}/payments`,

    GET_NOTES:
      (id) =>
        `/cases/${id}/notes`,
  },

  // ====================================================
  // CONSULTATIONS
  // ====================================================

  CONSULTATIONS: {
    ...createCrudRoutes(
      '/consultations'
    ),

    STATISTICS:
      '/consultations/statistics',

    ASSIGNABLE_USERS:
      '/consultations/assignable-users',

    UPDATE_STATUS:
      (id) =>
        `/consultations/${id}/status`,

    ADD_ASSIGNEE:
      (id) =>
        `/consultations/${id}/assignees`,

    REMOVE_ASSIGNEE:
      (id, userId) =>
        `/consultations/${id}/assignees/${userId}`,

    GET_TASKS:
      (id) =>
        `/consultations/${id}/tasks`,

    GET_MEETINGS:
      (id) =>
        `/consultations/${id}/meetings`,

    GET_DOCUMENTS:
      (id) =>
        `/consultations/${id}/documents`,

    GET_NOTES:
      (id) =>
        `/consultations/${id}/notes`,

    ADD_NOTE:
      (id) =>
        `/consultations/${id}/notes`,

    CONVERT_TO_CLIENT:
      (id) =>
        `/consultations/${id}/convert-to-client`,

    CONVERT_TO_CASE:
      (id) =>
        `/consultations/${id}/convert-to-case`,
  },

  // ====================================================
  // DOCUMENTS
  // ====================================================

DOCUMENTS: {
  ...createCrudRoutes(
    '/documents'
  ),

  UPLOAD:
    '/documents/upload',

  UPLOAD_MULTIPLE:
    '/documents/upload-multiple',

  BULK_DELETE:
    '/documents/bulk-delete',

  DOWNLOAD:
    (id) =>
      `/documents/${id}/download`,

  PREVIEW:
    (id) =>
      `/documents/${id}/preview`,

  UDF_PREVIEW:
    (id) =>
      `/documents/${id}/udf-preview`,

  VERSIONS:
    (id) =>
      `/documents/${id}/versions`,

  UPLOAD_VERSION:
    (id) =>
      `/documents/${id}/versions`,

  CATEGORIES:
    '/documents/categories',

  STATISTICS:
    '/documents/statistics',
},

  // ====================================================
  // TASKS
  // ====================================================

  TASKS: {
    ...createCrudRoutes('/tasks'),

    UPDATE_STATUS:
      (id) =>
        `/tasks/${id}/status`,

    ASSIGN:
      (id) =>
        `/tasks/${id}/assign`,

    ASSIGNABLE_USERS:
      '/tasks/assignable-users',

    START:
      (id) =>
        `/tasks/${id}/start`,

    COMPLETE:
      (id) =>
        `/tasks/${id}/complete`,

    APPROVE:
      (id) =>
        `/tasks/${id}/approve`,

    PROGRESS:
      (id) =>
        `/tasks/${id}/progress`,

    NOTES:
      (id) =>
        `/tasks/${id}/notes`,

    MY_TASKS:
      '/tasks/my',

    MY_OVERDUE:
      '/tasks/my/overdue',

    MY_UPCOMING:
      '/tasks/my/upcoming',

    STATISTICS:
      '/tasks/statistics',

    // ==================================================
    // CLIENT TASKS
    // ==================================================

    CLIENT_TASKS:
      (clientId) =>
        `/tasks/client/${clientId}`,

    CLIENT_OVERVIEW:
      (clientId) =>
        `/tasks/client/${clientId}/overview`,
  },

  // ====================================================
  // MEETINGS
  // ====================================================

  MEETINGS: {
    ...createCrudRoutes('/meetings'),

    UPDATE_STATUS:
      (id) =>
        `/meetings/${id}/status`,

    // ==================================================
    // SPECIAL ROUTES
    // ==================================================

    MY_MEETINGS:
      '/meetings/my',

    UPCOMING:
      '/meetings/upcoming',

    CASE_MEETINGS:
      (caseId) =>
        `/meetings/case/${caseId}`,

    // ==================================================
    // CLIENT MEETINGS
    // ==================================================

    CLIENT_MEETINGS:
      (clientId) =>
        `/meetings/client/${clientId}`,

    CLIENT_TIMELINE:
      (clientId) =>
        `/meetings/client/${clientId}/timeline`,
  },

  // ====================================================
  // EVENTS / CALENDAR
  // ====================================================

  EVENTS: {
    ...createCrudRoutes('/events'),

    CALENDAR:
      '/events/calendar',

    UPDATE_STATUS:
      (id) =>
        `/events/${id}/status`,
  },

  // ====================================================
  // FINANCE
  // ====================================================

  FINANCE: {
    ...createCrudRoutes('/finance'),

    SUMMARY:
      '/finance/summary',

    MONTHLY_REVENUE:
      '/finance/monthly-revenue',

    OUTSTANDING:
      '/finance/outstanding',

    STATISTICS:
      '/finance/statistics',

    CLIENT_PAYMENTS:
      (id) =>
        `/finance/client/${id}`,

    CLIENT_SUMMARY:
      (id) =>
        `/finance/client/${id}/summary`,

    CASE_PAYMENTS:
      (id) =>
        `/finance/case/${id}`,
  },

  // ====================================================
  // POWER OF ATTORNEY
  // ====================================================

  POWER_OF_ATTORNEY: {
    ...createCrudRoutes(
      '/power-of-attorney'
    ),

    UPDATE_STATUS:
      (id) =>
        `/power-of-attorney/${id}/status`,
  },

  // ====================================================
  // TEMPLATES
  // ====================================================

  TEMPLATES: {
    ...createCrudRoutes('/templates'),

    DOWNLOAD:
      (id) =>
        `/templates/${id}/download`,
  },

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  NOTIFICATIONS: {
    BASE:
      '/notifications',

    MY:
      '/notifications/my',

    MARK_AS_READ:
      (id) =>
        `/notifications/${id}/read`,

    MARK_ALL_AS_READ:
      '/notifications/read-all',

    DELETE:
      (id) =>
        `/notifications/${id}`,

    DELETE_ALL:
      '/notifications',

    UNREAD_COUNT:
      '/notifications/unread-count',
  },

  // ====================================================
  // AUDIT LOGS
  // ====================================================

  AUDIT_LOGS: {
    ...createCrudRoutes(
      '/audit-logs'
    ),
  },

  // ====================================================
  // SEARCH
  // ====================================================

  SEARCH: {
    BASE:
      '/search',

    ALL:
      '/search/all',

    CLIENTS:
      '/search/clients',

    CASES:
      '/search/cases',

    DOCUMENTS:
      '/search/documents',

    TASKS:
      '/search/tasks',

    SUGGESTIONS:
      '/search/suggestions',
  },

  // ====================================================
  // AI
  // ====================================================

  AI: {
    BASE:
      '/ai',

    ANALYZE_DOCUMENT:
      '/ai/analyze-document',

    SUMMARIZE_CASE:
      (id) =>
        `/ai/summarize-case/${id}`,

    LEGAL_ADVICE:
      '/ai/legal-advice',

    EXTRACT_ENTITIES:
      '/ai/extract-entities',

    GENERATE_DRAFT:
      '/ai/generate-draft',

    CLASSIFY_DOCUMENT:
      '/ai/classify-document',

    RECOMMENDATIONS:
      (id) =>
        `/ai/case-recommendations/${id}`,

    SENTIMENT:
      '/ai/analyze-sentiment',
  },
};

export default API_ROUTES;
