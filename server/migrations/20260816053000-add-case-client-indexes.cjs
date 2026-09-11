'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      // ==================================================
      // DUPLICATE CLEANUP
      //
      // Aynı dava-müvekkil ilişkisi birden fazla kez
      // oluşmuşsa yalnızca bir kayıt bırakılır.
      // ==================================================

      await queryInterface.sequelize.query(
        `
          DELETE FROM case_clients a
          USING case_clients b
          WHERE
            a.ctid < b.ctid
            AND a.case_id = b.case_id
            AND a.client_id = b.client_id;
        `,
        {
          transaction,
        }
      );

      // ==================================================
      // CLIENT LOOKUP INDEX
      // ==================================================

      await queryInterface.addIndex(
        'case_clients',
        ['client_id'],
        {
          name:
            'idx_case_clients_client_id',

          transaction,
        }
      );

      // ==================================================
      // CASE LOOKUP INDEX
      // ==================================================

      await queryInterface.addIndex(
        'case_clients',
        ['case_id'],
        {
          name:
            'idx_case_clients_case_id',

          transaction,
        }
      );

      // ==================================================
      // RELATION UNIQUENESS
      // ==================================================

      await queryInterface.addIndex(
        'case_clients',
        [
          'case_id',
          'client_id',
        ],
        {
          name:
            'uq_case_clients_case_client',

          unique:
            true,

          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction =
      await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex(
        'case_clients',
        'uq_case_clients_case_client',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'case_clients',
        'idx_case_clients_case_id',
        {
          transaction,
        }
      );

      await queryInterface.removeIndex(
        'case_clients',
        'idx_case_clients_client_id',
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};