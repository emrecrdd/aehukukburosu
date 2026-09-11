'use strict';

/**
 * Toplantılarda çoklu Derkenar kullanıcı katılımı.
 *
 * Not:
 * - meetings.assigned_to geçiş sürecinde korunur.
 * - meetings.attendees JSONB alanına dokunulmaz.
 * - Eski assigned_to kayıtları meeting_attendees tablosuna backfill edilir.
 */

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        const tables =
          await queryInterface.showAllTables({ transaction });

        const tableNames = tables.map((table) =>
          typeof table === 'string'
            ? table
            : table?.tableName || table?.name
        );

        if (!tableNames.includes('meeting_attendees')) {
          await queryInterface.createTable(
            'meeting_attendees',
            {
              meeting_id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                references: { model: 'meetings', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
              },
              user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
              },
              created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
              },
              updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
              },
            },
            { transaction }
          );

          await queryInterface.addIndex(
            'meeting_attendees',
            ['meeting_id'],
            { name: 'idx_meeting_attendees_meeting_id', transaction }
          );

          await queryInterface.addIndex(
            'meeting_attendees',
            ['user_id'],
            { name: 'idx_meeting_attendees_user_id', transaction }
          );
        }

        await queryInterface.sequelize.query(
          `
            INSERT INTO meeting_attendees (
              meeting_id,
              user_id,
              created_at,
              updated_at
            )
            SELECT
              id,
              assigned_to,
              COALESCE(created_at, CURRENT_TIMESTAMP),
              CURRENT_TIMESTAMP
            FROM meetings
            WHERE assigned_to IS NOT NULL
            ON CONFLICT (meeting_id, user_id)
            DO NOTHING
          `,
          { transaction }
        );
      }
    );
  },

  async down(
    queryInterface
  ) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        const tables =
          await queryInterface.showAllTables({ transaction });

        const tableNames = tables.map((table) =>
          typeof table === 'string'
            ? table
            : table?.tableName || table?.name
        );

        if (tableNames.includes('meeting_attendees')) {
          await queryInterface.dropTable(
            'meeting_attendees',
            { transaction }
          );
        }
      }
    );
  },
};
