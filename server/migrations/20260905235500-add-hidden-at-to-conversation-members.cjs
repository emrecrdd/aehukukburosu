'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    const table =
      await queryInterface.describeTable(
        'conversation_members'
      );

    if (!table.hidden_at) {
      await queryInterface.addColumn(
        'conversation_members',
        'hidden_at',
        {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        }
      );
    }
  },

  async down(
    queryInterface
  ) {
    const table =
      await queryInterface.describeTable(
        'conversation_members'
      );

    if (table.hidden_at) {
      await queryInterface.removeColumn(
        'conversation_members',
        'hidden_at'
      );
    }
  },
};