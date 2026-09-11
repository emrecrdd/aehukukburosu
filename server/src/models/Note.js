import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Note extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Note.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        content: {
          type:
            DataTypes.TEXT,

          allowNull:
            false,

          validate: {
            notEmpty:
              true,
          },

          set(
            value
          ) {
            this.setDataValue(
              'content',
              typeof value ===
                'string'
                ? value.trim()
                : value
            );
          },
        },

        note_type: {
          type:
            DataTypes.ENUM(
              'general',
              'meeting',
              'phone',
              'email',
              'reminder',
              'task'
            ),

          allowNull:
            false,

          defaultValue:
            'general',
        },

        is_private: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
        },

        is_pinned: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
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

        task_id: {
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

        metadata: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,

          defaultValue:
            {},
        },
      },
      {
        sequelize,

        tableName:
          'notes',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'client_id',
            ],
          },

          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'task_id',
            ],
          },

          {
            fields: [
              'consultation_id',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'note_type',
            ],
          },

          {
            fields: [
              'is_pinned',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          {
            fields: [
              'client_id',
              'created_at',
            ],
          },

          {
            fields: [
              'case_id',
              'created_at',
            ],
          },

          {
            fields: [
              'task_id',
              'created_at',
            ],
          },

          {
            fields: [
              'consultation_id',
              'created_at',
            ],
          },
        ],
      }
    );

    return Note;
  }
}

export {
  Note,
};
