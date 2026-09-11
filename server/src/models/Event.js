import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Event extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Event.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        title: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          validate: {
            notEmpty: {
              msg:
                'Duruşma / etkinlik başlığı gereklidir',
            },

            len: {
              args: [
                2,
                255,
              ],

              msg:
                'Başlık 2-255 karakter arasında olmalıdır',
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'title',
              String(
                value ||
                  ''
              ).trim()
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
            const normalized =
              value
                ? String(
                    value
                  ).trim()
                : null;

            this.setDataValue(
              'description',
              normalized ||
                null
            );
          },
        },

        event_type: {
          type:
            DataTypes.ENUM(
              'hearing',
              'meeting',
              'deadline',
              'reminder',
              'other'
            ),

          allowNull:
            false,

          defaultValue:
            'other',
        },

        hearing_type: {
          type:
            DataTypes.ENUM(
              'preliminary',
              'investigation',
              'expert_examination',
              'witness_hearing',
              'final_decision',
              'other'
            ),

          allowNull:
            true,

          defaultValue:
            null,
        },

        status: {
          type:
            DataTypes.ENUM(
              'scheduled',
              'ongoing',
              'completed',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'scheduled',
        },

        last_hearing_result: {
          type:
            DataTypes.TEXT,

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
              'last_hearing_result',
              normalized ||
                null
            );
          },
        },

        opposing_counsel: {
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
              'opposing_counsel',
              normalized ||
                null
            );
          },
        },

        expense_status: {
          type:
            DataTypes.ENUM(
              'paid',
              'pending',
              'not_applicable'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        start_date: {
          type:
            DataTypes.DATE,

          allowNull:
            false,

          validate: {
            isDate: {
              msg:
                'Başlangıç tarihi geçersiz',
            },
          },
        },

        end_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,

          validate: {
            isDate: {
              msg:
                'Bitiş tarihi geçersiz',
            },
          },
        },

        is_all_day: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
        },

        location: {
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
              'location',
              normalized ||
                null
            );
          },
        },

        court_room: {
          type:
            DataTypes.STRING(
              100
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
              'court_room',
              normalized ||
                null
            );
          },
        },

        judge_name: {
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
              'judge_name',
              normalized ||
                null
            );
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

        reminder_minutes: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            30,

          validate: {
            min: {
              args: [
                0,
              ],

              msg:
                'Hatırlatma süresi negatif olamaz',
            },

            max: {
              args: [
                525600,
              ],

              msg:
                'Hatırlatma süresi geçersiz',
            },
          },
        },

        reminder_sent: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            false,
        },

        attendees: {
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
                  'Katılımcılar liste formatında olmalıdır'
                );
              }
            },
          },
        },

        todo_items: {
          type:
            DataTypes.ARRAY(
              DataTypes.JSONB
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
          'events',

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
              'event_type',
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
              'case_id',
              'start_date',
            ],
          },

          {
            fields: [
              'assigned_to',
              'start_date',
            ],
          },

          {
            fields: [
              'status',
              'start_date',
            ],
          },
        ],

        hooks: {
          beforeValidate(
            event
          ) {
            if (
              event.event_type ===
                'hearing' &&
              !event.hearing_type
            ) {
              event.hearing_type =
                'other';
            }
          },
        },

        validate: {
          endDateAfterStartDate() {
            if (
              !this.end_date ||
              !this.start_date
            ) {
              return;
            }

            const start =
              new Date(
                this.start_date
              );

            const end =
              new Date(
                this.end_date
              );

            if (
              end <
              start
            ) {
              throw new Error(
                'Bitiş tarihi başlangıç tarihinden önce olamaz'
              );
            }
          },
        },
      }
    );

    return Event;
  }
}

export {
  Event,
};