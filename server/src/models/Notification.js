import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Notification extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Notification.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        // ==================================================
        // USER
        // ==================================================

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

        // ==================================================
        // CONTENT
        // ==================================================

        title: {
          type:
            DataTypes.STRING(
              255
            ),

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
              'title',

              typeof value ===
                'string'
                ? value.trim()
                : value
            );
          },
        },

        message: {
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
              'message',

              typeof value ===
                'string'
                ? value.trim()
                : value
            );
          },
        },

        type: {
          type:
            DataTypes.ENUM(
              'task',
              'case',
              'event',
              'meeting',
              'system'
            ),

          allowNull:
            false,

          defaultValue:
            'system',
        },

        // ==================================================
        // STATE
        // ==================================================

        read: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
        },

        // ==================================================
        // NAVIGATION
        // ==================================================

        link: {
          type:
            DataTypes.STRING(
              1000
            ),

          allowNull:
            true,

          set(
            value
          ) {
            if (
              !value
            ) {
              this.setDataValue(
                'link',
                null
              );

              return;
            }

            const normalized =
              String(
                value
              ).trim();

            this.setDataValue(
              'link',
              normalized ||
                null
            );
          },
        },

        // ==================================================
        // METADATA
        // ==================================================

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
          'notifications',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'user_id',
            ],
          },

          {
            fields: [
              'read',
            ],
          },

          {
            fields: [
              'type',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          /*
           * En sık bildirim sorgusu:
           *
           * WHERE user_id = ?
           *   AND read = false
           * ORDER BY created_at DESC
           */
          {
            fields: [
              'user_id',
              'read',
              'created_at',
            ],
          },

          /*
           * Kullanıcının tüm bildirimlerinin
           * tarih sıralı listesi.
           */
          {
            fields: [
              'user_id',
              'created_at',
            ],
          },
        ],
      }
    );

    return Notification;
  }
}

export {
  Notification,
};