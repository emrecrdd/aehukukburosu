import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Message extends Sequelize.Model {
  static initModel(sequelize) {
    Message.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        conversation_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        sender_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('text', 'file'),
          allowNull: false,
          defaultValue: 'text',
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            len: [0, 10000],
          },
        },
        edited_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'messages',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        hooks: {
          beforeValidate: (message) => {
            if (typeof message.content === 'string') {
              message.content = message.content.trim();
            }
          },
        },
      }
    );

    return Message;
  }
}

export { Message };
