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
      !table.permissions
    ) {
      await queryInterface.addColumn(
        'users',
        'permissions',
        {
          type:
            Sequelize.JSONB,

          allowNull:
            false,

          defaultValue:
            {},
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
      table.permissions
    ) {
      await queryInterface.removeColumn(
        'users',
        'permissions'
      );
    }
  },
};