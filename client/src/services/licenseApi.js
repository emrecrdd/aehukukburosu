const API_BASE_URL =
  String(
    import.meta.env.VITE_API_URL ||
      '/api'
  ).replace(/\/+$/, '');

export class LicenseApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = null,
      data = null,
    } = {}
  ) {
    super(message);
    this.name = 'LicenseApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const isJwtLike = (value) => {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return false;
  }

  const parts = value.trim().split('.');

  return (
    parts.length === 3 &&
    parts.every(Boolean)
  );
};

const decodeBase64Url = (value) => {
  try {
    const normalized = value
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded =
      normalized +
      '='.repeat(
        (4 - (normalized.length % 4)) % 4
      );

    const decoded = atob(padded);
    const bytes = Uint8Array.from(
      decoded,
      (char) => char.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  if (!isJwtLike(token)) {
    return null;
  }

  try {
    const payloadPart =
      token.trim().split('.')[1];

    const decoded =
      decodeBase64Url(payloadPart);

    if (!decoded) {
      return null;
    }

    const payload = JSON.parse(decoded);

    return payload &&
      typeof payload === 'object'
      ? payload
      : null;
  } catch {
    return null;
  }
};

const isUsableAccessCandidate = (
  token,
  keyHint = ''
) => {
  if (!isJwtLike(token)) {
    return false;
  }

  const payload =
    decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  const nowSeconds =
    Math.floor(Date.now() / 1000);

  if (
    Number.isFinite(Number(payload.exp)) &&
    Number(payload.exp) <= nowSeconds
  ) {
    return false;
  }

  const tokenType =
    String(payload.type || '')
      .trim()
      .toLowerCase();

  if (
    tokenType === 'refresh' ||
    /refresh/i.test(keyHint)
  ) {
    return false;
  }

  return true;
};

const candidateScore = (
  token,
  keyHint = '',
  explicit = false
) => {
  const payload =
    decodeJwtPayload(token) || {};

  const tokenType =
    String(payload.type || '')
      .trim()
      .toLowerCase();

  let score = 0;

  if (explicit) {
    score += 1000;
  }

  if (tokenType === 'access') {
    score += 500;
  } else if (!tokenType) {
    // Legacy access token desteği.
    score += 100;
  }

  if (/access/i.test(keyHint)) {
    score += 250;
  }

  if (/auth/i.test(keyHint)) {
    score += 60;
  }

  if (/token/i.test(keyHint)) {
    score += 20;
  }

  const issuedAt = Number(payload.iat);
  if (Number.isFinite(issuedAt)) {
    score += Math.min(
      50,
      Math.max(0, issuedAt / 1_000_000_000)
    );
  }

  return score;
};

const addCandidate = (
  bucket,
  token,
  keyHint = '',
  explicit = false
) => {
  if (
    !isUsableAccessCandidate(
      token,
      keyHint
    )
  ) {
    return;
  }

  const cleanToken = token.trim();

  if (
    bucket.some(
      (item) => item.token === cleanToken
    )
  ) {
    return;
  }

  bucket.push({
    token: cleanToken,
    keyHint,
    score: candidateScore(
      cleanToken,
      keyHint,
      explicit
    ),
  });
};

const collectFromObject = (
  value,
  bucket,
  path = 'object',
  depth = 0
) => {
  if (
    !value ||
    typeof value !== 'object' ||
    depth > 4
  ) {
    return;
  }

  for (
    const [key, candidate]
    of Object.entries(value)
  ) {
    const nextPath =
      `${path}.${key}`;

    if (/refresh/i.test(key)) {
      continue;
    }

    if (typeof candidate === 'string') {
      addCandidate(
        bucket,
        candidate,
        nextPath
      );
      continue;
    }

    if (
      candidate &&
      typeof candidate === 'object'
    ) {
      collectFromObject(
        candidate,
        bucket,
        nextPath,
        depth + 1
      );
    }
  }
};

const collectFromStorage = (
  storage,
  bucket,
  storageName
) => {
  if (!storage) {
    return;
  }

  try {
    for (
      let index = 0;
      index < storage.length;
      index += 1
    ) {
      const key = storage.key(index);

      if (!key || /refresh/i.test(key)) {
        continue;
      }

      const raw = storage.getItem(key);

      if (!raw) {
        continue;
      }

      addCandidate(
        bucket,
        raw,
        `${storageName}.${key}`
      );

      try {
        const parsed = JSON.parse(raw);

        collectFromObject(
          parsed,
          bucket,
          `${storageName}.${key}`
        );
      } catch {
        // JSON değilse yalnızca düz JWT ihtimali değerlendirildi.
      }
    }
  } catch {
    // Storage erişilemiyorsa auth akışını bozma.
  }
};

const resolveAccessTokenCandidates = (
  explicitToken
) => {
  const candidates = [];

  addCandidate(
    candidates,
    explicitToken,
    'explicitToken',
    true
  );

  if (typeof window !== 'undefined') {
    collectFromStorage(
      window.localStorage,
      candidates,
      'localStorage'
    );

    collectFromStorage(
      window.sessionStorage,
      candidates,
      'sessionStorage'
    );
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.token);
};

const parsePayload = async (response) => {
  return response
    .json()
    .catch(() => null);
};

const performRequest = async (
  path,
  accessToken,
  options
) => {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
    Authorization:
      `Bearer ${accessToken}`,
  };

  return fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
      credentials: 'include',
    }
  );
};

const request = async (
  path,
  token,
  options = {}
) => {
  const candidates =
    resolveAccessTokenCandidates(token);

  if (candidates.length === 0) {
    throw new LicenseApiError(
      'Aktif access token bulunamadı. Lütfen yeniden giriş yapın.',
      {
        status: 401,
        code: 'AUTH_TOKEN_MISSING',
      }
    );
  }

  let lastAuthError = null;

  for (const accessToken of candidates) {
    const response =
      await performRequest(
        path,
        accessToken,
        options
      );

    const payload =
      await parsePayload(response);

    if (response.ok) {
      return payload?.data ?? payload;
    }

    if (response.status === 401) {
      lastAuthError = {
        response,
        payload,
      };

      // Storage'da eski/stale bir JWT varsa sonraki
      // access-token adayını dene. Token değerleri loglanmaz.
      continue;
    }

    throw new LicenseApiError(
      payload?.message ||
        'Lisans bilgisi alınamadı.',
      {
        status: response.status,
        code: payload?.code || null,
        data: payload,
      }
    );
  }

  throw new LicenseApiError(
    lastAuthError?.payload?.message ||
      'Geçerli access token bulunamadı. Lütfen yeniden giriş yapın.',
    {
      status:
        lastAuthError?.response?.status ||
        401,
      code:
        lastAuthError?.payload?.code ||
        'AUTH_TOKEN_INVALID',
      data:
        lastAuthError?.payload ||
        null,
    }
  );
};

export const licenseApi = {
  current(token) {
    return request(
      '/license/current',
      token,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );
  },
};

export default licenseApi;
