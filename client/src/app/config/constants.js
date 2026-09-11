// ======================================================
// APPLICATION
// ======================================================

export const APP_NAME =
  'Derkenar Hukuk Bürosu Yönetim Sistemi';

export const APP_VERSION =
  '1.0.0';

// ======================================================
// DATE / TIME
// ======================================================

export const DATE_FORMATS = {
  DISPLAY: 'DD MMMM YYYY',
  DISPLAY_WITH_TIME: 'DD MMMM YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
  TIME: 'HH:mm',
};

export const APP_TIMEZONE =
  'Europe/Istanbul';

export const APP_LOCALE =
  'tr-TR';

// ======================================================
// PAGINATION
// ======================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 25, 50, 100],
};

// ======================================================
// FILES
// ======================================================

export const FILE_TYPES = {
  PDF: 'pdf',
  WORD: 'word',
  EXCEL: 'excel',
  IMAGE: 'image',
  OTHER: 'other',
};

export const FILE_TYPE_ICONS = {
  [FILE_TYPES.PDF]: '📄',
  [FILE_TYPES.WORD]: '📝',
  [FILE_TYPES.EXCEL]: '📊',
  [FILE_TYPES.IMAGE]: '🖼️',
  [FILE_TYPES.OTHER]: '📎',
};

const MB = 1024 * 1024;

export const FILE_SIZE_LIMITS = {
  MAX_SIZE: 10 * MB,
  MAX_IMAGE_SIZE: 5 * MB,
};

// ======================================================
// NOTIFICATIONS
// ======================================================

export const NOTIFICATION_TYPES = {
  TASK_REMINDER: 'task_reminder',
  TASK_OVERDUE: 'task_overdue',
  EVENT_REMINDER: 'event_reminder',
  CASE_UPDATE: 'case_update',
  DOCUMENT_UPLOAD: 'document_upload',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_OVERDUE: 'payment_overdue',
};

// ======================================================
// SOCKET EVENTS
// ======================================================

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  NOTIFICATION: 'notification',

  TASK_UPDATED: 'task_updated',
  CASE_UPDATED: 'case_updated',
  DOCUMENT_UPLOADED: 'document_uploaded',
  PAYMENT_RECEIVED: 'payment_received',
};