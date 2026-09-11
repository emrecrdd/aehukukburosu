'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_documents_file_type"
      ADD VALUE IF NOT EXISTS 'udf';
    `);
  },

  async down(queryInterface, Sequelize) {
    /*
     * PostgreSQL mevcut bir ENUM değerini
     * DROP VALUE ile doğrudan kaldırmayı desteklemez.
     *
     * Bu yüzden güvenli rollback için burada
     * herhangi bir işlem yapmıyoruz.
     */
  },
};