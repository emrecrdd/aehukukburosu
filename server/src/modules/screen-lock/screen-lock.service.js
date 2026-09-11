import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {
  sequelize,
} from '../../config/database.js';

import {
  logger,
} from '../../config/logger.js';

import {
  User,
} from '../../models/User.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

import {
  authRepository,
} from '../auth/auth.repository.js';

import {
  screenLockRepository,
} from './screen-lock.repository.js';

const PIN_LENGTH = 4;
const PIN_BCRYPT_ROUNDS = 12;
const IDLE_TIMEOUT_MS = 60 * 1000;
const SUSPICIOUS_FAILURE_LIMIT = 10;
const RECOVERY_CODE_COUNT = 8;

const COOLDOWNS = {
  3:
    30 * 1000,

  4:
    2 * 60 * 1000,
};

export class ScreenLockError extends Error {
  constructor(
    message,
    statusCode = 400,
    code = 'SCREEN_LOCK_ERROR',
    details = {}
  ) {
    super(message);

    this.name =
      'ScreenLockError';

    this.statusCode =
      statusCode;

    this.code =
      code;

    this.details =
      details;
  }
}

const assertUserId = (
  userId
) => {
  if (!userId) {
    throw new ScreenLockError(
      'Kullanıcı bilgisi bulunamadı.',
      401,
      'SCREEN_LOCK_USER_MISSING'
    );
  }
};

const normalizePin = (
  pin
) => {
  return String(
    pin || ''
  ).replace(
    /\D/g,
    ''
  );
};

const validatePin = (
  pin
) => {
  const normalized =
    normalizePin(
      pin
    );

  if (
    normalized.length !==
      PIN_LENGTH
  ) {
    throw new ScreenLockError(
      'PIN 4 haneli olmalıdır.',
      400,
      'SCREEN_PIN_INVALID'
    );
  }

  return normalized;
};

const validateNewPin = (
  pin,
  confirmPin
) => {
  const normalizedPin =
    validatePin(
      pin
    );

  const normalizedConfirm =
    validatePin(
      confirmPin
    );

  if (
    normalizedPin !==
      normalizedConfirm
  ) {
    throw new ScreenLockError(
      'PIN kodları eşleşmiyor.',
      400,
      'SCREEN_PIN_MISMATCH'
    );
  }

  return normalizedPin;
};

const hashRecoveryCode = (
  code
) => {
  return crypto
    .createHash('sha256')
    .update(
      String(
        code || ''
      )
        .trim()
        .toUpperCase(),
      'utf8'
    )
    .digest('hex');
};

const createRecoveryCode = () => {
  const raw =
    crypto
      .randomBytes(8)
      .toString('hex')
      .toUpperCase();

  return `DRK-${raw.slice(
    0,
    4
  )}-${raw.slice(
    4,
    8
  )}-${raw.slice(
    8,
    12
  )}-${raw.slice(
    12,
    16
  )}`;
};

const generateRecoveryCodes = () => {
  return Array.from(
    {
      length:
        RECOVERY_CODE_COUNT,
    },
    () => createRecoveryCode()
  );
};

const secondsUntil = (
  date
) => {
  if (!date) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      (new Date(date).getTime() -
        Date.now()) /
        1000
    )
  );
};

const getAuditContext = (
  context = {}
) => {
  return {
    ip_address:
      context.ipAddress ||
      null,

    user_agent:
      context.userAgent ||
      null,
  };
};

const auditSafely = async ({
  userId,
  description,
  event,
  metadata = {},
  context,
}) => {
  try {
    await AuditLog.create({
      action:
        'update',

      entity_type:
        'screen_lock',

      entity_id:
        userId,

      user_id:
        userId,

      description,

      metadata: {
        event,
        ...metadata,
      },

      ...getAuditContext(
        context
      ),
    });
  } catch (error) {
    logger.warn(
      'Screen-lock audit log could not be written:',
      {
        message:
          error?.message ||
          'unknown error',

        event,

        userId,
      }
    );
  }
};

const buildStatus = async (
  lock
) => {
  if (!lock) {
    return {
      hasPin:
        false,

      isLocked:
        false,

      pinBlocked:
        false,

      blockedUntil:
        null,

      retryAfterSeconds:
        0,

      failedAttempts:
        0,

      remainingPinAttempts:
        5,

      recoveryCodesRemaining:
        0,

      idleTimeoutMs:
        IDLE_TIMEOUT_MS,

      lastActivityAt:
        null,
    };
  }

  const recoveryCodesRemaining =
    await screenLockRepository
      .countActiveRecoveryCodes(
        lock.userId
      );

  return {
    hasPin:
      true,

    isLocked:
      lock.isLocked,

    pinBlocked:
      lock.pinBlocked,

    blockedUntil:
      lock.blockedUntil,

    retryAfterSeconds:
      secondsUntil(
        lock.blockedUntil
      ),

    failedAttempts:
      lock.failedAttempts,

    remainingPinAttempts:
      Math.max(
        0,
        5 -
          lock.failedAttempts
      ),

    recoveryCodesRemaining,

    idleTimeoutMs:
      IDLE_TIMEOUT_MS,

    lastActivityAt:
      lock.lastActivityAt,
  };
};

const revokeSessionsForSecurity =
  async (
    userId,
    context,
    event
  ) => {
    const user =
      await User.findByPk(
        userId
      );

    if (!user) {
      return;
    }

    const currentVersion =
      Number(
        user.token_version ||
          0
      );

    user.token_version =
      Number.isInteger(
        currentVersion
      ) &&
      currentVersion >= 0
        ? currentVersion + 1
        : 1;

    user.refresh_token =
      null;

    await user.save();

    await authRepository
      .invalidateAllRefreshTokens(
        userId
      );

    await auditSafely({
      userId,
      context,
      event:
        'screen_session_revoked',
      description:
        'Şüpheli ekran kilidi denemeleri nedeniyle mevcut oturumlar kapatıldı.',
      metadata: {
        trigger:
          event,
      },
    });
  };

const maybeRevokeForSecurity =
  async (
    userId,
    securityFailures,
    context,
    event
  ) => {
    if (
      securityFailures <
      SUSPICIOUS_FAILURE_LIMIT
    ) {
      return false;
    }

    await revokeSessionsForSecurity(
      userId,
      context,
      event
    );

    return true;
  };

const registerRecoveryFailure =
  async (
    userId,
    context,
    event
  ) => {
    const securityFailures =
      await screenLockRepository
        .incrementSecurityFailure(
          userId
        );

    await auditSafely({
      userId,
      context,
      event,
      description:
        'Ekran kilidi kurtarma doğrulaması başarısız oldu.',
      metadata: {
        securityFailures,
      },
    });

    const revoked =
      await maybeRevokeForSecurity(
        userId,
        securityFailures,
        context,
        event
      );

    if (revoked) {
      throw new ScreenLockError(
        'Çok sayıda şüpheli deneme nedeniyle oturum kapatıldı. Lütfen yeniden giriş yapın.',
        401,
        'SCREEN_SESSION_REVOKED'
      );
    }

    return securityFailures;
  };

const saveNewPinAndRecoveryCodes =
  async ({
    userId,
    pin,
    transaction,
  }) => {
    const pinHash =
      await bcrypt.hash(
        pin,
        PIN_BCRYPT_ROUNDS
      );

    await screenLockRepository
      .upsertPin({
        userId,
        pinHash,
        isLocked:
          false,
        transaction,
      });

    const recoveryCodes =
      generateRecoveryCodes();

    const codeHashes =
      recoveryCodes.map(
        hashRecoveryCode
      );

    await screenLockRepository
      .replaceRecoveryCodes({
        userId,
        codeHashes,
        transaction,
      });

    return recoveryCodes;
  };

const ensureAutoLock =
  async (
    lock,
    context
  ) => {
    if (
      !lock ||
      lock.isLocked ||
      !lock.lastActivityAt
    ) {
      return lock;
    }

    const elapsed =
      Date.now() -
      new Date(
        lock.lastActivityAt
      ).getTime();

    if (
      elapsed <
      IDLE_TIMEOUT_MS
    ) {
      return lock;
    }

    await screenLockRepository
      .markLocked(
        lock.userId
      );

    await auditSafely({
      userId:
        lock.userId,
      context,
      event:
        'screen_lock',
      description:
        'Ekran 60 saniyelik hareketsizlik nedeniyle otomatik kilitlendi.',
      metadata: {
        reason:
          'idle_timeout',
      },
    });

    return screenLockRepository
      .findByUserId(
        lock.userId
      );
  };

export const screenLockService = {
  IDLE_TIMEOUT_MS,

  async getStatus(
    userId,
    context = {}
  ) {
    assertUserId(
      userId
    );

    let lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    lock =
      await ensureAutoLock(
        lock,
        context
      );

    return buildStatus(
      lock
    );
  },

  async setup(
    userId,
    pin,
    confirmPin,
    context = {}
  ) {
    assertUserId(
      userId
    );

    const newPin =
      validateNewPin(
        pin,
        confirmPin
      );

    const existing =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (existing) {
      throw new ScreenLockError(
        'Ekran kilidi PIN’i zaten oluşturulmuş. PIN’i değiştirmek için kurtarma akışını kullanın.',
        409,
        'SCREEN_PIN_ALREADY_EXISTS'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      const recoveryCodes =
        await saveNewPinAndRecoveryCodes({
          userId,
          pin:
            newPin,
          transaction,
        });

      await transaction.commit();

      await auditSafely({
        userId,
        context,
        event:
          'screen_pin_created',
        description:
          'Ekran kilidi PIN’i oluşturuldu.',
      });

      return {
        recoveryCodes,
        status:
          await this.getStatus(
            userId,
            context
          ),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async lock(
    userId,
    context = {},
    reason = 'manual'
  ) {
    assertUserId(
      userId
    );

    const lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      throw new ScreenLockError(
        'Önce ekran kilidi PIN’i oluşturulmalıdır.',
        409,
        'SCREEN_PIN_SETUP_REQUIRED'
      );
    }

    await screenLockRepository
      .markLocked(
        userId
      );

    await auditSafely({
      userId,
      context,
      event:
        'screen_lock',
      description:
        'Ekran kilitlendi.',
      metadata: {
        reason,
      },
    });

    return this.getStatus(
      userId,
      context
    );
  },

  async touch(
    userId,
    context = {}
  ) {
    assertUserId(
      userId
    );

    let lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      return buildStatus(
        null
      );
    }

    lock =
      await ensureAutoLock(
        lock,
        context
      );

    if (
      lock?.isLocked
    ) {
      throw new ScreenLockError(
        'Ekran kilitli. Devam etmek için PIN doğrulaması gereklidir.',
        423,
        'SCREEN_LOCKED',
        {
          status:
            await buildStatus(
              lock
            ),
        }
      );
    }

    await screenLockRepository
      .touch(
        userId
      );

    return this.getStatus(
      userId,
      context
    );
  },

  async unlock(
    userId,
    pin,
    context = {}
  ) {
    assertUserId(
      userId
    );

    const normalizedPin =
      validatePin(
        pin
      );

    const lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      throw new ScreenLockError(
        'Ekran kilidi PIN’i bulunamadı.',
        409,
        'SCREEN_PIN_SETUP_REQUIRED'
      );
    }

    if (
      lock.pinBlocked
    ) {
      const securityFailures =
        await screenLockRepository
          .incrementSecurityFailure(
            userId
          );

      const revoked =
        await maybeRevokeForSecurity(
          userId,
          securityFailures,
          context,
          'screen_pin_blocked_attempt'
        );

      if (revoked) {
        throw new ScreenLockError(
          'Çok sayıda şüpheli deneme nedeniyle oturum kapatıldı. Lütfen yeniden giriş yapın.',
          401,
          'SCREEN_SESSION_REVOKED'
        );
      }

      throw new ScreenLockError(
        'PIN güvenlik nedeniyle bloke edildi. Hesap şifreniz veya kurtarma kodunuz ile sıfırlayın.',
        423,
        'SCREEN_PIN_BLOCKED'
      );
    }

    const retryAfterSeconds =
      secondsUntil(
        lock.blockedUntil
      );

    if (
      retryAfterSeconds > 0
    ) {
      throw new ScreenLockError(
        `Çok fazla yanlış deneme yapıldı. ${retryAfterSeconds} saniye sonra tekrar deneyin.`,
        429,
        'SCREEN_PIN_COOLDOWN',
        {
          retryAfterSeconds,
          blockedUntil:
            lock.blockedUntil,
        }
      );
    }

    let valid =
      false;

    try {
      valid =
        await bcrypt.compare(
          normalizedPin,
          lock.pinHash
        );
    } catch {
      valid =
        false;
    }

    if (!valid) {
      const failedAttempts =
        lock.failedAttempts +
        1;

      const securityFailures =
        lock.securityFailures +
        1;

      let blockedUntil =
        null;

      let pinBlocked =
        false;

      if (
        failedAttempts >= 5
      ) {
        pinBlocked =
          true;
      } else if (
        COOLDOWNS[
          failedAttempts
        ]
      ) {
        blockedUntil =
          new Date(
            Date.now() +
              COOLDOWNS[
                failedAttempts
              ]
          );
      }

      await screenLockRepository
        .registerFailedPin({
          userId,
          failedAttempts,
          securityFailures,
          blockedUntil,
          pinBlocked,
        });

      await auditSafely({
        userId,
        context,
        event:
          pinBlocked
            ? 'screen_pin_blocked'
            : 'screen_pin_failed',
        description:
          pinBlocked
            ? 'Ekran kilidi PIN’i 5 başarısız deneme sonrası bloke edildi.'
            : 'Ekran kilidi PIN doğrulaması başarısız oldu.',
        metadata: {
          failedAttempts,
          securityFailures,
          blockedUntil,
        },
      });

      const revoked =
        await maybeRevokeForSecurity(
          userId,
          securityFailures,
          context,
          'screen_pin_failed'
        );

      if (revoked) {
        throw new ScreenLockError(
          'Çok sayıda şüpheli deneme nedeniyle oturum kapatıldı. Lütfen yeniden giriş yapın.',
          401,
          'SCREEN_SESSION_REVOKED'
        );
      }

      if (pinBlocked) {
        throw new ScreenLockError(
          'PIN 5 başarısız deneme sonrası bloke edildi. Hesap şifreniz veya kurtarma kodunuz ile sıfırlayın.',
          423,
          'SCREEN_PIN_BLOCKED',
          {
            failedAttempts,
          }
        );
      }

      const waitSeconds =
        secondsUntil(
          blockedUntil
        );

      throw new ScreenLockError(
        blockedUntil
          ? `PIN kodu hatalı. ${waitSeconds} saniye sonra tekrar deneyin.`
          : 'PIN kodu hatalı.',
        blockedUntil
          ? 429
          : 401,
        blockedUntil
          ? 'SCREEN_PIN_COOLDOWN'
          : 'SCREEN_PIN_INVALID_CREDENTIALS',
        {
          failedAttempts,
          remainingPinAttempts:
            Math.max(
              0,
              5 -
                failedAttempts
            ),
          retryAfterSeconds:
            waitSeconds,
          blockedUntil,
        }
      );
    }

    await screenLockRepository
      .markUnlocked(
        userId
      );

    await auditSafely({
      userId,
      context,
      event:
        'screen_unlock',
      description:
        'Ekran kilidi PIN ile açıldı.',
    });

    return this.getStatus(
      userId,
      context
    );
  },

  async recoverWithPassword(
    userId,
    password,
    newPin,
    confirmPin,
    context = {}
  ) {
    assertUserId(
      userId
    );

    if (!password) {
      throw new ScreenLockError(
        'Hesap şifresi gereklidir.',
        400,
        'SCREEN_RECOVERY_PASSWORD_REQUIRED'
      );
    }

    const pin =
      validateNewPin(
        newPin,
        confirmPin
      );

    const lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      throw new ScreenLockError(
        'Ekran kilidi PIN’i bulunamadı.',
        409,
        'SCREEN_PIN_SETUP_REQUIRED'
      );
    }

    const user =
      await authRepository
        .findByIdWithPassword(
          userId
        );

    if (
      !user ||
      user.is_active !== true
    ) {
      throw new ScreenLockError(
        'Kullanıcı hesabı kullanılamıyor.',
        401,
        'SCREEN_RECOVERY_USER_INVALID'
      );
    }

    const validPassword =
      await user.comparePassword(
        password
      );

    if (!validPassword) {
      await registerRecoveryFailure(
        userId,
        context,
        'screen_recovery_password_failed'
      );

      throw new ScreenLockError(
        'Hesap şifresi hatalı.',
        401,
        'SCREEN_RECOVERY_PASSWORD_INVALID'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      const recoveryCodes =
        await saveNewPinAndRecoveryCodes({
          userId,
          pin,
          transaction,
        });

      await transaction.commit();

      await auditSafely({
        userId,
        context,
        event:
          'screen_pin_reset',
        description:
          'Ekran kilidi PIN’i hesap şifresi doğrulanarak sıfırlandı.',
        metadata: {
          recoveryMethod:
            'account_password',
        },
      });

      return {
        recoveryCodes,
        status:
          await this.getStatus(
            userId,
            context
          ),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async recoverWithCode(
    userId,
    recoveryCode,
    newPin,
    confirmPin,
    context = {}
  ) {
    assertUserId(
      userId
    );

    if (!recoveryCode) {
      throw new ScreenLockError(
        'Kurtarma kodu gereklidir.',
        400,
        'SCREEN_RECOVERY_CODE_REQUIRED'
      );
    }

    const pin =
      validateNewPin(
        newPin,
        confirmPin
      );

    const lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      throw new ScreenLockError(
        'Ekran kilidi PIN’i bulunamadı.',
        409,
        'SCREEN_PIN_SETUP_REQUIRED'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      const consumed =
        await screenLockRepository
          .consumeRecoveryCode({
            userId,
            codeHash:
              hashRecoveryCode(
                recoveryCode
              ),
            transaction,
          });

      if (!consumed) {
        await transaction.rollback();

        await registerRecoveryFailure(
          userId,
          context,
          'screen_recovery_code_failed'
        );

        throw new ScreenLockError(
          'Kurtarma kodu geçersiz veya daha önce kullanılmış.',
          401,
          'SCREEN_RECOVERY_CODE_INVALID'
        );
      }

      const recoveryCodes =
        await saveNewPinAndRecoveryCodes({
          userId,
          pin,
          transaction,
        });

      await transaction.commit();

      await auditSafely({
        userId,
        context,
        event:
          'screen_recovery_used',
        description:
          'Ekran kilidi tek kullanımlık kurtarma kodu ile sıfırlandı.',
        metadata: {
          recoveryMethod:
            'recovery_code',
        },
      });

      return {
        recoveryCodes,
        status:
          await this.getStatus(
            userId,
            context
          ),
      };
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      throw error;
    }
  },

  async regenerateRecoveryCodes(
    userId,
    password,
    context = {}
  ) {
    assertUserId(
      userId
    );

    if (!password) {
      throw new ScreenLockError(
        'Hesap şifresi gereklidir.',
        400,
        'SCREEN_RECOVERY_PASSWORD_REQUIRED'
      );
    }

    const user =
      await authRepository
        .findByIdWithPassword(
          userId
        );

    const valid =
      Boolean(
        user &&
          user.is_active === true &&
          (await user.comparePassword(
            password
          ))
      );

    if (!valid) {
      await registerRecoveryFailure(
        userId,
        context,
        'screen_recovery_regenerate_failed'
      );

      throw new ScreenLockError(
        'Hesap şifresi hatalı.',
        401,
        'SCREEN_RECOVERY_PASSWORD_INVALID'
      );
    }

    const recoveryCodes =
      generateRecoveryCodes();

    await screenLockRepository
      .replaceRecoveryCodes({
        userId,
        codeHashes:
          recoveryCodes.map(
            hashRecoveryCode
          ),
      });

    await auditSafely({
      userId,
      context,
      event:
        'screen_recovery_codes_regenerated',
      description:
        'Ekran kilidi kurtarma kodları yenilendi.',
    });

    return {
      recoveryCodes,
    };
  },

  async enforceRequest(
    req
  ) {
    const userId =
      req?.user?.id;

    if (!userId) {
      return null;
    }

    const originalUrl =
      String(
        req.originalUrl ||
          req.url ||
          ''
      ).split('?')[0];

    if (
      originalUrl.startsWith(
        '/api/screen-lock'
      )
    ) {
      return null;
    }

    if (
      req.method === 'GET' &&
      originalUrl ===
        '/api/auth/profile'
    ) {
      return null;
    }

    let lock =
      await screenLockRepository
        .findByUserId(
          userId
        );

    if (!lock) {
      return {
        statusCode:
          428,

        body: {
          success:
            false,

          message:
            'Devam etmek için ekran kilidi PIN’i oluşturulmalıdır.',

          code:
            'SCREEN_PIN_SETUP_REQUIRED',
        },
      };
    }

    lock =
      await ensureAutoLock(
        lock,
        {
          ipAddress:
            req.realClientIp ||
            req.ip ||
            null,

          userAgent:
            req.headers
              ?.['user-agent'] ||
            null,
        }
      );

    if (!lock?.isLocked) {
      return null;
    }

    return {
      statusCode:
        423,

      body: {
        success:
          false,

        message:
          'Ekran kilitli. Devam etmek için PIN doğrulaması gereklidir.',

        code:
          'SCREEN_LOCKED',

        data:
          await buildStatus(
            lock
          ),
      },
    };
  },
};

export default screenLockService;
