import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Task extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Task.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        title: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'in_progress',
              'completed',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        priority: {
          type:
            DataTypes.ENUM(
              'low',
              'normal',
              'high',
              'critical'
            ),

          allowNull:
            false,

          defaultValue:
            'normal',
        },

        due_date: {
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

        created_by: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },

        case_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'cases',

            key:
              'id',
          },
        },

        client_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'clients',

            key:
              'id',
          },
        },

        consultation_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'consultations',

            key:
              'id',
          },
        },

        parent_task_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'tasks',

            key:
              'id',
          },
        },

        reminder_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        reminder_sent: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
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

        tags: {
          type:
            DataTypes.ARRAY(
              DataTypes.STRING
            ),

          allowNull:
            false,

          defaultValue:
            [],
        },

        // ==================================================
        // SÜRE TAKİBİ
        // ==================================================

        started_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        estimated_hours: {
          type:
            DataTypes.FLOAT,

          allowNull:
            true,

          validate: {
            min:
              0,
          },
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

        // ==================================================
        // ONAY
        // ==================================================

        approved_by: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },

        approved_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // ATTACHMENT
        // ==================================================

        attachment_url: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },
      },
      {
        sequelize,

        tableName:
          'tasks',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'client_id',
            ],
          },

          {
            fields: [
              'consultation_id',
            ],
          },

          {
            fields: [
              'parent_task_id',
            ],
          },

          {
            fields: [
              'approved_by',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'priority',
            ],
          },

          {
            fields: [
              'due_date',
            ],
          },

          {
            fields: [
              'status',
              'due_date',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },
        ],
      }
    );

    return Task;
  }
}

export {
  Task,
};
