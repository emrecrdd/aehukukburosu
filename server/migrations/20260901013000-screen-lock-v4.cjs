'use strict';

/**
 * Derkenar Screen Lock V4
 *
 * Creates:
 * - screen_locks
 * - screen_lock_recovery_codes
 *
 * PostgreSQL / Sequelize migration.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'screen_locks',
        {
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },

          pin_hash: {
            type: Sequelize.TEXT,
            allowNull: false,
          },

          is_locked: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },

          failed_attempts: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },

          security_failures: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },

          blocked_until: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          pin_blocked: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },

          last_activity_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          locked_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          pin_changed_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        {
          transaction,
        }
      );

      // SQL sürümündeki negatif sayaç korumalarını aynen koruyoruz.
      await queryInterface.sequelize.query(
        `
          ALTER TABLE screen_locks
          ADD CONSTRAINT screen_locks_failed_attempts_nonnegative
          CHECK (failed_attempts >= 0)
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE screen_locks
          ADD CONSTRAINT screen_locks_security_failures_nonnegative
          CHECK (security_failures >= 0)
        `,
        {
          transaction,
        }
      );

      await queryInterface.createTable(
        'screen_lock_recovery_codes',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },

          code_hash: {
            type: Sequelize.CHAR(64),
            allowNull: false,
          },

          used_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        {
          transaction,
        }
      );

      await queryInterface.addIndex(
        'screen_lock_recovery_codes',
        ['user_id'],
        {
          name: 'idx_screen_lock_recovery_codes_user_id',
          transaction,
        }
      );

      // Aynı kullanıcı için kullanılmamış aynı recovery hash'i tekil olsun.
      // PostgreSQL partial unique index.
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX idx_screen_lock_recovery_codes_active_hash
          ON screen_lock_recovery_codes (user_id, code_hash)
          WHERE used_at IS NULL
        `,
        {
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Önce FK bağımlı tabloyu kaldır.
      await queryInterface.dropTable(
        'screen_lock_recovery_codes',
        {
          transaction,
        }
      );

      await queryInterface.dropTable(
        'screen_locks',
        {
          transaction,
        }
      );
    });
  },
};
