import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class CaseParty extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    CaseParty.init(
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
        // RELATION
        // ==================================================

        case_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'cases',

            key:
              'id',
          },
        },

        // ==================================================
        // PARTY TYPE
        // ==================================================

        party_type: {
          type:
            DataTypes.ENUM(
              'davaci',
              'davali',
              'supheli',
              'sanik',
              'musteki',
              'katilan',
              'magdur',
              'maktul',
              'alacakli',
              'borclu',
              'ucuncu_kisi'
            ),

          allowNull:
            false,
        },

        entity_type: {
          type:
            DataTypes.ENUM(
              'person',
              'company'
            ),

          allowNull:
            false,

          defaultValue:
            'person',
        },

        // ==================================================
        // IDENTITY
        // ==================================================

        name: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          validate: {
            notEmpty: {
              msg:
                'Taraf adı / unvanı gereklidir',
            },

            len: {
              args: [
                2,
                255,
              ],

              msg:
                'Taraf adı / unvanı 2 ile 255 karakter arasında olmalıdır',
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'name',
              String(
                value ||
                ''
              ).trim()
            );
          },
        },

        identification_number: {
          type:
            DataTypes.STRING(
              20
            ),

          allowNull:
            true,

          validate: {
            isValidIdentificationNumber(
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
                  .replace(
                    /\s+/g,
                    ''
                  )
                  .trim();

              if (
                !/^\d+$/.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Kimlik / vergi numarası yalnızca rakamlardan oluşmalıdır'
                );
              }

              /*
               * Şirket için model seviyesinde
               * 10 haneli VKN kontrolü.
               *
               * TCKN algoritmasının detaylı kontrolü
               * service + request validation katmanında
               * ayrıca yapılıyor.
               */
              if (
                this.entity_type ===
                'company'
              ) {
                if (
                  normalized.length !==
                  10
                ) {
                  throw new Error(
                    'Vergi Kimlik Numarası 10 haneli olmalıdır'
                  );
                }

                return;
              }

              if (
                normalized.length !==
                11
              ) {
                throw new Error(
                  'T.C. Kimlik Numarası 11 haneli olmalıdır'
                );
              }

              if (
                normalized.startsWith(
                  '0'
                )
              ) {
                throw new Error(
                  'T.C. Kimlik Numarası 0 ile başlayamaz'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value ===
                undefined ||
              value ===
                null
                ? null
                : String(
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

        tax_office: {
          type:
            DataTypes.STRING(
              150
            ),

          allowNull:
            true,

          validate: {
            len: {
              args: [
                0,
                150,
              ],

              msg:
                'Vergi dairesi en fazla 150 karakter olabilir',
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'tax_office',
              normalized ||
              null
            );
          },
        },

        // ==================================================
        // CONTACT
        // ==================================================

        phone: {
          type:
            DataTypes.STRING(
              30
            ),

          allowNull:
            true,

          validate: {
            isValidPhone(
              value
            ) {
              if (
                !value
              ) {
                return;
              }

              const digits =
                String(
                  value
                ).replace(
                  /\D/g,
                  ''
                );

              if (
                digits.length <
                  10 ||
                digits.length >
                  15
              ) {
                throw new Error(
                  'Geçerli bir telefon numarası giriniz'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'phone',
              normalized ||
              null
            );
          },
        },

        email: {
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
                ).trim();

              const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !emailPattern.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir e-posta adresi giriniz'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  )
                    .trim()
                    .toLowerCase()
                : null;

            this.setDataValue(
              'email',
              normalized ||
              null
            );
          },
        },

        address: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,

          validate: {
            maxLength(
              value
            ) {
              if (
                value &&
                String(
                  value
                ).length >
                  1000
              ) {
                throw new Error(
                  'Adres en fazla 1000 karakter olabilir'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'address',
              normalized ||
              null
            );
          },
        },

        // ==================================================
        // LAWYER
        // ==================================================

        lawyer_name: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'lawyer_name',
              normalized ||
              null
            );
          },
        },

        lawyer_phone: {
          type:
            DataTypes.STRING(
              30
            ),

          allowNull:
            true,

          validate: {
            isValidLawyerPhone(
              value
            ) {
              if (
                !value
              ) {
                return;
              }

              const digits =
                String(
                  value
                ).replace(
                  /\D/g,
                  ''
                );

              if (
                digits.length <
                  10 ||
                digits.length >
                  15
              ) {
                throw new Error(
                  'Geçerli bir avukat telefon numarası giriniz'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'lawyer_phone',
              normalized ||
              null
            );
          },
        },

        lawyer_email: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          validate: {
            isLawyerEmailOrEmpty(
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
                ).trim();

              const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !emailPattern.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir avukat e-posta adresi giriniz'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  )
                    .trim()
                    .toLowerCase()
                : null;

            this.setDataValue(
              'lawyer_email',
              normalized ||
              null
            );
          },
        },

        lawyer_registry_number: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          validate: {
            len: {
              args: [
                0,
                100,
              ],

              msg:
                'Baro sicil numarası en fazla 100 karakter olabilir',
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'lawyer_registry_number',
              normalized ||
              null
            );
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

          validate: {
            maxLength(
              value
            ) {
              if (
                value &&
                String(
                  value
                ).length >
                  3000
              ) {
                throw new Error(
                  'İç not en fazla 3000 karakter olabilir'
                );
              }
            },
          },

          set(
            value
          ) {
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'notes',
              normalized ||
              null
            );
          },
        },
      },

      {
        sequelize,

        tableName:
          'case_parties',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'party_type',
            ],
          },

          {
            fields: [
              'case_id',
              'party_type',
            ],
          },

          {
            fields: [
              'identification_number',
            ],
          },

          /*
           * Aynı dava içerisindeki kimlik numarası
           * sorgularını hızlandırır.
           *
           * Duplicate kontrolü service katmanında
           * ayrıca yapılıyor.
           */
          {
            fields: [
              'case_id',
              'identification_number',
            ],
          },
        ],
      }
    );

    return CaseParty;
  }
}

export {
  CaseParty,
};