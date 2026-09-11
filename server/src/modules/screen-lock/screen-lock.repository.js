import crypto from 'crypto';

import {
  QueryTypes,
} from 'sequelize';

import {
  sequelize,
} from '../../config/database.js';

const mapLockRow = (
  row
) => {
  if (!row) {
    return null;
  }

  return {
    userId:
      row.user_id,

    pinHash:
      row.pin_hash,

    isLocked:
      row.is_locked === true,

    failedAttempts:
      Number(
        row.failed_attempts || 0
      ),

    securityFailures:
      Number(
        row.security_failures || 0
      ),

    blockedUntil:
      row.blocked_until
        ? new Date(
            row.blocked_until
          )
        : null,

    pinBlocked:
      row.pin_blocked === true,

    lastActivityAt:
      row.last_activity_at
        ? new Date(
            row.last_activity_at
          )
        : null,

    lockedAt:
      row.locked_at
        ? new Date(
            row.locked_at
          )
        : null,

    pinChangedAt:
      row.pin_changed_at
        ? new Date(
            row.pin_changed_at
          )
        : null,
  };
};

const selectLockSql = `
  SELECT
    user_id,
    pin_hash,
    is_locked,
    failed_attempts,
    security_failures,
    blocked_until,
    pin_blocked,
    last_activity_at,
    locked_at,
    pin_changed_at
  FROM screen_locks
  WHERE user_id = :userId
`;

export const screenLockRepository = {
  async findByUserId(
    userId,
    options = {}
  ) {
    const rows =
      await sequelize.query(
        selectLockSql,
        {
          replacements: {
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction:
            options.transaction,
        }
      );

    return mapLockRow(
      rows[0]
    );
  },

  async upsertPin({
    userId,
    pinHash,
    isLocked = false,
    transaction,
  }) {
    await sequelize.query(
      `
        INSERT INTO screen_locks (
          user_id,
          pin_hash,
          is_locked,
          failed_attempts,
          security_failures,
          blocked_until,
          pin_blocked,
          last_activity_at,
          locked_at,
          pin_changed_at,
          created_at,
          updated_at
        )
        VALUES (
          :userId,
          :pinHash,
          :isLocked,
          0,
          0,
          NULL,
          FALSE,
          NOW(),
          CASE WHEN :isLocked THEN NOW() ELSE NULL END,
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          pin_hash = EXCLUDED.pin_hash,
          is_locked = EXCLUDED.is_locked,
          failed_attempts = 0,
          security_failures = 0,
          blocked_until = NULL,
          pin_blocked = FALSE,
          last_activity_at = NOW(),
          locked_at = CASE WHEN EXCLUDED.is_locked THEN NOW() ELSE NULL END,
          pin_changed_at = NOW(),
          updated_at = NOW()
      `,
      {
        replacements: {
          userId,
          pinHash,
          isLocked,
        },

        type:
          QueryTypes.INSERT,

        transaction,
      }
    );

    return this.findByUserId(
      userId,
      {
        transaction,
      }
    );
  },

  async markLocked(
    userId,
    options = {}
  ) {
    await sequelize.query(
      `
        UPDATE screen_locks
        SET
          is_locked = TRUE,
          locked_at = COALESCE(locked_at, NOW()),
          updated_at = NOW()
        WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
        },

        type:
          QueryTypes.UPDATE,

        transaction:
          options.transaction,
      }
    );
  },

  async markUnlocked(
    userId,
    options = {}
  ) {
    await sequelize.query(
      `
        UPDATE screen_locks
        SET
          is_locked = FALSE,
          locked_at = NULL,
          failed_attempts = 0,
          security_failures = 0,
          blocked_until = NULL,
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
        },

        type:
          QueryTypes.UPDATE,

        transaction:
          options.transaction,
      }
    );
  },

  async touch(
    userId,
    options = {}
  ) {
    await sequelize.query(
      `
        UPDATE screen_locks
        SET
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE
          user_id = :userId
          AND is_locked = FALSE
      `,
      {
        replacements: {
          userId,
        },

        type:
          QueryTypes.UPDATE,

        transaction:
          options.transaction,
      }
    );
  },

  async registerFailedPin({
    userId,
    failedAttempts,
    securityFailures,
    blockedUntil = null,
    pinBlocked = false,
    transaction,
  }) {
    await sequelize.query(
      `
        UPDATE screen_locks
        SET
          failed_attempts = :failedAttempts,
          security_failures = :securityFailures,
          blocked_until = :blockedUntil,
          pin_blocked = :pinBlocked,
          is_locked = TRUE,
          locked_at = COALESCE(locked_at, NOW()),
          updated_at = NOW()
        WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
          failedAttempts,
          securityFailures,
          blockedUntil,
          pinBlocked,
        },

        type:
          QueryTypes.UPDATE,

        transaction,
      }
    );
  },

  async incrementSecurityFailure(
    userId,
    options = {}
  ) {
    const rows =
      await sequelize.query(
        `
          UPDATE screen_locks
          SET
            security_failures = security_failures + 1,
            updated_at = NOW()
          WHERE user_id = :userId
          RETURNING security_failures
        `,
        {
          replacements: {
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction:
            options.transaction,
        }
      );

    return Number(
      rows[0]?.security_failures ||
        0
    );
  },

  async resetSecurityState(
    userId,
    options = {}
  ) {
    await sequelize.query(
      `
        UPDATE screen_locks
        SET
          failed_attempts = 0,
          security_failures = 0,
          blocked_until = NULL,
          pin_blocked = FALSE,
          updated_at = NOW()
        WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
        },

        type:
          QueryTypes.UPDATE,

        transaction:
          options.transaction,
      }
    );
  },

  async replaceRecoveryCodes({
    userId,
    codeHashes,
    transaction,
  }) {
    await sequelize.query(
      `
        DELETE FROM screen_lock_recovery_codes
        WHERE user_id = :userId
      `,
      {
        replacements: {
          userId,
        },

        type:
          QueryTypes.DELETE,

        transaction,
      }
    );

    for (
      const codeHash of codeHashes
    ) {
      await sequelize.query(
        `
          INSERT INTO screen_lock_recovery_codes (
            id,
            user_id,
            code_hash,
            used_at,
            created_at
          )
          VALUES (
            :id,
            :userId,
            :codeHash,
            NULL,
            NOW()
          )
        `,
        {
          replacements: {
            id:
              crypto.randomUUID(),
            userId,
            codeHash,
          },

          type:
            QueryTypes.INSERT,

          transaction,
        }
      );
    }
  },

  async consumeRecoveryCode({
    userId,
    codeHash,
    transaction,
  }) {
    const rows =
      await sequelize.query(
        `
          UPDATE screen_lock_recovery_codes
          SET used_at = NOW()
          WHERE id = (
            SELECT id
            FROM screen_lock_recovery_codes
            WHERE
              user_id = :userId
              AND code_hash = :codeHash
              AND used_at IS NULL
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING id
        `,
        {
          replacements: {
            userId,
            codeHash,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    return Boolean(
      rows[0]?.id
    );
  },

  async countActiveRecoveryCodes(
    userId,
    options = {}
  ) {
    const rows =
      await sequelize.query(
        `
          SELECT COUNT(*)::INTEGER AS count
          FROM screen_lock_recovery_codes
          WHERE
            user_id = :userId
            AND used_at IS NULL
        `,
        {
          replacements: {
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction:
            options.transaction,
        }
      );

    return Number(
      rows[0]?.count || 0
    );
  },
};

export default screenLockRepository;
