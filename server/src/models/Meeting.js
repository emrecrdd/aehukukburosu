import {
  Sequelize,
  DataTypes,
} from 'sequelize';

const MEETING_TYPES = [
  'client',
  'internal',
  'phone',
  'other',
];

const MEETING_STATUSES = [
  'scheduled',
  'ongoing',
  'completed',
  'cancelled',
];

const normalizeNullableText = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return (
    normalized ||
    null
  );
};

class Meeting extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Meeting.init(
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
        // MEETING
        // ==================================================

        title: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          validate: {
            notNull: {
              msg:
                'Toplantı başlığı zorunludur',
            },

            notEmpty: {
              msg:
                'Toplantı başlığı zorunludur',
            },

            len: {
              args: [
                2,
                255,
              ],

              msg:
                'Toplantı başlığı 2 ile 255 karakter arasında olmalıdır',
            },
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
              normalizeNullableText(
                value
              )
            );
          },
        },

        start_date: {
          type:
            DataTypes.DATE,

          allowNull:
            false,

          validate: {
            notNull: {
              msg:
                'Toplantı başlangıç tarihi zorunludur',
            },

            isValidStartDate(
              value
            ) {
              const parsed =
                new Date(
                  value
                );

              if (
                Number.isNaN(
                  parsed.getTime()
                )
              ) {
                throw new Error(
                  'Geçerli bir toplantı başlangıç tarihi girilmelidir'
                );
              }
            },
          },
        },

        end_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,

          validate: {
            isAfterStart(
              value
            ) {
              if (!value) {
                return;
              }

              const endDate =
                new Date(
                  value
                );

              if (
                Number.isNaN(
                  endDate.getTime()
                )
              ) {
                throw new Error(
                  'Geçerli bir toplantı bitiş tarihi girilmelidir'
                );
              }

              if (
                !this.start_date
              ) {
                return;
              }

              const startDate =
                new Date(
                  this.start_date
                );

              if (
                Number.isNaN(
                  startDate.getTime()
                )
              ) {
                return;
              }

              if (
                endDate <
                startDate
              ) {
                throw new Error(
                  'Toplantı bitiş tarihi başlangıç tarihinden önce olamaz'
                );
              }
            },
          },
        },

        location: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          validate: {
            len: {
              args: [
                0,
                255,
              ],

              msg:
                'Toplantı konumu en fazla 255 karakter olabilir',
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'location',
              normalizeNullableText(
                value
              )
            );
          },
        },

        meeting_type: {
          type:
            DataTypes.ENUM(
              ...MEETING_TYPES
            ),

          allowNull:
            false,

          defaultValue:
            'other',

          validate: {
            notNull: {
              msg:
                'Toplantı türü zorunludur',
            },

            isIn: {
              args: [
                MEETING_TYPES,
              ],

              msg:
                'Geçerli bir toplantı türü seçilmelidir',
            },
          },
        },

        status: {
          type:
            DataTypes.ENUM(
              ...MEETING_STATUSES
            ),

          allowNull:
            false,

          defaultValue:
            'scheduled',

          validate: {
            notNull: {
              msg:
                'Toplantı durumu zorunludur',
            },

            isIn: {
              args: [
                MEETING_STATUSES,
              ],

              msg:
                'Geçerli bir toplantı durumu seçilmelidir',
            },
          },
        },

        attendees: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,

          defaultValue:
            [],

          validate: {
            notNull: {
              msg:
                'Katılımcı bilgisi geçersizdir',
            },

            isArray(
              value
            ) {
              if (
                !Array.isArray(
                  value
                )
              ) {
                throw new Error(
                  'Katılımcılar liste formatında olmalıdır'
                );
              }
            },
          },
        },

        meeting_link: {
          type:
            DataTypes.STRING(
              1000
            ),

          allowNull:
            true,

          validate: {
            len: {
              args: [
                0,
                1000,
              ],

              msg:
                'Toplantı bağlantısı en fazla 1000 karakter olabilir',
            },

            isUrlOrEmpty(
              value
            ) {
              if (!value) {
                return;
              }

              try {
                const url =
                  new URL(
                    value
                  );

                if (
                  url.protocol !==
                    'http:' &&
                  url.protocol !==
                    'https:'
                ) {
                  throw new Error();
                }
              } catch {
                throw new Error(
                  'Geçerli bir toplantı bağlantısı girilmelidir (http:// veya https://)'
                );
              }
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'meeting_link',
              normalizeNullableText(
                value
              )
            );
          },
        },

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
              normalizeNullableText(
                value
              )
            );
          },
        },

        // ==================================================
        // RELATIONS
        // ==================================================

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

          validate: {
            notNull: {
              msg:
                'Toplantıyı oluşturan kullanıcı bilgisi eksik',
            },
          },
        },

        assigned_to: {
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
      },
      {
        sequelize,

        tableName:
          'meetings',

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
              'assigned_to',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'meeting_type',
            ],
          },

          {
            fields: [
              'start_date',
            ],
          },

          {
            fields: [
              'client_id',
              'start_date',
            ],
          },

          {
            fields: [
              'assigned_to',
              'status',
              'start_date',
            ],
          },

          {
            fields: [
              'case_id',
              'start_date',
            ],
          },

          {
            fields: [
              'consultation_id',
              'start_date',
            ],
          },
        ],
      }
    );

    return Meeting;
  }
}

export {
  Meeting,
};
