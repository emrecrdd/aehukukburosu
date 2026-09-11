import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class ConversationMember extends Sequelize.Model {
  static initModel(sequelize) {
    ConversationMember.init(
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
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        last_read_message_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        joined_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        hidden_at: {
  type: DataTypes.DATE,
  allowNull: true,
  defaultValue: null,
},
      },
      {
        sequelize,
        tableName: 'conversation_members',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
      }
    );

    return ConversationMember;
  }
}

export { ConversationMember };
