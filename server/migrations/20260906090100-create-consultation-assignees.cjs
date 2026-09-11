'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'consultation_assignees',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4,
          },

          consultation_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'consultations',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          is_primary: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },

          assigned_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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

      await queryInterface.addIndex(
        'consultation_assignees',
        ['consultation_id'],
        {
          name: 'consultation_assignees_consultation_id_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultation_assignees',
        ['user_id'],
        {
          name: 'consultation_assignees_user_id_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'consultation_assignees',
        ['consultation_id', 'user_id'],
        {
          name: 'consultation_assignees_consultation_user_uq',
          unique: true,
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX consultation_assignees_one_primary_uq
          ON consultation_assignees (consultation_id)
          WHERE is_primary = true
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
        'consultation_assignees',
        {
          transaction,
        }
      );
    });
  },
};
