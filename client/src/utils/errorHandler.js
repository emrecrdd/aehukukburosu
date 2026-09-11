import toast from 'react-hot-toast';

// ======================================================
// HELPERS
// ======================================================

const DEFAULT_ERROR_MESSAGE =
  'Bir hata oluştu. Lütfen tekrar deneyin.';

const NETWORK_ERROR_MESSAGE =
  'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.';

const getValidationMessages = (errors) => {
  if (!errors) {
    return [];
  }

  if (Array.isArray(errors)) {
    return errors.filter(Boolean);
  }

  if (typeof errors !== 'object') {
    return [String(errors)];
  }

  return Object.values(errors)
    .flatMap((value) =>
      Array.isArray(value)
        ? value
        : [value]
    )
    .filter(Boolean)
    .map(String);
};

// ======================================================
// ERROR HANDLER
// ======================================================

export const errorHandler = (
  error,
  fallback = DEFAULT_ERROR_MESSAGE
) => {
  // Development ortamında detaylı log.
  // Production'da hassas response içeriğini console'a
  // gereksiz yere basmıyoruz.
  if (import.meta.env.DEV) {
    console.error('API Error:', error);
  }

  // İstek kullanıcı tarafından iptal edildiyse
  // hata göstermeye gerek yok.
  if (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError'
  ) {
    return;
  }

  // ====================================================
  // NETWORK / TIMEOUT
  // ====================================================

  if (!error?.response) {
    if (
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT'
    ) {
      toast.error(
        'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
      );

      return;
    }

    toast.error(
      NETWORK_ERROR_MESSAGE
    );

    return;
  }

  // ====================================================
  // HTTP ERROR
  // ====================================================

  const {
    status,
    data,
  } = error.response;

  const apiMessage =
    typeof data?.message === 'string'
      ? data.message
      : null;

  switch (status) {
    case 400:
      toast.error(
        apiMessage ||
          'Gönderilen bilgiler geçersiz.'
      );
      break;

    case 401:
      /*
       * 401 yönlendirmesi ve refresh-token işlemi
       * axios interceptor tarafından yönetilmeli.
       *
       * Burada tekrar redirect yapmıyoruz.
       */
      toast.error(
        apiMessage ||
          'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'
      );
      break;

    case 403:
      toast.error(
        apiMessage ||
          'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.'
      );
      break;

    case 404:
      toast.error(
        apiMessage ||
          'İstenen kayıt bulunamadı.'
      );
      break;

    case 409:
      toast.error(
        apiMessage ||
          'Bu işlem mevcut bir kayıtla çakışıyor.'
      );
      break;

    case 422: {
      const validationMessages =
        getValidationMessages(
          data?.errors
        );

      if (
        validationMessages.length >
        0
      ) {
        /*
         * 10 validation hatasında 10 toast
         * göstermek yerine ilk birkaçını gösteriyoruz.
         */
        validationMessages
          .slice(0, 3)
          .forEach((message) => {
            toast.error(message);
          });

        if (
          validationMessages.length >
          3
        ) {
          toast.error(
            `${validationMessages.length - 3} doğrulama hatası daha var.`
          );
        }

        return;
      }

      toast.error(
        apiMessage ||
          'Girilen bilgileri kontrol edin.'
      );

      break;
    }

    case 429:
      toast.error(
        apiMessage ||
          'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.'
      );
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      toast.error(
        'Sunucu tarafında geçici bir sorun oluştu. Lütfen daha sonra tekrar deneyin.'
      );
      break;

    default:
      toast.error(
        apiMessage ||
          fallback
      );
  }
};

// ======================================================
// TOAST HELPERS
// ======================================================

export const showSuccess = (
  message
) => {
  if (!message) {
    return;
  }

  toast.success(message);
};

export const showError = (
  message
) => {
  if (!message) {
    return;
  }

  toast.error(message);
};

export const showWarning = (
  message
) => {
  if (!message) {
    return;
  }

  toast(message, {
    icon: '⚠️',
  });
};

export const showInfo = (
  message
) => {
  if (!message) {
    return;
  }

  toast(message, {
    icon: 'ℹ️',
  });
};