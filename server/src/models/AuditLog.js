import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class AuditLog extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    AuditLog.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        action: {
          type:
            DataTypes.ENUM(
              'create',
              'update',
              'delete',
              'view',
              'login',
              'logout',
              'upload',
              'download',
              'share'
            ),

          allowNull:
            false,
        },

        entity_type: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        entity_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,
        },

        old_values: {
          type:
            DataTypes.JSONB,

          allowNull:
            true,
        },

        new_values: {
          type:
            DataTypes.JSONB,

          allowNull:
            true,
        },

        ip_address: {
          type:
            DataTypes.STRING(
              64
            ),

          allowNull:
            true,
        },

        user_agent: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        user_id: {
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
          'audit_logs',

        /*
         * Audit kayıtları soft-delete edilmez.
         *
         * Denetim zincirinin mümkün olduğunca
         * değişmez tutulması tercih edilir.
         */
        paranoid:
          false,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'user_id',
            ],
          },

          {
            fields: [
              'action',
            ],
          },

          {
            fields: [
              'entity_type',
            ],
          },

          {
            fields: [
              'entity_id',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          {
            fields: [
              'entity_type',
              'entity_id',
            ],
          },

          {
            fields: [
              'user_id',
              'created_at',
            ],
          },

          {
            fields: [
              'action',
              'created_at',
            ],
          },
        ],
      }
    );

    return AuditLog;
  }
}

export {
  AuditLog,
};