import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import authApi from './auth.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import toast from 'react-hot-toast';

// ======================================================
// ERROR HELPERS
// ======================================================

const getRawErrorMessage = (
  error
) => {
  return String(
    error?.response?.data?.message ||
      error?.message ||
      ''
  ).trim();
};

const isTechnicalMessage = (
  message
) => {
  return /sequelize|constraint|database|sql|stack|syntaxerror|typeerror|referenceerror|axios|request failed|status code|postgres|column|relation|uuid/i.test(
    String(
      message || ''
    )
  );
};

const isNetworkError = (
  error
) => {
  const message =
    getRawErrorMessage(
      error
    );

  return (
    !error?.response ||
    /network error|failed to fetch|timeout|econnrefused|enotfound/i.test(
      message
    )
  );
};

const getLoginErrorMessage = (
  error
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    getRawErrorMessage(
      error
    );

  if (
    status === 401 ||
    /e-posta veya şifre hatalı/i.test(
      rawMessage
    )
  ) {
    return 'E-posta veya şifre hatalı';
  }

  if (
    /kullanıcı hesabı aktif değil/i.test(
      rawMessage
    )
  ) {
    return 'Kullanıcı hesabınız aktif değil. Büro yöneticinizle iletişime geçin.';
  }

  if (
    status === 429
  ) {
    return 'Çok fazla giriş denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (
    isNetworkError(
      error
    )
  ) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    status >= 500 ||
    isTechnicalMessage(
      rawMessage
    )
  ) {
    return 'Giriş işlemi şu anda tamamlanamıyor. Lütfen tekrar deneyin.';
  }

  if (
    rawMessage &&
    /[çğıöşüÇĞİÖŞÜ]|geçersiz|süresi|oturum|hesap|şifre|e-posta|yetki/i.test(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return 'Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.';
};



const getPasswordChangeErrorMessage = (
  error
) => {
  const status =
    error?.response?.status;

  const rawMessage =
    getRawErrorMessage(
      error
    );

  if (
    /mevcut şifre yanlış/i.test(
      rawMessage
    )
  ) {
    return 'Mevcut şifreniz yanlış.';
  }

  if (
    /en az 12 karakter/i.test(
      rawMessage
    )
  ) {
    return 'Yeni şifre en az 12 karakter olmalıdır.';
  }

  if (
    /aynı olamaz/i.test(
      rawMessage
    )
  ) {
    return 'Yeni şifre mevcut şifrenizle aynı olamaz.';
  }

  if (
    status === 429
  ) {
    return 'Kısa sürede çok fazla istek yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (
    isNetworkError(
      error
    )
  ) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (
    status >= 500 ||
    isTechnicalMessage(
      rawMessage
    )
  ) {
    return 'Şifre şu anda değiştirilemiyor. Lütfen tekrar deneyin.';
  }

  if (
    rawMessage &&
    /[çğıöşüÇĞİÖŞÜ]|şifre|geçersiz|zorunlu|oturum/i.test(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  return 'Şifre değiştirilemedi. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
};

// ======================================================
// LOGIN
// ======================================================

export const useLogin = () => {
  const {
    login,
  } =
    useAuth();

  return useMutation({
    mutationFn: ({
      email,
      password,
    }) =>
      login(
        email,
        password
      ),

    onError: (
      error
    ) => {
      toast.error(
        getLoginErrorMessage(
          error
        )
      );
    },
  });
};




// ======================================================
// PROFILE
// ======================================================

export const useProfile = () => {
  return useQuery({
    queryKey: [
      'profile',
    ],

    queryFn: () =>
      authApi.getProfile(),

    staleTime:
      5 * 60 * 1000,
  });
};

// ======================================================
// CHANGE PASSWORD
// ======================================================

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (
      data
    ) =>
      authApi.changePassword(
        data
      ),

    onSuccess: () => {
      toast.success(
        'Şifreniz başarıyla değiştirildi.'
      );
    },

    onError: (
      error
    ) => {
      toast.error(
        getPasswordChangeErrorMessage(
          error
        )
      );
    },
  });
};
