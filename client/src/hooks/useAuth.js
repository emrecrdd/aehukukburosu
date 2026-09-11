import {
  useMemo,
} from 'react';

import {
  useAuth as useAuthProvider,
} from '../app/providers/auth.provider.jsx';

// ======================================================
// ROLES
// ======================================================

export const ROLES = {
  ADMIN: 'admin',
  LAWYER: 'lawyer',
  SECRETARY: 'secretary',
  INTERN: 'intern',
};

// ======================================================
// ROLE PERMISSIONS
//
// Eğer backend user.permissions gönderiyorsa,
// aşağıdaki fallback sadece eski kullanıcılar için kullanılır.
// ======================================================

const ROLE_PERMISSIONS = {
  admin: ['*'],

  lawyer: [
    'clients.view',
    'clients.create',
    'clients.update',

    'cases.view',
    'cases.create',
    'cases.update',

    'documents.view',
    'documents.create',
    'documents.update',
    'documents.delete',

    'tasks.view',
    'tasks.create',
    'tasks.update',
    'tasks.delete',

    'meetings.view',
    'meetings.create',
    'meetings.update',

    'power_of_attorney.view',
    'power_of_attorney.create',
    'power_of_attorney.update',

    'templates.view',
    'templates.create',
    'templates.update',
  ],

  secretary: [
    'clients.view',
    'clients.create',
    'clients.update',

    'cases.view',

    'documents.view',
    'documents.create',
    'documents.update',

    'tasks.view',
    'tasks.create',
    'tasks.update',

    'meetings.view',
    'meetings.create',
    'meetings.update',

    'templates.view',
  ],

  intern: [
    'clients.view',
    'cases.view',
    'documents.view',
    'tasks.view',
    'meetings.view',
    'templates.view',
  ],
};

// ======================================================
// HOOK
// ======================================================

export const useAuth = () => {
  const auth =
    useAuthProvider();

  const user =
    auth?.user || null;

  // ====================================================
  // USER PERMISSIONS
  // ====================================================

  const permissions =
    useMemo(() => {
      if (!user) {
        return [];
      }

      /*
       * Tercih edilen yapı:
       *
       * Backend:
       * user.permissions = [
       *   'cases.view',
       *   'cases.update',
       *   ...
       * ]
       */

      if (
        Array.isArray(
          user.permissions
        )
      ) {
        return user.permissions;
      }

      return (
        ROLE_PERMISSIONS[
          user.role
        ] || []
      );
    }, [
      user,
    ]);

  // ====================================================
  // PERMISSION HELPERS
  // ====================================================

  const hasPermission = (
    permission
  ) => {
    if (
      !user ||
      !permission
    ) {
      return false;
    }

    return (
      permissions.includes('*') ||
      permissions.includes(
        permission
      )
    );
  };

  const hasAnyPermission = (
    requiredPermissions = []
  ) => {
    if (
      !user ||
      !Array.isArray(
        requiredPermissions
      )
    ) {
      return false;
    }

    return requiredPermissions.some(
      (permission) =>
        hasPermission(
          permission
        )
    );
  };

  const hasAllPermissions = (
    requiredPermissions = []
  ) => {
    if (
      !user ||
      !Array.isArray(
        requiredPermissions
      )
    ) {
      return false;
    }

    return requiredPermissions.every(
      (permission) =>
        hasPermission(
          permission
        )
    );
  };

  // ====================================================
  // ROLE HELPERS
  // ====================================================

  const hasRole = (
    role
  ) => {
    if (
      !user ||
      !role
    ) {
      return false;
    }

    return (
      user.role === role
    );
  };

  const hasAnyRole = (
    roles = []
  ) => {
    if (
      !user ||
      !Array.isArray(roles)
    ) {
      return false;
    }

    return roles.includes(
      user.role
    );
  };

  // ====================================================
  // ROLE FLAGS
  //
  // Fonksiyon yerine boolean vermek kullanımda daha temiz.
  // ====================================================

  const isAdmin =
    hasRole(
      ROLES.ADMIN
    );

  const isLawyer =
    hasRole(
      ROLES.LAWYER
    );

  const isSecretary =
    hasRole(
      ROLES.SECRETARY
    );

  const isIntern =
    hasRole(
      ROLES.INTERN
    );

  return {
    ...auth,

    user,
    permissions,

    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    hasRole,
    hasAnyRole,

    isAdmin,
    isLawyer,
    isSecretary,
    isIntern,
  };
};

export default useAuth;