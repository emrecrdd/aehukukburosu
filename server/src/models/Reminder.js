import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Reminder extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Reminder.init(
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
        // USERS
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
        // SOURCE
        // ==================================================

        task_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'tasks',

            key:
              'id',
          },
        },

        event_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'events',

            key:
              'id',
          },
        },

        meeting_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'meetings',

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
            true,

          set(
            value
          ) {
            this.setDataValue(
              'message',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        // ==================================================
        // SCHEDULE
        // ==================================================

        remind_at: {
          type:
            DataTypes.DATE,

          allowNull:
            false,
        },

        channel: {
          type:
            DataTypes.ENUM(
              'in_app',
              'email',
              'both'
            ),

          allowNull:
            false,

          defaultValue:
            'both',
        },

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'processing',
              'sent',
              'failed',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        sent_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // WORKER LOCK
        // ==================================================

        locked_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        locked_by: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,
        },

        // ==================================================
        // RETRY
        // ==================================================

        attempt_count: {
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

        max_attempts: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            3,

          validate: {
            min:
              1,

            max:
              10,
          },
        },

        next_attempt_at: {
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

        // ==================================================
        // DEDUPLICATION
        // ==================================================

        deduplication_key: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          /*
           * unique:true KULLANMIYORUZ.
           *
           * Reminder paranoid:true olduğu için aktif
           * kayıt benzersizliği PostgreSQL partial
           * unique index ile sağlanacak:
           *
           * WHERE deleted_at IS NULL
           */

          set(
            value
          ) {
            this.setDataValue(
              'deduplication_key',

              typeof value ===
                'string'
                ? value.trim()
                : value
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
          'reminders',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            name:
              'reminders_due_status_idx',

            fields: [
              'status',
              'remind_at',
              'next_attempt_at',
            ],
          },

          {
            name:
              'reminders_user_idx',

            fields: [
              'user_id',
            ],
          },

          {
            name:
              'reminders_task_idx',

            fields: [
              'task_id',
            ],
          },

          {
            name:
              'reminders_event_idx',

            fields: [
              'event_id',
            ],
          },

          {
            name:
              'reminders_meeting_idx',

            fields: [
              'meeting_id',
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
              'remind_at',
            ],
          },
        ],

        validate: {
          exactlyOneSource() {
            const sourceValues = [
              this.task_id,
              this.event_id,
              this.meeting_id,
            ];

            /*
             * Bulk / partial update sırasında Sequelize
             * kaynak alanlarını instance'a taşımamış
             * olabilir.
             */
            const isPartialUpdate =
              sourceValues.every(
                (
                  value
                ) =>
                  value ===
                  undefined
              );

            if (
              isPartialUpdate
            ) {
              return;
            }

            const sourceCount =
              sourceValues.filter(
                (
                  value
                ) =>
                  value !==
                    null &&
                  value !==
                    undefined
              ).length;

            if (
              sourceCount !==
              1
            ) {
              throw new Error(
                'Hatırlatma tam olarak bir görev, etkinlik veya toplantıya bağlanmalıdır.'
              );
            }
          },

          attemptsAreConsistent() {
            if (
              Number(
                this.attempt_count
              ) >
              Number(
                this.max_attempts
              )
            ) {
              throw new Error(
                'Deneme sayısı maksimum deneme sayısını aşamaz.'
              );
            }
          },
        },
      }
    );

    return Reminder;
  }
}

export {
  Reminder,
};