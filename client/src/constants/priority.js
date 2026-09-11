export const PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ======================================================
// LABELS
// ======================================================

export const PRIORITY_LABELS = {
  [PRIORITIES.LOW]:
    'Düşük',

  [PRIORITIES.NORMAL]:
    'Normal',

  [PRIORITIES.HIGH]:
    'Yüksek',

  [PRIORITIES.CRITICAL]:
    'Kritik',
};

// ======================================================
// ICONS
// ======================================================

export const PRIORITY_ICONS = {
  [PRIORITIES.LOW]:
    '🟢',

  [PRIORITIES.NORMAL]:
    '🔵',

  [PRIORITIES.HIGH]:
    '🟠',

  [PRIORITIES.CRITICAL]:
    '🔴',
};

// ======================================================
// BADGE VARIANTS
//
// Badge.jsx ile birebir uyumlu.
// ======================================================

export const PRIORITY_BADGE_VARIANTS = {
  [PRIORITIES.LOW]:
    'default',

  [PRIORITIES.NORMAL]:
    'info',

  [PRIORITIES.HIGH]:
    'warning',

  [PRIORITIES.CRITICAL]:
    'danger',
};

// ======================================================
// COLORS
//
// Badge kullanılmayan özel alanlar için.
// Yeni UI tasarımına göre güncellendi.
// ======================================================

export const PRIORITY_COLORS = {
  [PRIORITIES.LOW]:
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-300',

  [PRIORITIES.NORMAL]:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/15 dark:bg-violet-500/[0.08] dark:text-violet-300',

  [PRIORITIES.HIGH]:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300',

  [PRIORITIES.CRITICAL]:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/15 dark:bg-red-500/[0.08] dark:text-red-300',
};

// ======================================================
// ORDER
// En yüksek öncelikten en düşüğe.
// ======================================================

export const PRIORITY_ORDER = [
  PRIORITIES.CRITICAL,
  PRIORITIES.HIGH,
  PRIORITIES.NORMAL,
  PRIORITIES.LOW,
];

// ======================================================
// OPTIONS
// Form selectleri için.
// ======================================================

export const PRIORITY_OPTIONS =
  Object.values(
    PRIORITIES
  ).map(
    (value) => ({
      value,

      label:
        PRIORITY_LABELS[
          value
        ],

      icon:
        PRIORITY_ICONS[
          value
        ],

      variant:
        PRIORITY_BADGE_VARIANTS[
          value
        ],
    })
  );

// ======================================================
// HELPERS
// ======================================================

export const getPriorityLabel = (
  priority
) => {
  return (
    PRIORITY_LABELS[
      priority
    ] ||
    priority ||
    '-'
  );
};

export const getPriorityVariant = (
  priority
) => {
  return (
    PRIORITY_BADGE_VARIANTS[
      priority
    ] ||
    'default'
  );
};

export const getPriorityIcon = (
  priority
) => {
  return (
    PRIORITY_ICONS[
      priority
    ] ||
    '⚪'
  );
};

export const getPriorityRank = (
  priority
) => {
  const index =
    PRIORITY_ORDER.indexOf(
      priority
    );

  return index === -1
    ? PRIORITY_ORDER.length
    : index;
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  PRIORITIES,

  PRIORITY_LABELS,
  PRIORITY_ICONS,
  PRIORITY_COLORS,

  PRIORITY_BADGE_VARIANTS,
  PRIORITY_ORDER,
  PRIORITY_OPTIONS,

  getPriorityLabel,
  getPriorityVariant,
  getPriorityIcon,
  getPriorityRank,
};