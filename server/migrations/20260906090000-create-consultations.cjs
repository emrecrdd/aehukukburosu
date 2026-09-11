'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'consultations',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
          },

          consultation_number: {
            type: Sequelize.STRING(32),
            allowNull: false,
          },

          title: {
            type: Sequelize.STRING(240),
            allowNull: false,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          client_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'clients',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },

          prospect_name: {
            type: Sequelize.STRING(200),
            allowNull: true,
          },

          prospect_email: {
            type: Sequelize.STRING(254),
            allowNull: true,
          },

          prospect_phone: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },

          legal_area: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },

          consultation_type: {
            type: Sequelize.STRING(40),
            allowNull: false,
          },

          consultation_mode: {
            type: Sequelize.STRING(24),
            allowNull: true,
          },

          service_model: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'one_time',
          },

          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: 'new',
          },

          priority: {
            type: Sequelize.STRING(16),
            allowNull: false,
            defaultValue: 'normal',
          },

          billing_type: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'fixed',
          },

          agreed_fee: {
            type: Sequelize.DECIMAL(14, 2),
            allowNull: true,
          },

          currency: {
            type: Sequelize.STRING(3),
            allowNull: false,
            defaultValue: 'TRY',
          },

          source: {
            type: Sequelize.STRING(32),
            allowNull: true,
          },

          opened_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          completed_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          converted_case_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'cases',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },

          created_by: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          updated_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },

          metadata: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
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

          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        {
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['consultation_number'],
        {
          name: 'consultations_number_idx',
          unique: true,
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['client_id'],
        {
          name: 'consultations_client_id_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['status'],
        {
          name: 'consultations_status_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['legal_area'],
        {
          name: 'consultations_legal_area_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['consultation_type'],
        {
          name: 'consultations_type_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['converted_case_id'],
        {
          name: 'consultations_converted_case_id_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['created_by'],
        {
          name: 'consultations_created_by_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultations',
        ['deleted_at'],
        {
          name: 'consultations_deleted_at_idx',
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE consultations
          ADD CONSTRAINT consultations_party_required_chk
          CHECK (
            client_id IS NOT NULL
            OR NULLIF(BTRIM(prospect_name), '') IS NOT NULL
          )
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE consultations
          ADD CONSTRAINT consultations_agreed_fee_nonnegative_chk
          CHECK (
            agreed_fee IS NULL
            OR agreed_fee >= 0
          )
        `,
        {
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable(
        'consultations',
        {
          transaction,
        }
      );
    });
  },
};
