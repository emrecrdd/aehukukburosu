import axiosInstance from '../app/config/axios.js';

// ======================================================
// TOKEN COMPATIBILITY HELPERS
// ======================================================

const looksLikeJwt = (
  value
) => {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      value.trim()
    )
  );
};

const decodeJwtPayload = (
  token
) => {
  try {
    const encoded =
      token.split('.')[1];

    const normalized =
      encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const padded =
      normalized.padEnd(
        Math.ceil(
          normalized.length / 4
        ) * 4,
        '='
      );

    return JSON.parse(
      decodeURIComponent(
        Array.from(
          atob(padded)
        )
          .map(
            (char) =>
              `%${char
                .charCodeAt(0)
                .toString(16)
                .padStart(2, '0')}`
          )
          .join('')
      )
    );
  } catch {
    return null;
  }
};

const isUsableAccessToken = (
  token
) => {
  if (
    !looksLikeJwt(
      token
    )
  ) {
    return false;
  }

  const payload =
    decodeJwtPayload(
      token
    );

  if (!payload) {
    return false;
  }

  if (
    payload.type ===
    'refresh'
  ) {
    return false;
  }

  const nowSeconds =
    Math.floor(
      Date.now() / 1000
    );

  if (
    Number.isFinite(
      Number(payload.exp)
    ) &&
    Number(payload.exp) <=
      nowSeconds
  ) {
    return false;
  }

  if (
    Number.isFinite(
      Number(
        payload.sessionExpiresAt
      )
    ) &&
    Number(
      payload.sessionExpiresAt
    ) <= nowSeconds
  ) {
    return false;
  }

  return true;
};

/*
 * Geriye dönük uyumluluk için export korunuyor.
 *
 * Eski sürüm tüm localStorage/sessionStorage alanlarını
 * tarıyordu. Bu hem gereksiz hem de aynı sekmede refresh
 * sonrası eski access tokenın seçilmesine yol açabiliyordu.
 *
 * Artık yalnızca Derkenar'ın resmi `tokens.accessToken`
 * kaydı ve son çare olarak explicit token dikkate alınır.
 */
export const resolveAccessToken = (
  explicitToken = null
) => {
  let storedToken =
    null;

  if (
    typeof window !==
    'undefined'
  ) {
    try {
      const stored =
        JSON.parse(
          window.localStorage.getItem(
            'tokens'
          ) || '{}'
        );

      storedToken =
        stored?.accessToken ||
        null;
    } catch {
      storedToken =
        null;
    }
  }

  if (
    isUsableAccessToken(
      storedToken
    )
  ) {
    return storedToken;
  }

  if (
    isUsableAccessToken(
      explicitToken
    )
  ) {
    return explicitToken;
  }

  return null;
};

// ======================================================
// ERROR
// ======================================================

export class ScreenLockApiError extends Error {
  constructor({
    message,
    status,
    code,
    data,
  }) {
    super(
      message ||
        'Ekran kilidi isteği başarısız oldu.'
    );

    this.name =
      'ScreenLockApiError';

    this.status =
      status || 0;

    this.code =
      code ||
      'SCREEN_LOCK_API_ERROR';

    this.data =
      data || {};
  }
}

// ======================================================
// REQUEST
// ======================================================

const request = async (
  path,
  {
    method = 'GET',
    body,
    signal,
  } = {}
) => {
  try {
    /*
     * Ekran kilidi istekleri de artık merkezi Axios
     * auth zincirinden geçiyor:
     *
     * - güncel access token
     * - 401 -> tekil refresh queue
     * - HttpOnly refresh cookie
     * - 8 saatlik absolute-session kontrolü
     *
     * Böylece 30 dakikalık access token yenilendiğinde
     * screen-lock servisinin eski tokenla kalması önlenir.
     */
    const response =
      await axiosInstance.request({
        url:
          path,

        method,

        signal,

        ...(body !== undefined
          ? {
              data:
                body,
            }
          : {}),
      });

    return response?.data?.data;
  } catch (error) {
    /*
     * IdleBrandOverlay mevcut AbortError davranışını
     * kullanıyor. Axios cancellation'ını aynı sözleşmeye
     * çeviriyoruz.
     */
    if (
      error?.code ===
        'ERR_CANCELED' ||
      error?.name ===
        'CanceledError'
    ) {
      const abortError =
        new Error(
          'Request aborted'
        );

      abortError.name =
        'AbortError';

      throw abortError;
    }

    const response =
      error?.response;

    const payload =
      response?.data ||
      null;

    if (!response) {
      throw new ScreenLockApiError({
        message:
          'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.',

        status:
          0,

        code:
          'SCREEN_LOCK_NETWORK_ERROR',
      });
    }

    throw new ScreenLockApiError({
      message:
        payload?.message ||
        'Ekran kilidi isteği başarısız oldu.',

      status:
        response.status,

      code:
        payload?.code ||
        'SCREEN_LOCK_API_ERROR',

      data:
        payload?.data || {},
    });
  }
};

// ======================================================
// API
// ======================================================

export const screenLockApi = {
  status(
    _token,
    options = {}
  ) {
    return request(
      '/screen-lock/status',
      {
        signal:
          options.signal,
      }
    );
  },

  setup(
    {
      pin,
      confirmPin,
    },
    _token
  ) {
    return request(
      '/screen-lock/setup',
      {
        method:
          'POST',

        body: {
          pin,
          confirmPin,
        },
      }
    );
  },

  lock(
    reason,
    _token
  ) {
    return request(
      '/screen-lock/lock',
      {
        method:
          'POST',

        body: {
          reason,
        },
      }
    );
  },

  touch(
    _token
  ) {
    return request(
      '/screen-lock/touch',
      {
        method:
          'POST',

        body: {},
      }
    );
  },

  unlock(
    pin,
    _token
  ) {
    return request(
      '/screen-lock/unlock',
      {
        method:
          'POST',

        body: {
          pin,
        },
      }
    );
  },

  recoverWithPassword(
    {
      password,
      newPin,
      confirmPin,
    },
    _token
  ) {
    return request(
      '/screen-lock/recover/password',
      {
        method:
          'POST',

        body: {
          password,
          newPin,
          confirmPin,
        },
      }
    );
  },

  recoverWithCode(
    {
      recoveryCode,
      newPin,
      confirmPin,
    },
    _token
  ) {
    return request(
      '/screen-lock/recover/recovery-code',
      {
        method:
          'POST',

        body: {
          recoveryCode,
          newPin,
          confirmPin,
        },
      }
    );
  },
};

export default screenLockApi;
