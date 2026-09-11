'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ai_analyses_analysis_type"
      ADD VALUE IF NOT EXISTS 'case_question';
    `);
  },

  async down() {
    /*
     * PostgreSQL ENUM içinden tek bir değeri güvenli şekilde
     * DROP etmek doğrudan desteklenmez.
     *
     * Bu nedenle down bilinçli olarak boş bırakılmıştır.
     */
  },
};