'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_case_parties_party_type"
      ADD VALUE IF NOT EXISTS 'magdur';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_case_parties_party_type"
      ADD VALUE IF NOT EXISTS 'maktul';
    `);
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL ENUM değerlerini doğrudan DROP VALUE ile
    // güvenli şekilde silemediğimiz için rollback burada
    // bilinçli olarak boş bırakıldı.
  },
};