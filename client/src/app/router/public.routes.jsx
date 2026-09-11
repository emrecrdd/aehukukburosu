import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import {
  useAuth,
} from '../providers/auth.provider.jsx';

const PublicRoute = () => {
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
        <div
          className="
            h-10
            w-10
            animate-spin
            rounded-full
            border-4
            border-gray-200
            border-b-blue-600
            dark:border-white/[0.08]
            dark:border-b-blue-500
          "
        />
      </div>
    );
  }

  // ====================================================
  // ALREADY AUTHENTICATED
  // ====================================================

  if (
    isAuthenticated &&
    user
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // PUBLIC ROUTES
  // ====================================================

  return <Outlet />;
};

export default PublicRoute;