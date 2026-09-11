import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Conversation extends Sequelize.Model {
  static initModel(sequelize) {
    Conversation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        type: {
          type: DataTypes.ENUM('office', 'direct'),
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(160),
          allowNull: true,
        },
        direct_key: {
          type: DataTypes.STRING(80),
          allowNull: true,
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'conversations',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        validate: {
          validConversationShape() {
            if (this.type === 'office') {
              if (!this.name) {
                throw new Error('Ofis sohbeti için ad gereklidir.');
              }
              if (this.direct_key) {
                throw new Error('Ofis sohbetinde direct_key kullanılamaz.');
              }
            }

            if (this.type === 'direct' && !this.direct_key) {
              throw new Error('Birebir sohbet için direct_key gereklidir.');
            }
          },
        },
      }
    );

    return Conversation;
  }
}

export { Conversation };
