import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Document extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Document.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        name: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        original_name: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_path: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_size: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          validate: {
            min:
              0,
          },
        },

        mime_type: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_type: {
          type:
            DataTypes.ENUM(
              'pdf',
              'word',
              'excel',
              'image',
              'udf',
              'other'
            ),

          allowNull:
            false,

          defaultValue:
            'other',
        },

        category: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
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

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        version: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            1,

          validate: {
            min:
              1,
          },
        },

        parent_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'documents',

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

        power_of_attorney_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'power_of_attorneys',

            key:
              'id',
          },
        },

        uploaded_by: {
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

        is_public: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
        },

        is_archived: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
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
          'documents',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
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
              'uploaded_by',
            ],
          },

          {
            fields: [
              'parent_id',
            ],
          },

          {
            fields: [
              'power_of_attorney_id',
            ],
          },

          {
            fields: [
              'category',
            ],
          },

          {
            fields: [
              'is_archived',
            ],
          },

          {
            fields: [
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
              'client_id',
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

    return Document;
  }
}

export {
  Document,
};
