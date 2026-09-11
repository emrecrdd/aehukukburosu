'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('conversations', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        type: {
          type: Sequelize.ENUM('office', 'direct'),
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(160),
          allowNull: true,
        },
        direct_key: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.createTable('conversation_members', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        conversation_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'conversations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        last_read_message_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        joined_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.createTable('messages', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        conversation_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'conversations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sender_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        type: {
          type: Sequelize.ENUM('text', 'file'),
          allowNull: false,
          defaultValue: 'text',
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        edited_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.createTable('message_attachments', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        message_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'messages', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        storage_key: {
          type: Sequelize.STRING(1024),
          allowNull: false,
        },
        original_name: {
          type: Sequelize.STRING(512),
          allowNull: false,
        },
        mime_type: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        file_size: {
          type: Sequelize.BIGINT,
          allowNull: false,
        },
        extension: {
          type: Sequelize.STRING(24),
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.addIndex(
        'conversation_members',
        ['conversation_id', 'user_id'],
        {
          name: 'uq_conversation_members_active_conversation_user',
          unique: true,
          where: { deleted_at: null },
          transaction,
        }
      );

      await queryInterface.addConstraint('conversation_members', {
        fields: ['last_read_message_id'],
        type: 'foreign key',
        name: 'fk_conversation_members_last_read_message',
        references: { table: 'messages', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction,
      });

      await queryInterface.addIndex('conversations', ['direct_key'], {
        name: 'uq_conversations_active_direct_key',
        unique: true,
        where: { type: 'direct', deleted_at: null },
        transaction,
      });

      await queryInterface.addIndex('conversations', ['type'], {
        name: 'uq_conversations_single_active_office',
        unique: true,
        where: { type: 'office', deleted_at: null },
        transaction,
      });

      await queryInterface.addIndex('conversation_members', ['user_id'], {
        name: 'idx_conversation_members_user',
        transaction,
      });

      await queryInterface.addIndex('conversation_members', ['conversation_id'], {
        name: 'idx_conversation_members_conversation',
        transaction,
      });

      await queryInterface.addIndex('messages', ['conversation_id', 'created_at', 'id'], {
        name: 'idx_messages_conversation_created',
        transaction,
      });

      await queryInterface.addIndex('messages', ['sender_id'], {
        name: 'idx_messages_sender',
        transaction,
      });

      await queryInterface.addIndex('message_attachments', ['message_id'], {
        name: 'idx_message_attachments_message',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('message_attachments', { transaction });
      await queryInterface.dropTable('conversation_members', { transaction });
      await queryInterface.dropTable('messages', { transaction });
      await queryInterface.dropTable('conversations', { transaction });

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_messages_type";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_conversations_type";',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
