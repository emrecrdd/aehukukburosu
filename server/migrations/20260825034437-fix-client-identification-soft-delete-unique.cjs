'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(
    queryInterface
  ) {
    const transaction =
      await queryInterface
        .sequelize
        .transaction();

    try {
      const constraints = [
        'clients_identification_number_key',
        'clients_identification_number_key1',
        'clients_identification_number_key2',
        'clients_identification_number_key3',
        'clients_identification_number_key4',
        'clients_identification_number_key5',
        'clients_identification_number_key6',
        'clients_identification_number_key7',
        'clients_identification_number_key8',
      ];

      for (
        const constraint of
        constraints
      ) {
        await queryInterface
          .sequelize
          .query(
            `
              ALTER TABLE "clients"
              DROP CONSTRAINT IF EXISTS "${constraint}";
            `,
            {
              transaction,
            }
          );
      }

      await queryInterface
        .sequelize
        .query(
          `
            CREATE UNIQUE INDEX
              "uq_clients_identification_number_active"
            ON "clients" (
              "identification_number"
            )
            WHERE
              "deleted_at" IS NULL
              AND "identification_number" IS NOT NULL;
          `,
          {
            transaction,
          }
        );

      await transaction.commit();
    } catch (
      error
    ) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(
    queryInterface
  ) {
    const transaction =
      await queryInterface
        .sequelize
        .transaction();

    try {
      await queryInterface
        .sequelize
        .query(
          `
            DROP INDEX IF EXISTS
              "uq_clients_identification_number_active";
          `,
          {
            transaction,
          }
        );

      await queryInterface
        .sequelize
        .query(
          `
            ALTER TABLE "clients"
            ADD CONSTRAINT
              "clients_identification_number_key"
            UNIQUE (
              "identification_number"
            );
          `,
          {
            transaction,
          }
        );

      await transaction.commit();
    } catch (
      error
    ) {
      await transaction.rollback();
      throw error;
    }
  },
};