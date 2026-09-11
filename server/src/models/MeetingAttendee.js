import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class MeetingAttendee extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    MeetingAttendee.init(
      {
        meeting_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          references: {
            model:
              'meetings',

            key:
              'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'CASCADE',
        },

        user_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          references: {
            model:
              'users',

            key:
              'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'CASCADE',
        },
      },
      {
        sequelize,

        tableName:
          'meeting_attendees',

        timestamps:
          true,

        paranoid:
          false,

        indexes: [
          {
            fields: [
              'meeting_id',
            ],

            name:
              'idx_meeting_attendees_meeting_id',
          },

          {
            fields: [
              'user_id',
            ],

            name:
              'idx_meeting_attendees_user_id',
          },
        ],
      }
    );

    return MeetingAttendee;
  }
}

export {
  MeetingAttendee,
};
