'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reminders', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal(
          'gen_random_uuid()'
        ),
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      task_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tasks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      event_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'events',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      meeting_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'meetings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      remind_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      channel: {
        type: Sequelize.ENUM(
          'in_app',
          'email',
          'both'
        ),
        allowNull: false,
        defaultValue: 'both',
      },

      status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'sent',
          'failed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },

      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      locked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      locked_by: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      max_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },

      next_attempt_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      deduplication_key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP'
        ),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP'
        ),
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addConstraint(
      'reminders',
      {
        fields: [
          'task_id',
          'event_id',
          'meeting_id',
        ],
        type: 'check',
        name: 'reminders_exactly_one_source_check',
        where: Sequelize.literal(`
          (
            CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN event_id IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN meeting_id IS NOT NULL THEN 1 ELSE 0 END
          ) = 1
        `),
      }
    );

    await queryInterface.addIndex(
      'reminders',
      [
        'status',
        'remind_at',
        'next_attempt_at',
      ],
      {
        name: 'reminders_due_status_idx',
      }
    );

    await queryInterface.addIndex(
      'reminders',
      ['user_id'],
      {
        name: 'reminders_user_idx',
      }
    );

    await queryInterface.addIndex(
      'reminders',
      ['task_id'],
      {
        name: 'reminders_task_idx',
      }
    );

    await queryInterface.addIndex(
      'reminders',
      ['event_id'],
      {
        name: 'reminders_event_idx',
      }
    );

    await queryInterface.addIndex(
      'reminders',
      ['meeting_id'],
      {
        name: 'reminders_meeting_idx',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reminders');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_reminders_channel";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_reminders_status";'
    );
  },
};