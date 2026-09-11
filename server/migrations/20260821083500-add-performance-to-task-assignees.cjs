'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'task_assignees',
        'status',
        {
          type:
            Sequelize.ENUM(
              'pending',
              'in_progress',
              'completed'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'task_assignees',
        'progress',
        {
          type:
            Sequelize.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,
        },
        {
          transaction,
        }
      );

      await queryInterface.addColumn(
        'task_assignees',
        'started_at',
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
        'task_assignees',
        'completed_at',
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
        'task_assignees',
        'actual_hours',
        {
          type:
            Sequelize.FLOAT,

          allowNull:
            true,
        },
        {
          transaction,
        }
      );

      await queryInterface.addConstraint(
        'task_assignees',
        {
          fields: [
            'progress',
          ],

          type:
            'check',

          name:
            'task_assignees_progress_range_check',

          where: {
            progress: {
              [Sequelize.Op.between]:
                [
                  0,
                  100,
                ],
            },
          },

          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  async down(
    queryInterface
  ) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeConstraint(
        'task_assignees',
        'task_assignees_progress_range_check',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'task_assignees',
        'actual_hours',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'task_assignees',
        'completed_at',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'task_assignees',
        'started_at',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'task_assignees',
        'progress',
        {
          transaction,
        }
      );

      await queryInterface.removeColumn(
        'task_assignees',
        'status',
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