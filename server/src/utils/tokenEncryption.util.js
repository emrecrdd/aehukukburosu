import crypto from 'crypto';

// ======================================================
// CONSTANTS
// ======================================================

const ALGORITHM =
  'aes-256-gcm';

const IV_LENGTH =
  12;

const AUTH_TAG_LENGTH =
  16;

// ======================================================
// KEY
// ======================================================

const getEncryptionKey =
  () => {
    const rawKey =
      process.env
        .CALENDAR_TOKEN_ENCRYPTION_KEY;

    if (!rawKey) {
      throw new Error(
        'CALENDAR_TOKEN_ENCRYPTION_KEY tanımlı değil'
      );
    }

    /*
     * Env değerinden her zaman 32 byte AES anahtarı
     * üretiyoruz.
     *
     * Böylece env değeri base64/string olsa bile
     * AES-256 için sabit boyut elde edilir.
     */
    return crypto
      .createHash(
        'sha256'
      )
      .update(
        rawKey,
        'utf8'
      )
      .digest();
  };

// ======================================================
// ENCRYPT
// ======================================================

export const encryptToken = (
  value
) => {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ''
  ) {
    return null;
  }

  const key =
    getEncryptionKey();

  const iv =
    crypto.randomBytes(
      IV_LENGTH
    );

  const cipher =
    crypto.createCipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      }
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        String(value),
        'utf8'
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  /*
   * Format:
   *
   * version.iv.authTag.cipherText
   *
   * Hepsi base64url.
   */
  return [
    'v1',

    iv.toString(
      'base64url'
    ),

    authTag.toString(
      'base64url'
    ),

    encrypted.toString(
      'base64url'
    ),
  ].join('.');
};

// ======================================================
// DECRYPT
// ======================================================

export const decryptToken = (
  encryptedValue
) => {
  if (
    encryptedValue ===
      null ||
    encryptedValue ===
      undefined ||
    encryptedValue ===
      ''
  ) {
    return null;
  }

  const parts =
    String(
      encryptedValue
    ).split('.');

  if (
    parts.length !==
    4
  ) {
    throw new Error(
      'Şifreli token formatı geçersiz'
    );
  }

  const [
    version,
    ivValue,
    authTagValue,
    encryptedData,
  ] = parts;

  if (
    version !==
    'v1'
  ) {
    throw new Error(
      'Desteklenmeyen token şifreleme sürümü'
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(
      ivValue,
      'base64url'
    );

  const authTag =
    Buffer.from(
      authTagValue,
      'base64url'
    );

  const encrypted =
    Buffer.from(
      encryptedData,
      'base64url'
    );

  if (
    iv.length !==
    IV_LENGTH
  ) {
    throw new Error(
      'Şifreli token IV değeri geçersiz'
    );
  }

  if (
    authTag.length !==
    AUTH_TAG_LENGTH
  ) {
    throw new Error(
      'Şifreli token doğrulama etiketi geçersiz'
    );
  }

  const decipher =
    crypto.createDecipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      }
    );

  decipher.setAuthTag(
    authTag
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encrypted
      ),

      decipher.final(),
    ]);

  return decrypted.toString(
    'utf8'
  );
};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  encryptToken,
  decryptToken,
};