'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_payments_payment_type"
      ADD VALUE IF NOT EXISTS 'adjustment';
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