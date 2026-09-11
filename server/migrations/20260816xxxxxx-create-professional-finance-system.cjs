'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // ====================================================
      // PAYMENT PLANS
      // ====================================================

      await queryInterface.createTable(
        'payment_plans',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue:
              Sequelize.UUIDV4,
          },

          title: {
            type:
              Sequelize.STRING(
                255
              ),
            allowNull: false,
          },

          description: {
            type:
              Sequelize.TEXT,
            allowNull: true,
          },

          total_amount: {
            type:
              Sequelize.DECIMAL(
                15,
                2
              ),
            allowNull: false,
          },

          down_payment_amount:
            {
              type:
                Sequelize.DECIMAL(
                  15,
                  2
                ),
              allowNull: false,
              defaultValue: 0,
            },

          currency: {
            type:
              Sequelize.STRING(
                3
              ),
            allowNull: false,
            defaultValue:
              'TRY',
          },

          plan_type: {
            type:
              Sequelize.ENUM(
                'one_time',
                'installment',
                'custom'
              ),

            allowNull: false,
            defaultValue:
              'installment',
          },

          status: {
            type:
              Sequelize.ENUM(
                'draft',
                'active',
                'completed',
                'cancelled',
                'defaulted'
              ),

            allowNull: false,
            defaultValue:
              'draft',
          },

          start_date: {
            type:
              Sequelize.DATEONLY,
            allowNull: true,
          },

          end_date: {
            type:
              Sequelize.DATEONLY,
            allowNull: true,
          },

          activated_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },

          completed_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },

          cancelled_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },

          // ================================================
          // REMINDER SETTINGS
          // ================================================

          auto_reminders_enabled:
            {
              type:
                Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue:
                true,
            },

          remind_days_before:
            {
              type:
                Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 3,
            },

          notify_on_due_date:
            {
              type:
                Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue:
                true,
            },

          notify_on_overdue:
            {
              type:
                Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue:
                true,
            },

          notify_by_email: {
            type:
              Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue:
              true,
          },

          notify_by_sms: {
            type:
              Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue:
              false,
          },

          notify_in_app: {
            type:
              Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue:
              true,
          },

          // ================================================
          // RELATIONS
          // ================================================

          client_id: {
            type:
              Sequelize.UUID,
            allowNull: false,

            references: {
              model:
                'clients',
              key: 'id',
            },

            onUpdate:
              'CASCADE',

            onDelete:
              'RESTRICT',
          },

          case_id: {
            type:
              Sequelize.UUID,
            allowNull: true,

            references: {
              model:
                'cases',
              key: 'id',
            },

            onUpdate:
              'CASCADE',

            onDelete:
              'SET NULL',
          },

          created_by: {
            type:
              Sequelize.UUID,
            allowNull: false,

            references: {
              model:
                'users',
              key: 'id',
            },

            onUpdate:
              'CASCADE',

            onDelete:
              'RESTRICT',
          },

          updated_by: {
            type:
              Sequelize.UUID,
            allowNull: true,

            references: {
              model:
                'users',
              key: 'id',
            },

            onUpdate:
              'CASCADE',

            onDelete:
              'SET NULL',
          },

          reference_number:
            {
              type:
                Sequelize.STRING(
                  100
                ),
              allowNull: true,
            },

          notes: {
            type:
              Sequelize.TEXT,
            allowNull: true,
          },

          created_at: {
            type:
              Sequelize.DATE,
            allowNull: false,
            defaultValue:
              Sequelize.fn(
                'NOW'
              ),
          },

          updated_at: {
            type:
              Sequelize.DATE,
            allowNull: false,
            defaultValue:
              Sequelize.fn(
                'NOW'
              ),
          },

          deleted_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },
        },
        {
          transaction,
        }
      );

      // ====================================================
      // PAYMENT PLAN INDEXES
      // ====================================================

      await queryInterface.addIndex(
        'payment_plans',
        ['client_id'],
        {
          name:
            'idx_payment_plans_client_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        ['case_id'],
        {
          name:
            'idx_payment_plans_case_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        ['created_by'],
        {
          name:
            'idx_payment_plans_created_by',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        ['status'],
        {
          name:
            'idx_payment_plans_status',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        ['plan_type'],
        {
          name:
            'idx_payment_plans_plan_type',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        [
          'client_id',
          'status',
        ],
        {
          name:
            'idx_payment_plans_client_status',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        [
          'case_id',
          'status',
        ],
        {
          name:
            'idx_payment_plans_case_status',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_plans',
        [
          'client_id',
          'created_at',
        ],
        {
          name:
            'idx_payment_plans_client_created_at',
          transaction,
        }
      );

      // ====================================================
      // PAYMENT INSTALLMENTS
      // ====================================================

      await queryInterface.createTable(
        'payment_installments',
        {
          id: {
            type:
              Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue:
              Sequelize.UUIDV4,
          },

          payment_plan_id:
            {
              type:
                Sequelize.UUID,

              allowNull: false,

              references: {
                model:
                  'payment_plans',
                key: 'id',
              },

              onUpdate:
                'CASCADE',

              onDelete:
                'CASCADE',
            },

          installment_number:
            {
              type:
                Sequelize.INTEGER,
              allowNull: false,
            },

          title: {
            type:
              Sequelize.STRING(
                255
              ),
            allowNull: true,
          },

          amount: {
            type:
              Sequelize.DECIMAL(
                15,
                2
              ),
            allowNull: false,
          },

          paid_amount: {
            type:
              Sequelize.DECIMAL(
                15,
                2
              ),
            allowNull: false,
            defaultValue: 0,
          },

          due_date: {
            type:
              Sequelize.DATEONLY,
            allowNull: false,
          },

          paid_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },

          status: {
            type:
              Sequelize.ENUM(
                'pending',
                'partial',
                'paid',
                'overdue',
                'cancelled'
              ),

            allowNull: false,
            defaultValue:
              'pending',
          },

          reminder_before_sent_at:
            {
              type:
                Sequelize.DATE,
              allowNull: true,
            },

          due_date_reminder_sent_at:
            {
              type:
                Sequelize.DATE,
              allowNull: true,
            },

          overdue_reminder_sent_at:
            {
              type:
                Sequelize.DATE,
              allowNull: true,
            },

          last_reminder_sent_at:
            {
              type:
                Sequelize.DATE,
              allowNull: true,
            },

          notes: {
            type:
              Sequelize.TEXT,
            allowNull: true,
          },

          created_at: {
            type:
              Sequelize.DATE,
            allowNull: false,
            defaultValue:
              Sequelize.fn(
                'NOW'
              ),
          },

          updated_at: {
            type:
              Sequelize.DATE,
            allowNull: false,
            defaultValue:
              Sequelize.fn(
                'NOW'
              ),
          },

          deleted_at: {
            type:
              Sequelize.DATE,
            allowNull: true,
          },
        },
        {
          transaction,
        }
      );

      // ====================================================
      // INSTALLMENT INDEXES
      // ====================================================

      await queryInterface.addIndex(
        'payment_installments',
        ['payment_plan_id'],
        {
          name:
            'idx_payment_installments_plan_id',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        ['due_date'],
        {
          name:
            'idx_payment_installments_due_date',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        ['status'],
        {
          name:
            'idx_payment_installments_status',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        [
          'payment_plan_id',
          'status',
        ],
        {
          name:
            'idx_payment_installments_plan_status',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        [
          'payment_plan_id',
          'due_date',
        ],
        {
          name:
            'idx_payment_installments_plan_due_date',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        [
          'status',
          'due_date',
        ],
        {
          name:
            'idx_payment_installments_status_due_date',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'payment_installments',
        [
          'payment_plan_id',
          'installment_number',
        ],
        {
          name:
            'uq_payment_installments_plan_number',

          unique:
            true,

          transaction,
        }
      );

      // ====================================================
      // PAYMENTS - NEW RELATIONS
      // ====================================================

      await queryInterface.addColumn(
        'payments',
        'payment_plan_id',
        {
          type:
            Sequelize.UUID,

          allowNull:
            true,

          references: {
            model:
              'payment_plans',
            key: 'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'SET NULL',
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'payments',
        'installment_id',
        {
          type:
            Sequelize.UUID,

          allowNull:
            true,

          references: {
            model:
              'payment_installments',
            key: 'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'SET NULL',
        },
        {
          transaction,
        }
      );

      // ====================================================
      // REVERSAL
      // ====================================================

      await queryInterface.addColumn(
        'payments',
        'reversed_payment_id',
        {
          type:
            Sequelize.UUID,

          allowNull:
            true,

          references: {
            model:
              'payments',
            key: 'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'SET NULL',
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'payments',
        'reversal_reason',
        {
          type:
            Sequelize.STRING(
              500
            ),

          allowNull:
            true,
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'payments',
        'reversed_at',
        {
          type:
            Sequelize.DATE,

          allowNull:
            true,
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'payments',
        'reversed_by',
        {
          type:
            Sequelize.UUID,

          allowNull:
            true,

          references: {
            model:
              'users',
            key: 'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'SET NULL',
        },
        {
          transaction,
        }
      );

      // ====================================================
      // PAYMENT INDEXES
      // ====================================================

      await queryInterface.addIndex(
        'payments',
        ['payment_plan_id'],
        {
          name:
            'idx_payments_payment_plan_id',

          transaction,
        }
      );

      await queryInterface.addIndex(
        'payments',
        ['installment_id'],
        {
          name:
            'idx_payments_installment_id',

          transaction,
        }
      );

      await queryInterface.addIndex(
        'payments',
        ['reversed_payment_id'],
        {
          name:
            'idx_payments_reversed_payment_id',

          transaction,
        }
      );

      await queryInterface.addIndex(
        'payments',
        [
          'payment_plan_id',
          'status',
        ],
        {
          name:
            'idx_payments_plan_status',

          transaction,
        }
      );

      await queryInterface.addIndex(
        'payments',
        [
          'installment_id',
          'status',
        ],
        {
          name:
            'idx_payments_installment_status',

          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ======================================================
  // DOWN
  // ======================================================

  async down(
    queryInterface
  ) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // ====================================================
      // REMOVE PAYMENT INDEXES
      // ====================================================

      await queryInterface.removeIndex(
        'payments',
        'idx_payments_installment_status',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'payments',
        'idx_payments_plan_status',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'payments',
        'idx_payments_reversed_payment_id',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'payments',
        'idx_payments_installment_id',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'payments',
        'idx_payments_payment_plan_id',
        {
          transaction,
        }
      );

      // ====================================================
      // REMOVE PAYMENT COLUMNS
      // ====================================================

      await queryInterface.removeColumn(
        'payments',
        'reversed_by',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'payments',
        'reversed_at',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'payments',
        'reversal_reason',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'payments',
        'reversed_payment_id',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'payments',
        'installment_id',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'payments',
        'payment_plan_id',
        {
          transaction,
        }
      );

      // ====================================================
      // REMOVE TABLES
      // ====================================================

      await queryInterface.dropTable(
        'payment_installments',
        {
          transaction,
        }
      );

      await queryInterface.dropTable(
        'payment_plans',
        {
          transaction,
        }
      );

      // ====================================================
      // POSTGRES ENUM CLEANUP
      // ====================================================

      await queryInterface.sequelize.query(
        `
        DROP TYPE IF EXISTS
        "enum_payment_installments_status";
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
        DROP TYPE IF EXISTS
        "enum_payment_plans_status";
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
        DROP TYPE IF EXISTS
        "enum_payment_plans_plan_type";
        `,
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },
};