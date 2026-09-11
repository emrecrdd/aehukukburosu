'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_cases_status"
      ADD VALUE IF NOT EXISTS 'suspended';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "cases"
      SET "status" = 'preparation'
      WHERE "status"::text = 'suspended';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "cases"
      ALTER COLUMN "status" DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_cases_status_old" AS ENUM (
        'preparation',
        'active',
        'hearing',
        'appeal',
        'cassation',
        'concluded',
        'archived'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "cases"
      ALTER COLUMN "status"
      TYPE "enum_cases_status_old"
      USING "status"::text::"enum_cases_status_old";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_cases_status";
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_cases_status_old"
      RENAME TO "enum_cases_status";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "cases"
      ALTER COLUMN "status"
      SET DEFAULT 'preparation';
    `);
  },
};