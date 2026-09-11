export const CASE_STATUS = {
  PREPARATION: 'preparation',
  ACTIVE: 'active',
  HEARING: 'hearing',
  APPEAL: 'appeal',
  CASSATION: 'cassation',
   SUSPENDED: 'suspended',
  CONCLUDED: 'concluded',
  ARCHIVED: 'archived',
};

// ======================================================
// LABELS
// ======================================================

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.PREPARATION]:
    'Hazırlık',

  [CASE_STATUS.ACTIVE]:
    'Devam Ediyor',

  [CASE_STATUS.HEARING]:
    'Duruşmada',

  [CASE_STATUS.APPEAL]:
    'İstinaf',

  [CASE_STATUS.CASSATION]:
    'Temyiz',

  [CASE_STATUS.CONCLUDED]:
    'Sonuçlandı',

  [CASE_STATUS.ARCHIVED]:
    'Arşivlendi',
    [CASE_STATUS.SUSPENDED]:
  'Durduruldu',
};

// ======================================================
// BADGE VARIANTS
// Badge.jsx ile uyumlu
// ======================================================

export const CASE_STATUS_BADGE_VARIANTS = {
  [CASE_STATUS.PREPARATION]:
    'warning',

  [CASE_STATUS.ACTIVE]:
    'success',

  [CASE_STATUS.HEARING]:
    'info',

  [CASE_STATUS.APPEAL]:
    'warning',

  [CASE_STATUS.CASSATION]:
    'primary',

  [CASE_STATUS.CONCLUDED]:
    'default',

  [CASE_STATUS.ARCHIVED]:
    'danger',
    [CASE_STATUS.SUSPENDED]:
  'warning',
};

// ======================================================
// COLORS
// Badge dışında özel kullanım gerekirse
// ======================================================

export const CASE_STATUS_COLORS = {
  [CASE_STATUS.PREPARATION]:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300',

  [CASE_STATUS.ACTIVE]:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/[0.08] dark:text-emerald-300',

  [CASE_STATUS.HEARING]:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/15 dark:bg-violet-500/[0.08] dark:text-violet-300',

  [CASE_STATUS.APPEAL]:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300',

  [CASE_STATUS.CASSATION]:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/15 dark:bg-blue-500/[0.08] dark:text-blue-300',

  [CASE_STATUS.CONCLUDED]:
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300',
[CASE_STATUS.SUSPENDED]:
  'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/15 dark:bg-orange-500/[0.08] dark:text-orange-300',
  [CASE_STATUS.ARCHIVED]:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/15 dark:bg-red-500/[0.08] dark:text-red-300',

  };

// ======================================================
// ORDER
// ======================================================

export const CASE_STATUS_ORDER = [
  CASE_STATUS.PREPARATION,
  CASE_STATUS.ACTIVE,
  CASE_STATUS.HEARING,
  CASE_STATUS.APPEAL,
  CASE_STATUS.CASSATION,
  CASE_STATUS.CONCLUDED,
  CASE_STATUS.ARCHIVED,
];

// ======================================================
// OPTIONS
// ======================================================

export const CASE_STATUS_OPTIONS =
  CASE_STATUS_ORDER.map(
    (value) => ({
      value,

      label:
        CASE_STATUS_LABELS[
          value
        ],

      variant:
        CASE_STATUS_BADGE_VARIANTS[
          value
        ],
    })
  );

// ======================================================
// HELPERS
// ======================================================

export const getCaseStatusLabel = (
  status
) => {
  return (
    CASE_STATUS_LABELS[
      status
    ] ||
    status ||
    '-'
  );
};

export const getCaseStatusVariant = (
  status
) => {
  return (
    CASE_STATUS_BADGE_VARIANTS[
      status
    ] ||
    'default'
  );
};

export const isCaseClosed = (
  status
) => {
  return [
    CASE_STATUS.CONCLUDED,
    CASE_STATUS.ARCHIVED,
  ].includes(status);
};

export const isCaseActive = (
  status
) => {
  return [
    CASE_STATUS.PREPARATION,
    CASE_STATUS.ACTIVE,
    CASE_STATUS.HEARING,
    CASE_STATUS.APPEAL,
    CASE_STATUS.CASSATION,
  ].includes(status);
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  CASE_STATUS,

  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_STATUS_BADGE_VARIANTS,

  CASE_STATUS_ORDER,
  CASE_STATUS_OPTIONS,

  getCaseStatusLabel,
  getCaseStatusVariant,

  isCaseClosed,
  isCaseActive,
};
