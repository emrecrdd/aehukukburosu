import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class CalendarIntegration extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    CalendarIntegration.init(
      {
        id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          defaultValue:
            DataTypes.UUIDV4,
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
        // PROVIDER
        // ==================================================

        provider: {
          type:
            DataTypes.ENUM(
              'google',
              'microsoft'
            ),

          allowNull:
            false,

          defaultValue:
            'google',
        },

        // ==================================================
        // ACCOUNT
        // ==================================================

        account_email: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          validate: {
            isEmailOrEmpty(
              value
            ) {
              if (
                !value
              ) {
                return;
              }

              const normalized =
                String(
                  value
                )
                  .trim()
                  .toLowerCase();

              const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !emailPattern.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir hesap e-posta adresi girilmelidir'
                );
              }
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'account_email',

              value
                ? String(
                    value
                  )
                    .trim()
                    .toLowerCase()
                : null
            );
          },
        },

        calendar_id: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          defaultValue:
            'primary',

          set(
            value
          ) {
            const normalized =
              String(
                value ||
                  'primary'
              ).trim();

            this.setDataValue(
              'calendar_id',

              normalized ||
                'primary'
            );
          },
        },

        // ==================================================
        // TOKENS
        // ==================================================

        access_token_encrypted: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        refresh_token_encrypted: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        token_type: {
          type:
            DataTypes.STRING(
              50
            ),

          allowNull:
            true,
        },

        scope: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        expires_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // CONNECTION STATE
        // ==================================================

        is_active: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            true,
        },

        last_synced_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        last_error: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },
      },
      {
        sequelize,

        modelName:
          'CalendarIntegration',

        tableName:
          'calendar_integrations',

        timestamps:
          true,

        paranoid:
          false,

        indexes: [
          {
            unique:
              true,

            name:
              'calendar_integrations_user_provider_unique',

            fields: [
              'user_id',
              'provider',
            ],
          },

          {
            name:
              'calendar_integrations_provider_active_idx',

            fields: [
              'provider',
              'is_active',
            ],
          },
        ],
      }
    );

    return CalendarIntegration;
  }
}

export {
  CalendarIntegration,
};

export default CalendarIntegration;