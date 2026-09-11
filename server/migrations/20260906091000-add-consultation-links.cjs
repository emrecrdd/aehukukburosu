'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const relation = {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consultations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      };

      await queryInterface.addColumn(
        'tasks',
        'consultation_id',
        relation,
        { transaction }
      );

      await queryInterface.addIndex(
        'tasks',
        ['consultation_id'],
        {
          name: 'tasks_consultation_id_idx',
          transaction,
        }
      );

      await queryInterface.addColumn(
        'meetings',
        'consultation_id',
        relation,
        { transaction }
      );

      await queryInterface.addIndex(
        'meetings',
        ['consultation_id'],
        {
          name: 'meetings_consultation_id_idx',
          transaction,
        }
      );

      await queryInterface.addColumn(
        'documents',
        'consultation_id',
        relation,
        { transaction }
      );

      await queryInterface.addIndex(
        'documents',
        ['consultation_id'],
        {
          name: 'documents_consultation_id_idx',
          transaction,
        }
      );

      await queryInterface.addColumn(
        'notes',
        'consultation_id',
        relation,
        { transaction }
      );

      await queryInterface.addIndex(
        'notes',
        ['consultation_id'],
        {
          name: 'notes_consultation_id_idx',
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'notes',
        'notes_consultation_id_idx',
        { transaction }
      );
      await queryInterface.removeColumn(
        'notes',
        'consultation_id',
        { transaction }
      );

      await queryInterface.removeIndex(
        'documents',
        'documents_consultation_id_idx',
        { transaction }
      );
      await queryInterface.removeColumn(
        'documents',
        'consultation_id',
        { transaction }
      );

      await queryInterface.removeIndex(
        'meetings',
        'meetings_consultation_id_idx',
        { transaction }
      );
      await queryInterface.removeColumn(
        'meetings',
        'consultation_id',
        { transaction }
      );

      await queryInterface.removeIndex(
        'tasks',
        'tasks_consultation_id_idx',
        { transaction }
      );
      await queryInterface.removeColumn(
        'tasks',
        'consultation_id',
        { transaction }
      );
    });
  },
};
