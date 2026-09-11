export const CONSULTATION_STATUS = Object.freeze({
  NEW: 'new',
  EVALUATING: 'evaluating',
  MEETING_SCHEDULED: 'meeting_scheduled',
  IN_PROGRESS: 'in_progress',
  WAITING_CLIENT: 'waiting_client',
  COMPLETED: 'completed',
  CONVERTED_TO_CASE: 'converted_to_case',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

export const CONSULTATION_TYPE = Object.freeze({
  ORAL: 'oral',
  WRITTEN_OPINION: 'written_opinion',
  CONTRACT_REVIEW: 'contract_review',
  CONTRACT_DRAFTING: 'contract_drafting',
  NOTICE_PETITION: 'notice_petition',
  CORPORATE: 'corporate',
  CONTINUOUS: 'continuous',
  OTHER: 'other',
});

export const CONSULTATION_MODE = Object.freeze({
  OFFICE: 'office',
  PHONE: 'phone',
  ONLINE: 'online',
  ON_SITE: 'on_site',
  WRITTEN: 'written',
});

export const CONSULTATION_SERVICE_MODEL = Object.freeze({
  ONE_TIME: 'one_time',
  ONGOING: 'ongoing',
});

export const CONSULTATION_PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export const CONSULTATION_BILLING_TYPE = Object.freeze({
  FREE: 'free',
  FIXED: 'fixed',
  HOURLY: 'hourly',
  RETAINER: 'retainer',
});

export const CONSULTATION_CURRENCY = Object.freeze({
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
});

export const CONSULTATION_SOURCE = Object.freeze({
  REFERRAL: 'referral',
  WEB: 'web',
  EXISTING_CLIENT: 'existing_client',
  PHONE: 'phone',
  OTHER: 'other',
});
