export const CONSULTATION_STATUS_OPTIONS = Object.freeze([
  { value: 'new', label: 'Yeni Talep' },
  { value: 'evaluating', label: 'Ön Değerlendirme' },
  { value: 'meeting_scheduled', label: 'Görüşme Planlandı' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'waiting_client', label: 'Müvekkilden Bekleniyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'converted_to_case', label: 'Davaya Dönüştü' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'cancelled', label: 'İptal' },
]);

export const CONSULTATION_TYPE_OPTIONS = Object.freeze([
  { value: 'oral', label: 'Sözlü Danışmanlık' },
  { value: 'written_opinion', label: 'Yazılı Hukuki Görüş' },
  { value: 'contract_review', label: 'Sözleşme İnceleme' },
  { value: 'contract_drafting', label: 'Sözleşme Hazırlama' },
  { value: 'notice_petition', label: 'İhtar / İhbar / Dilekçe' },
  { value: 'corporate', label: 'Şirket Danışmanlığı' },
  { value: 'continuous', label: 'Sürekli Hukuki Danışmanlık' },
  { value: 'other', label: 'Diğer' },
]);

export const CONSULTATION_MODE_OPTIONS = Object.freeze([
  { value: '', label: 'Belirtilmedi' },
  { value: 'office', label: 'Ofiste' },
  { value: 'phone', label: 'Telefon' },
  { value: 'online', label: 'Online' },
  { value: 'on_site', label: 'Yerinde' },
  { value: 'written', label: 'Yazılı' },
]);

export const CONSULTATION_SERVICE_MODEL_OPTIONS = Object.freeze([
  { value: 'one_time', label: 'Tek Seferlik' },
  { value: 'ongoing', label: 'Sürekli' },
]);

export const CONSULTATION_PRIORITY_OPTIONS = Object.freeze([
  { value: 'low', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Yüksek' },
  { value: 'critical', label: 'Kritik' },
]);

export const CONSULTATION_BILLING_TYPE_OPTIONS = Object.freeze([
  { value: 'free', label: 'Ücretsiz' },
  { value: 'fixed', label: 'Sabit' },
  { value: 'hourly', label: 'Saatlik' },
  { value: 'retainer', label: 'Aylık / Retainer' },
]);

export const CONSULTATION_SOURCE_OPTIONS = Object.freeze([
  { value: '', label: 'Belirtilmedi' },
  { value: 'referral', label: 'Referans' },
  { value: 'web', label: 'Web' },
  { value: 'existing_client', label: 'Mevcut Müvekkil' },
  { value: 'phone', label: 'Telefon' },
  { value: 'other', label: 'Diğer' },
]);

export const CONSULTATION_CURRENCY_OPTIONS = Object.freeze([
  { value: 'TRY', label: 'TRY — Türk Lirası' },
  { value: 'USD', label: 'USD — Amerikan Doları' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — İngiliz Sterlini' },
]);

// Backend: DECIMAL(14,2) => 12 tam sayı + 2 ondalık basamak.
export const CONSULTATION_MAX_AGREED_FEE = 999999999999.99;

export const normalizeConsultationFeeAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
};

export const getConsultationFeeValidationError = (value, billingType) => {
  if (billingType === 'free') return '';

  const raw = String(value ?? '').trim();
  if (!raw) return 'Ücretli danışmanlıkta ücret zorunludur';

  // Number input nokta üretir; yapıştırılan virgülü de kullanıcı dostu kabul ediyoruz.
  const normalized = raw.replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return 'Ücret en fazla 2 ondalık basamak içermelidir';
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Ücretli danışmanlıkta ücret 0’dan büyük olmalıdır';
  }

  if (numeric > CONSULTATION_MAX_AGREED_FEE) {
    return 'Ücret en fazla 999.999.999.999,99 olabilir';
  }

  return '';
};

export const CONSULTATION_TERMINAL_STATUSES = Object.freeze([
  'completed',
  'converted_to_case',
  'rejected',
  'cancelled',
]);

// Backend consultation.service.js ile birebir tutulur.
export const CONSULTATION_STATUS_TRANSITIONS = Object.freeze({
  new: Object.freeze([
    'evaluating',
    'meeting_scheduled',
    'in_progress',
    'rejected',
    'cancelled',
  ]),
  evaluating: Object.freeze([
    'meeting_scheduled',
    'in_progress',
    'waiting_client',
    'completed',
    'rejected',
    'cancelled',
  ]),
  meeting_scheduled: Object.freeze([
    'evaluating',
    'in_progress',
    'waiting_client',
    'completed',
    'rejected',
    'cancelled',
  ]),
  in_progress: Object.freeze([
    'meeting_scheduled',
    'waiting_client',
    'completed',
    'rejected',
    'cancelled',
  ]),
  waiting_client: Object.freeze([
    'meeting_scheduled',
    'in_progress',
    'completed',
    'rejected',
    'cancelled',
  ]),
});

const findOption = (options, value) =>
  options.find((option) => option.value === value);

export const isConsultationTerminalStatus = (status) =>
  CONSULTATION_TERMINAL_STATUSES.includes(status);

export const canTransitionConsultationStatus = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  if (toStatus === 'converted_to_case') return false;
  return (CONSULTATION_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
};

export const getConsultationStatusTransitionOptions = (
  currentStatus,
  { includeCurrent = true } = {}
) => {
  if (!currentStatus) return [];

  if (isConsultationTerminalStatus(currentStatus)) {
    return includeCurrent
      ? CONSULTATION_STATUS_OPTIONS.filter((item) => item.value === currentStatus)
      : [];
  }

  const allowed = new Set(
    CONSULTATION_STATUS_TRANSITIONS[currentStatus] || []
  );

  if (includeCurrent) allowed.add(currentStatus);

  return CONSULTATION_STATUS_OPTIONS.filter(
    (item) => item.value !== 'converted_to_case' && allowed.has(item.value)
  );
};

export const isConsultationCurrency = (currency) =>
  CONSULTATION_CURRENCY_OPTIONS.some(
    (option) => option.value === String(currency || '').trim().toUpperCase()
  );

export const getConsultationStatusLabel = (status) =>
  findOption(CONSULTATION_STATUS_OPTIONS, status)?.label || status || '-';

export const getConsultationStatusVariant = (status) => {
  const variants = {
    new: 'primary',
    evaluating: 'warning',
    meeting_scheduled: 'info',
    in_progress: 'success',
    waiting_client: 'warning',
    completed: 'default',
    converted_to_case: 'success',
    rejected: 'danger',
    cancelled: 'danger',
  };

  return variants[status] || 'default';
};

export const getConsultationPriorityLabel = (priority) =>
  findOption(CONSULTATION_PRIORITY_OPTIONS, priority)?.label || priority || 'Normal';

export const getConsultationPriorityVariant = (priority) => {
  const variants = {
    low: 'default',
    normal: 'primary',
    high: 'warning',
    critical: 'danger',
  };

  return variants[priority] || 'default';
};

export const getConsultationTypeLabel = (type) =>
  findOption(CONSULTATION_TYPE_OPTIONS, type)?.label || type || '-';

export const getConsultationServiceModelLabel = (serviceModel) =>
  findOption(CONSULTATION_SERVICE_MODEL_OPTIONS, serviceModel)?.label || serviceModel || '-';

export const getConsultationBillingTypeLabel = (billingType) =>
  findOption(CONSULTATION_BILLING_TYPE_OPTIONS, billingType)?.label || billingType || '-';

export const getConsultationModeLabel = (mode) =>
  findOption(CONSULTATION_MODE_OPTIONS, mode || '')?.label || mode || 'Belirtilmedi';

export const getConsultationSourceLabel = (source) =>
  findOption(CONSULTATION_SOURCE_OPTIONS, source || '')?.label || source || 'Belirtilmedi';

export const formatConsultationMoney = (amount, currency = 'TRY') => {
  if (amount === null || amount === undefined || amount === '') return '-';

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '-';

  const normalizedCurrency = String(currency || 'TRY').trim().toUpperCase();

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric} ${normalizedCurrency}`.trim();
  }
};
