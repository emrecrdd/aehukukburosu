import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useLocalStorage,
} from '../../hooks/useLocalStorage.js';

import authApi from '../../features/auth/auth.api.js';

import {
  queryClient,
} from './query.provider.jsx';

const AuthContext =
  createContext(null);

const redirectToLogin = () => {
  if (
    typeof window ===
      'undefined'
  ) {
    return;
  }

  if (
    window.location.pathname !==
    '/login'
  ) {
    window.location.replace(
      '/login'
    );
  }
};

export const AuthProvider = ({
  children,
}) => {
  const [
    user,
    setUser,
    removeUser,
  ] = useLocalStorage(
    'user',
    null
  );

  const [
    tokens,
    setTokens,
    removeTokens,
  ] = useLocalStorage(
    'tokens',
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ====================================================
  // CLEAR AUTH
  // ====================================================

  const clearAuth =
    useCallback(
      async () => {
        await queryClient.cancelQueries();

        queryClient.clear();

        removeUser();
        removeTokens();
      },
      [
        removeUser,
        removeTokens,
      ]
    );

  // ====================================================
  // ABSOLUTE SESSION EXPIRY
  // ====================================================

  useEffect(() => {
    const sessionExpiresAt =
      Number(
        tokens?.sessionExpiresAt
      );

    if (
      !Number.isFinite(
        sessionExpiresAt
      ) ||
      sessionExpiresAt <= 0
    ) {
      return undefined;
    }

    const remainingMs =
      sessionExpiresAt *
        1000 -
      Date.now();

    const expireSession =
      async () => {
        await clearAuth();
        redirectToLogin();
      };

    if (
      remainingMs <= 0
    ) {
      void expireSession();
      return undefined;
    }

    const timeout =
      window.setTimeout(
        () => {
          void expireSession();
        },
        remainingMs
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    tokens?.sessionExpiresAt,
    clearAuth,
  ]);

  // ====================================================
  // CROSS-TAB AUTH CLEANUP
  // ====================================================

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return undefined;
    }

    const handleStorage = (
      event
    ) => {
      if (
        event.key !==
        'tokens'
      ) {
        return;
      }

      if (
        !event.newValue
      ) {
        void clearAuth();
        redirectToLogin();
      }
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, [clearAuth]);

  // ====================================================
  // INIT / VERIFY AUTH
  // ====================================================

  useEffect(() => {
    let cancelled =
      false;

    const initAuth =
      async () => {
        setLoading(true);

        if (
          !tokens?.accessToken
        ) {
          if (
            !cancelled
          ) {
            setUser(null);
            setLoading(false);
          }

          return;
        }

        try {
          const response =
            await authApi.getProfile();

          const profile =
            response?.data?.data;

          if (
            !cancelled
          ) {
            setUser(
              profile || null
            );
          }
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              'Auth init error:',
              error
            );
          }

          if (
            !cancelled
          ) {
            await clearAuth();
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(false);
          }
        }
      };

    void initAuth();

    return () => {
      cancelled =
        true;
    };
  }, [
    tokens?.accessToken,
    setUser,
    clearAuth,
  ]);

  // ====================================================
  // LOGIN
  // ====================================================

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        const response =
          await authApi.login(
            email,
            password
          );

        const data =
          response?.data?.data;

        await queryClient.cancelQueries();

        queryClient.clear();

        /*
         * Refresh token JavaScript'e verilmez.
         * HttpOnly cookie backend tarafından yönetilir.
         */
        setTokens({
          accessToken:
            data.accessToken,

          sessionExpiresAt:
            data.sessionExpiresAt ||
            null,
        });

        setUser(
          data.user
        );

        return response;
      },
      [
        setTokens,
        setUser,
      ]
    );

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout =
    useCallback(
      async () => {
        try {
          /*
           * Refresh token body'den gönderilmez.
           * Browser HttpOnly cookie'yi otomatik gönderir.
           */
          await authApi.logout();
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              'Logout error:',
              error
            );
          }
        } finally {
          await clearAuth();
        }
      },
      [clearAuth]
    );

  // ====================================================
  // REFRESH
  // ====================================================

  const refreshToken =
    useCallback(
      async () => {
        try {
          /*
           * Refresh token yalnız HttpOnly cookie'dedir.
           */
          const response =
            await authApi.refreshToken();

          const data =
            response?.data?.data;

          if (
            !data?.accessToken
          ) {
            throw new Error(
              'Yeni access token alınamadı'
            );
          }

          setTokens({
            accessToken:
              data.accessToken,

            sessionExpiresAt:
              data.sessionExpiresAt ||
              tokens?.sessionExpiresAt ||
              null,
          });

          return response;
        } catch (error) {
          await clearAuth();
          redirectToLogin();

          throw error;
        }
      },
      [
        tokens?.sessionExpiresAt,
        setTokens,
        clearAuth,
      ]
    );

  // ====================================================
  // DERIVED STATE
  // ====================================================

  const isAuthenticated =
    Boolean(
      user &&
      tokens?.accessToken
    );

  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const value =
    useMemo(
      () => ({
        user,
        tokens,
        loading,

        accessToken:
          tokens?.accessToken ||
          null,

        sessionExpiresAt:
          tokens?.sessionExpiresAt ||
          null,

        isAuthenticated,

        login,
        logout,
        refreshToken,

        setUser,
      }),
      [
        user,
        tokens,
        loading,
        isAuthenticated,

        login,
        logout,
        refreshToken,

        setUser,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};

export default AuthContext;
