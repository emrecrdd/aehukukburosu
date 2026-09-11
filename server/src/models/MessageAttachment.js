import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class MessageAttachment extends Sequelize.Model {
  static initModel(sequelize) {
    MessageAttachment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        message_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        storage_key: {
          type: DataTypes.STRING(1024),
          allowNull: false,
        },
        original_name: {
          type: DataTypes.STRING(512),
          allowNull: false,
        },
        mime_type: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        file_size: {
          type: DataTypes.BIGINT,
          allowNull: false,
          validate: { min: 1 },
        },
        extension: {
          type: DataTypes.STRING(24),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'message_attachments',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
      }
    );

    return MessageAttachment;
  }
}

export { MessageAttachment };
