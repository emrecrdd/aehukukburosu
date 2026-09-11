import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class TaskAssignee extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    TaskAssignee.init(
      {
        task_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          references: {
            model:
              'tasks',

            key:
              'id',
          },
        },

        user_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'in_progress',
              'completed'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        progress: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,

            max:
              100,
          },
        },

        started_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        completed_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        actual_hours: {
          type:
            DataTypes.FLOAT,

          allowNull:
            true,

          validate: {
            min:
              0,
          },
        },
      },
      {
        sequelize,

        tableName:
          'task_assignees',

        timestamps:
          false,

        indexes: [
          {
            fields: [
              'user_id',
            ],
          },
        ],
      }
    );

    return TaskAssignee;
  }
}

export {
  TaskAssignee,
};