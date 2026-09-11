import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Template extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Template.init(
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
        // BASIC INFO
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
        // CLASSIFICATION
        // ==================================================

        category: {
          type:
            DataTypes.ENUM(
              'dilekce',
              'ihtar',
              'sozlesme'
            ),

          allowNull:
            false,
        },

        law_area: {
          type:
            DataTypes.ENUM(
              'ozel_hukuk',
              'ceza_hukuku',
              'idare_hukuku',
              'ofis_ici'
            ),

          allowNull:
            false,
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

          set(
            value
          ) {
            this.setDataValue(
              'file_name',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
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
        // VERSION
        // ==================================================

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

        // ==================================================
        // USERS
        // ==================================================

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

        updated_by: {
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

        // ==================================================
        // METRICS / STATE
        // ==================================================

        download_count: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,
          },
        },

        is_active: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            true,
        },
      },
      {
        sequelize,

        tableName:
          'templates',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'category',
            ],
          },

          {
            fields: [
              'law_area',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'updated_by',
            ],
          },

          {
            fields: [
              'is_active',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          {
            fields: [
              'category',
              'law_area',
            ],
          },

          {
            fields: [
              'is_active',
              'created_at',
            ],
          },
        ],
      }
    );

    return Template;
  }
}

export {
  Template,
};