'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    const table =
      await queryInterface.describeTable(
        'users'
      );

    if (
      !table.last_seen_at
    ) {
      await queryInterface.addColumn(
        'users',
        'last_seen_at',
        {
          type:
            Sequelize.DATE,

          allowNull:
            true,
        }
      );
    }
  },

  async down(
    queryInterface
  ) {
    const table =
      await queryInterface.describeTable(
        'users'
      );

    if (
      table.last_seen_at
    ) {
      await queryInterface.removeColumn(
        'users',
        'last_seen_at'
      );
    }
  },
};
