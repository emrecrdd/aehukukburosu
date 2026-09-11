export const ROLES = {
  ADMIN: 'admin',
  LAWYER: 'lawyer',
  INTERN: 'intern',
  SECRETARY: 'secretary',
};

export const ROLES_LIST =
  Object.values(ROLES);

// ======================================================
// LABELS
// ======================================================

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Yönetici',
  [ROLES.LAWYER]: 'Avukat',
  [ROLES.INTERN]: 'Stajyer',
  [ROLES.SECRETARY]: 'Sekreter',
};

// ======================================================
// UI COLORS
// ======================================================

export const ROLE_COLORS = {
  [ROLES.ADMIN]:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/[0.08] dark:text-violet-300 dark:border-violet-500/15',

  [ROLES.LAWYER]:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/[0.08] dark:text-blue-300 dark:border-blue-500/15',

  [ROLES.INTERN]:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/[0.08] dark:text-amber-300 dark:border-amber-500/15',

  [ROLES.SECRETARY]:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/[0.08] dark:text-emerald-300 dark:border-emerald-500/15',
};

// ======================================================
// ICONS
// ======================================================



// ======================================================
// SELECT OPTIONS
// ======================================================

export const ROLE_OPTIONS =
  ROLES_LIST.map((value) => ({
    value,
    label:
      ROLE_LABELS[value] ||
      value,
  }));

// ======================================================
// PERMISSION KEYS
// Backend ile birebir aynı.
// ======================================================

export const PERMISSION_KEYS = {
  VIEW_CLIENTS: 'view_clients',
  CREATE_CLIENTS: 'create_clients',
  EDIT_CLIENTS: 'edit_clients',
  DELETE_CLIENTS: 'delete_clients',

  VIEW_CASES: 'view_cases',
  VIEW_ALL_CASES: 'view_all_cases',
  CREATE_CASES: 'create_cases',
  EDIT_CASES: 'edit_cases',
  DELETE_CASES: 'delete_cases',
  CHANGE_CASE_STATUS: 'change_case_status',
  MANAGE_CASE_PARTIES: 'manage_case_parties',

  // Consultations
  VIEW_CONSULTATIONS: 'view_consultations',
  VIEW_ALL_CONSULTATIONS: 'view_all_consultations',
  CREATE_CONSULTATIONS: 'create_consultations',
  EDIT_CONSULTATIONS: 'edit_consultations',
  DELETE_CONSULTATIONS: 'delete_consultations',
  CONVERT_CONSULTATIONS: 'convert_consultations',

  VIEW_DOCUMENTS: 'view_documents',
  UPLOAD_DOCUMENTS: 'upload_documents',
  EDIT_DOCUMENTS: 'edit_documents',
  DELETE_DOCUMENTS: 'delete_documents',
  DOWNLOAD_DOCUMENTS: 'download_documents',
  MANAGE_DOCUMENT_VERSIONS: 'manage_document_versions',

  VIEW_TASKS: 'view_tasks',
  CREATE_TASKS: 'create_tasks',
  EDIT_TASKS: 'edit_tasks',
  DELETE_TASKS: 'delete_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  WORK_ON_TASKS: 'work_on_tasks',
  APPROVE_TASKS: 'approve_tasks',
  VIEW_ALL_TASKS: 'view_all_tasks',
  // PERFORMANCE
  VIEW_OWN_PERFORMANCE:
    'view_own_performance',

  VIEW_TEAM_PERFORMANCE:
    'view_team_performance',
  VIEW_EVENTS: 'view_events',
  CREATE_EVENTS: 'create_events',
  EDIT_EVENTS: 'edit_events',
  DELETE_EVENTS: 'delete_events',

  VIEW_CALENDAR: 'view_calendar',
  MANAGE_CALENDAR: 'manage_calendar',

  VIEW_MEETINGS: 'view_meetings',
  CREATE_MEETINGS: 'create_meetings',
  EDIT_MEETINGS: 'edit_meetings',
  DELETE_MEETINGS: 'delete_meetings',

  VIEW_PAYMENTS: 'view_payments',
  CREATE_PAYMENTS: 'create_payments',
  EDIT_PAYMENTS: 'edit_payments',
  DELETE_PAYMENTS: 'delete_payments',
  REVERSE_PAYMENTS: 'reverse_payments',
  VIEW_FINANCE_REPORTS: 'view_finance_reports',
  MANAGE_PAYMENT_PLANS: 'manage_payment_plans',

  // Finance V2 - granular enterprise permissions
  VIEW_FINANCE: 'view_finance',
  VIEW_ALL_FINANCE: 'view_all_finance',
  MANAGE_FEE_AGREEMENTS: 'manage_fee_agreements',
  CREATE_RECEIVABLES: 'create_receivables',
  RECORD_PAYMENTS: 'record_payments',
  CREATE_EXPENSES: 'create_expenses',
  APPROVE_EXPENSES: 'approve_expenses',
  MANAGE_FINANCE_ACCOUNTS: 'manage_finance_accounts',
  CLOSE_FINANCE_PERIOD: 'close_finance_period',
  REOPEN_FINANCE_PERIOD: 'reopen_finance_period',
  EXPORT_FINANCE: 'export_finance',
  VIEW_PROFITABILITY: 'view_profitability',

  VIEW_NOTES: 'view_notes',
  CREATE_NOTES: 'create_notes',
  EDIT_NOTES: 'edit_notes',
  DELETE_NOTES: 'delete_notes',

  VIEW_POWER_OF_ATTORNEY: 'view_power_of_attorney',
  CREATE_POWER_OF_ATTORNEY: 'create_power_of_attorney',
  EDIT_POWER_OF_ATTORNEY: 'edit_power_of_attorney',
  DELETE_POWER_OF_ATTORNEY: 'delete_power_of_attorney',

  VIEW_TEMPLATES: 'view_templates',
  CREATE_TEMPLATES: 'create_templates',
  EDIT_TEMPLATES: 'edit_templates',
  DELETE_TEMPLATES: 'delete_templates',

  USE_SEARCH: 'use_search',
  USE_AI: 'use_ai',

  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  CHANGE_USER_ROLES: 'change_user_roles',
  MANAGE_USER_STATUS: 'manage_user_status',
  MANAGE_PERMISSIONS: 'manage_permissions',

  VIEW_AUDIT_LOGS: 'view_audit_logs',
  DELETE_AUDIT_LOGS: 'delete_audit_logs',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
};

export const ALL_PERMISSIONS =
  Object.values(
    PERMISSION_KEYS
  );

// ======================================================
// ROLE PERMISSIONS
// Backend ile aynı fallback.
// ======================================================

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'all',
  ],

  [ROLES.LAWYER]: [
    PERMISSION_KEYS.VIEW_CLIENTS,
    PERMISSION_KEYS.CREATE_CLIENTS,
    PERMISSION_KEYS.EDIT_CLIENTS,

    PERMISSION_KEYS.VIEW_CASES,
    PERMISSION_KEYS.CREATE_CASES,
    PERMISSION_KEYS.EDIT_CASES,
    PERMISSION_KEYS.CHANGE_CASE_STATUS,
    PERMISSION_KEYS.MANAGE_CASE_PARTIES,

    // Consultations
    PERMISSION_KEYS.VIEW_CONSULTATIONS,
    PERMISSION_KEYS.CREATE_CONSULTATIONS,
    PERMISSION_KEYS.EDIT_CONSULTATIONS,
    PERMISSION_KEYS.CONVERT_CONSULTATIONS,

    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.UPLOAD_DOCUMENTS,
    PERMISSION_KEYS.EDIT_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,
    PERMISSION_KEYS.MANAGE_DOCUMENT_VERSIONS,

    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.CREATE_TASKS,
    PERMISSION_KEYS.EDIT_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,
PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.CREATE_EVENTS,
    PERMISSION_KEYS.EDIT_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,
    PERMISSION_KEYS.MANAGE_CALENDAR,

    PERMISSION_KEYS.VIEW_MEETINGS,
    PERMISSION_KEYS.CREATE_MEETINGS,
    PERMISSION_KEYS.EDIT_MEETINGS,

    PERMISSION_KEYS.VIEW_PAYMENTS,
    PERMISSION_KEYS.CREATE_PAYMENTS,
    PERMISSION_KEYS.EDIT_PAYMENTS,
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS,
    PERMISSION_KEYS.VIEW_FINANCE,
    PERMISSION_KEYS.MANAGE_FEE_AGREEMENTS,
    PERMISSION_KEYS.CREATE_RECEIVABLES,
    PERMISSION_KEYS.RECORD_PAYMENTS,

    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,
    PERMISSION_KEYS.EDIT_NOTES,

    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY,

    PERMISSION_KEYS.VIEW_TEMPLATES,
    PERMISSION_KEYS.CREATE_TEMPLATES,
    PERMISSION_KEYS.EDIT_TEMPLATES,

    PERMISSION_KEYS.USE_SEARCH,
    PERMISSION_KEYS.USE_AI,

    PERMISSION_KEYS.VIEW_SETTINGS,
  ],

  [ROLES.SECRETARY]: [
    PERMISSION_KEYS.VIEW_CLIENTS,
    PERMISSION_KEYS.CREATE_CLIENTS,
    PERMISSION_KEYS.EDIT_CLIENTS,

    PERMISSION_KEYS.VIEW_CASES,
    PERMISSION_KEYS.EDIT_CASES,

    // Consultations
    PERMISSION_KEYS.VIEW_CONSULTATIONS,
    PERMISSION_KEYS.CREATE_CONSULTATIONS,
    PERMISSION_KEYS.EDIT_CONSULTATIONS,

    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.UPLOAD_DOCUMENTS,
    PERMISSION_KEYS.EDIT_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,

    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.CREATE_TASKS,
    PERMISSION_KEYS.EDIT_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,
 PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.CREATE_EVENTS,
    PERMISSION_KEYS.EDIT_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,
    PERMISSION_KEYS.MANAGE_CALENDAR,

    PERMISSION_KEYS.VIEW_MEETINGS,
    PERMISSION_KEYS.CREATE_MEETINGS,
    PERMISSION_KEYS.EDIT_MEETINGS,

    PERMISSION_KEYS.VIEW_PAYMENTS,
    PERMISSION_KEYS.CREATE_PAYMENTS,

    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,
    PERMISSION_KEYS.EDIT_NOTES,

    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY,

    PERMISSION_KEYS.VIEW_TEMPLATES,

    PERMISSION_KEYS.USE_SEARCH,

    PERMISSION_KEYS.VIEW_SETTINGS,
  ],

  [ROLES.INTERN]: [
    PERMISSION_KEYS.VIEW_CLIENTS,
    PERMISSION_KEYS.VIEW_CASES,

    // Consultations
    PERMISSION_KEYS.VIEW_CONSULTATIONS,

    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,

    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,
// Performance
    PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,

    PERMISSION_KEYS.VIEW_MEETINGS,

    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,

    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.VIEW_TEMPLATES,

    PERMISSION_KEYS.USE_SEARCH,
  ],
};

// ======================================================
// PERMISSION HELPERS
// ======================================================


  
// ======================================================
// PERMISSION HELPERS
// ======================================================

export const hasPermission = (
  user,
  permission
) => {
  if (!user) {
    return false;
  }

  /*
   * Permission belirtilmemiş ekranlar
   * authenticated kullanıcılara açıktır.
   */
  if (!permission) {
    return true;
  }

  /*
   * Bilinmeyen permission key'lerde fail-closed.
   */
  if (
    !ALL_PERMISSIONS.includes(
      permission
    )
  ) {
    return false;
  }

  /*
   * Admin tam yetkili.
   */
  if (
    user.role ===
    ROLES.ADMIN
  ) {
    return true;
  }

  const overrides =
    user.permissions &&
    typeof user.permissions ===
      'object' &&
    !Array.isArray(
      user.permissions
    )
      ? user.permissions
      : {};

  /*
   * Kullanıcı override'ı rol varsayılanından önce gelir.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      overrides,
      permission
    )
  ) {
    return (
      overrides[
        permission
      ] === true
    );
  }

  const rolePermissions =
    ROLE_PERMISSIONS[
      user.role
    ] || [];

  return (
    rolePermissions.includes(
      'all'
    ) ||
    rolePermissions.includes(
      permission
    )
  );
};

export const hasAnyPermission = (
  user,
  permissions = []
) => {
  if (
    !user ||
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.some(
    (permission) =>
      hasPermission(
        user,
        permission
      )
  );
};

export const hasAllPermissions = (
  user,
  permissions = []
) => {
  if (
    !user ||
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.every(
    (permission) =>
      hasPermission(
        user,
        permission
      )
  );
};


// ======================================================
// ROLE HELPERS
// ======================================================

export const hasAnyRole = (
  userRole,
  roles = []
) => {
  if (
    !userRole ||
    !Array.isArray(
      roles
    )
  ) {
    return false;
  }

  return roles.includes(
    userRole
  );
};

// ======================================================
// ROLE HIERARCHY
// ======================================================

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.LAWYER]: 3,
  [ROLES.SECRETARY]: 2,
  [ROLES.INTERN]: 1,
};

export const hasRoleLevel = (
  userRole,
  targetRole
) => {
  if (
    !userRole ||
    !targetRole
  ) {
    return false;
  }

  return (
    (
      ROLE_HIERARCHY[
        userRole
      ] || 0
    ) >=
    (
      ROLE_HIERARCHY[
        targetRole
      ] || 0
    )
  );
};

// ======================================================
// BACKEND ROLE PERMISSIONS ALIAS
//
// auth.middleware.js PERMISSIONS[user.role] şeklinde
// rol izin dizisini okur. Bu nedenle backend tarafında
// PERMISSIONS, PERMISSION_KEYS değil ROLE_PERMISSIONS olmalıdır.
// ======================================================

export const PERMISSIONS =
  ROLE_PERMISSIONS;

// ======================================================
// PERMISSION PRESETS
// ======================================================

export const PERMISSION_PRESETS = {
  STANDARD_LAWYER: {
    label:
      'Standart Avukat',

    role:
      ROLES.LAWYER,

    overrides:
      {},
  },

  SENIOR_LAWYER: {
    label:
      'Kıdemli Avukat',

    role:
      ROLES.LAWYER,

    overrides: {
      [PERMISSION_KEYS.DELETE_DOCUMENTS]:
        true,

      [PERMISSION_KEYS.DELETE_TASKS]:
        true,

      [PERMISSION_KEYS.ASSIGN_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_ALL_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_FINANCE_REPORTS]:
        true,
    },
  },

  MANAGING_LAWYER: {
    label:
      'Yönetici Avukat',

    role:
      ROLES.LAWYER,

    overrides: {
      [PERMISSION_KEYS.VIEW_ALL_CASES]:
        true,

      [PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS]:
        true,

      [PERMISSION_KEYS.DELETE_CONSULTATIONS]:
        true,

      [PERMISSION_KEYS.DELETE_CLIENTS]:
        true,

      [PERMISSION_KEYS.DELETE_CASES]:
        true,

      [PERMISSION_KEYS.DELETE_DOCUMENTS]:
        true,

      [PERMISSION_KEYS.DELETE_TASKS]:
        true,

      [PERMISSION_KEYS.ASSIGN_TASKS]:
        true,

      [PERMISSION_KEYS.APPROVE_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_ALL_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE]:
        true,

      [PERMISSION_KEYS.DELETE_MEETINGS]:
        true,

      [PERMISSION_KEYS.VIEW_FINANCE_REPORTS]:
        true,

      [PERMISSION_KEYS.EDIT_PAYMENTS]:
        true,

      [PERMISSION_KEYS.VIEW_AUDIT_LOGS]:
        true,
    },
  },
};

// ======================================================
// BACKEND VALIDATION / EFFECTIVE PERMISSION HELPERS
// ======================================================

export const isValidRole = (
  role
) => {
  return ROLES_LIST.includes(
    role
  );
};

export const isValidPermission = (
  permission
) => {
  return ALL_PERMISSIONS.includes(
    permission
  );
};

export const getRolePermissions = (
  role
) => {
  return (
    PERMISSIONS[
      role
    ] || []
  );
};

export const getEffectivePermissions = (
  role,
  overrides = {}
) => {
  if (
    role ===
    ROLES.ADMIN
  ) {
    return ALL_PERMISSIONS;
  }

  const defaults =
    new Set(
      getRolePermissions(
        role
      )
    );

  for (
    const [
      permission,
      enabled,
    ] of Object.entries(
      overrides || {}
    )
  ) {
    if (
      !isValidPermission(
        permission
      )
    ) {
      continue;
    }

    if (
      enabled ===
      true
    ) {
      defaults.add(
        permission
      );
    }

    if (
      enabled ===
      false
    ) {
      defaults.delete(
        permission
      );
    }
  }

  return Array.from(
    defaults
  );
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  ROLES,
  ROLES_LIST,

  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_OPTIONS,

  PERMISSION_KEYS,
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_PRESETS,

  isValidRole,
  isValidPermission,
  getRolePermissions,
  getEffectivePermissions,

  hasPermission,
  hasAnyPermission,
  hasAllPermissions,

  hasAnyRole,
  hasRoleLevel,
};
