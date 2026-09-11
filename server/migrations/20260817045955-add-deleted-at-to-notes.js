export async function up(queryInterface, Sequelize) {
  const table =
    await queryInterface.describeTable('notes');

  if (!table.deleted_at) {
    await queryInterface.addColumn(
      'notes',
      'deleted_at',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );
  }
}

export async function down(queryInterface) {
  const table =
    await queryInterface.describeTable('notes');

  if (table.deleted_at) {
    await queryInterface.removeColumn(
      'notes',
      'deleted_at'
    );
  }
}