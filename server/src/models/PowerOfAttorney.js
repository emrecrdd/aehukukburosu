import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class PowerOfAttorney extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    PowerOfAttorney.init(
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
        // RELATIONS
        // ==================================================

        client_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

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

        // ==================================================
        // BASIC INFO
        // ==================================================

        title: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'title',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'description',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        // ==================================================
        // FILE INFO
        // ==================================================

        file_url: {
          type:
            DataTypes.STRING(
              1000
            ),

          allowNull:
            true,
        },

        file_name: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,
        },

        file_size: {
          type:
            DataTypes.INTEGER,

          allowNull:
            true,

          validate: {
            min:
              0,
          },
        },

        file_type: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,
        },

        // ==================================================
        // DATES
        // ==================================================

        start_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        end_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // STATUS
        // ==================================================

        status: {
          type:
            DataTypes.ENUM(
              'active',
              'expired',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'active',
        },

        // ==================================================
        // AUTHORITIES
        // ==================================================

        authorities: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,

          defaultValue:
            [],

          validate: {
            isArray(
              value
            ) {
              if (
                !Array.isArray(
                  value
                )
              ) {
                throw new Error(
                  'Yetkiler liste formatında olmalıdır'
                );
              }
            },
          },
        },

        // ==================================================
        // NOTES
        // ==================================================

        notes: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'notes',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },
      },
      {
        sequelize,

        tableName:
          'power_of_attorneys',

        paranoid:
          true,

        timestamps:
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
              'created_by',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'start_date',
            ],
          },

          {
            fields: [
              'end_date',
            ],
          },

          {
            fields: [
              'client_id',
              'status',
            ],
          },

          {
            fields: [
              'case_id',
              'status',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },
        ],

        validate: {
          endDateAfterStartDate() {
            if (
              !this.start_date ||
              !this.end_date
            ) {
              return;
            }

            if (
              new Date(
                this.end_date
              ) <
              new Date(
                this.start_date
              )
            ) {
              throw new Error(
                'Vekaletname bitiş tarihi başlangıç tarihinden önce olamaz'
              );
            }
          },
        },
      }
    );

    return PowerOfAttorney;
  }
}

export {
  PowerOfAttorney,
};