'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // ==================================================
      // TASK ASSIGNEES
      // ==================================================

      await queryInterface.createTable(
        'task_assignees',
        {
          task_id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,

            references: {
              model: 'tasks',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,

            references: {
              model: 'users',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
        },
        {
          transaction,
        }
      );

      // ==================================================
      // INDEXES
      // ==================================================

      await queryInterface.addIndex(
        'task_assignees',
        ['task_id'],
        {
          name: 'task_assignees_task_id_idx',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'task_assignees',
        ['user_id'],
        {
          name: 'task_assignees_user_id_idx',
          transaction,
        }
      );

      // ==================================================
      // REMOVE LEGACY SINGLE ASSIGNEE
      // ==================================================

      await queryInterface.removeColumn(
        'tasks',
        'assigned_to',
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

  async down(queryInterface, Sequelize) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // ==================================================
      // RESTORE OLD SINGLE ASSIGNEE COLUMN
      // ==================================================

      await queryInterface.addColumn(
        'tasks',
        'assigned_to',
        {
          type: Sequelize.UUID,
          allowNull: true,

          references: {
            model: 'users',
            key: 'id',
          },

          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        {
          transaction,
        }
      );

      // ==================================================
      // DROP MULTIPLE ASSIGNEES TABLE
      // ==================================================

      await queryInterface.dropTable(
        'task_assignees',
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