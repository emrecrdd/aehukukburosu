import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import {
  useAuth,
} from '../providers/auth.provider.jsx';

import {
  hasPermission,
  hasAllPermissions,
} from '../../constants/roles.js';

const PrivateRoute = ({
  requiredRole,
  allowedRoles,

  requiredPermission,
  requiredPermissions,
}) => {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
      </div>
    );
  }

  // ====================================================
  // AUTH
  // ====================================================

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const userRole =
    user.role;

  // ====================================================
  // SINGLE ROLE
  // Backward compatibility
  // ====================================================

  if (
    requiredRole &&
    userRole !==
      requiredRole
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // MULTIPLE ROLES
  // ====================================================

  if (
    Array.isArray(
      allowedRoles
    ) &&
    allowedRoles.length >
      0 &&
    !allowedRoles.includes(
      userRole
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // SINGLE PERMISSION
  //
  // Örnek:
  // <PrivateRoute
  //   requiredPermission="view_documents"
  // />
  // ====================================================

  if (
    requiredPermission &&
    !hasPermission(
      user,
      requiredPermission
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // MULTIPLE PERMISSIONS
  //
  // Tüm permission'lar gerekli.
  //
  // Örnek:
  // <PrivateRoute
  //   requiredPermissions={[
  //     'view_cases',
  //     'edit_cases',
  //   ]}
  // />
  // ====================================================

  if (
    Array.isArray(
      requiredPermissions
    ) &&
    requiredPermissions.length >
      0 &&
    !hasAllPermissions(
      user,
      requiredPermissions
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // ALLOWED
  // ====================================================

  return <Outlet />;
};

export default PrivateRoute;