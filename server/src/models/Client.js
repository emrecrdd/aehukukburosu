import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Client extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Client.init(
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
        // TEMEL BİLGİLER
        // ==================================================

        name: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          validate: {
            notEmpty:
              true,

            len: [
              2,
              255,
            ],
          },

          set(value) {
            const normalized =
              typeof value ===
                'string'
                ? value.trim()
                : value;

            this.setDataValue(
              'name',
              normalized
            );
          },
        },

        client_type: {
          type:
            DataTypes.ENUM(
              'individual',
              'corporate'
            ),

          allowNull:
            false,

          defaultValue:
            'individual',
        },

        identification_number: {
          type:
            DataTypes.STRING(
              32
            ),

          allowNull:
            true,

          /*
           * unique:true KULLANMIYORUZ.
           *
           * Model paranoid:true olduğu için benzersizlik
           * migration tarafındaki partial unique index ile:
           *
           * WHERE deleted_at IS NULL
           *
           * koşulunda sağlanır.
           */

          set(value) {
            if (
              value ===
                undefined ||
              value ===
                null
            ) {
              this.setDataValue(
                'identification_number',
                null
              );

              return;
            }

            const normalized =
              String(
                value
              )
                .replace(
                  /\s+/g,
                  ''
                )
                .trim();

            this.setDataValue(
              'identification_number',
              normalized ||
                null
            );
          },
        },

        // ==================================================
        // İLETİŞİM
        // ==================================================

        email: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          /*
           * unique:true burada da kullanılmaz.
           *
           * Aktif müvekkiller arasında benzersizlik
           * partial unique index ile sağlanacaktır.
           */

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

              const regex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !regex.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir e-posta adresi girilmelidir'
                );
              }
            },
          },

          set(value) {
            if (
              !value
            ) {
              this.setDataValue(
                'email',
                null
              );

              return;
            }

            const normalized =
              String(
                value
              )
                .trim()
                .toLowerCase();

            this.setDataValue(
              'email',
              normalized ||
                null
            );
          },
        },

        phone: {
          type:
            DataTypes.STRING(
              32
            ),

          allowNull:
            true,

          /*
           * unique:true burada kullanılmaz.
           *
           * Aktif müvekkiller arasında benzersizlik
           * migration tarafındaki partial unique index
           * üzerinden uygulanacaktır.
           */

          set(value) {
            if (
              !value
            ) {
              this.setDataValue(
                'phone',
                null
              );

              return;
            }

            const normalized =
              String(
                value
              )
                .trim()
                .replace(
                  /\s+/g,
                  ' '
                );

            this.setDataValue(
              'phone',
              normalized ||
                null
            );
          },
        },

        // ==================================================
        // ADRES
        // ==================================================

        address: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        city: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          set(value) {
            this.setDataValue(
              'city',
              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        district: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          set(value) {
            this.setDataValue(
              'district',
              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        postal_code: {
          type:
            DataTypes.STRING(
              20
            ),

          allowNull:
            true,
        },

        // ==================================================
        // SINIFLANDIRMA
        // ==================================================

        status: {
          type:
            DataTypes.ENUM(
              'active',
              'passive',
              'archived'
            ),

          allowNull:
            false,

          defaultValue:
            'active',
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

        notes: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        // ==================================================
        // AUDIT
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
      },
      {
        sequelize,

        tableName:
          'clients',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'client_type',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'city',
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

    return Client;
  }

  // ======================================================
  // VIRTUALS
  // ======================================================

  get fullName() {
    return (
      this.name ||
      'İsimsiz Müvekkil'
    );
  }

  // ======================================================
  // SERIALIZATION
  // ======================================================

  toJSON() {
    const values = {
      ...this.get(),
    };

    values.fullName =
      this.fullName;

    return values;
  }
}

export {
  Client,
};