import useAuth from './useAuth.js';

export const usePermission = () => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    isLawyer,
    isSecretary,
    isIntern,
  } = useAuth();

  return {
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

export default usePermission;