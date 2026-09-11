'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        /*
         * Danışmanlık numaraları DNS-YYYY-NNNNNN formatında yıllık sayaçla
         * üretilir. Repository bu tabloyu INSERT ... ON CONFLICT ile atomik
         * olarak artırır; bu nedenle year PRIMARY KEY olmalıdır.
         */
        await queryInterface.sequelize.query(
          `
            CREATE TABLE IF NOT EXISTS consultation_counters (
              year INTEGER PRIMARY KEY,
              last_value INTEGER NOT NULL DEFAULT 0,
              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT consultation_counters_last_value_chk
                CHECK (last_value >= 0)
            )
          `,
          {
            transaction,
          }
        );

        /*
         * Sayaç tablosu oluşturulmadan önce danışmanlık kaydı oluşmuşsa,
         * mevcut DNS numaralarındaki en büyük değerden devam et. Böylece
         * migration sonrası DNS numarası tekrarına düşmeyiz.
         */
        await queryInterface.sequelize.query(
          `
            INSERT INTO consultation_counters (
              year,
              last_value,
              created_at,
              updated_at
            )
            SELECT
              split_part(consultation_number, '-', 2)::INTEGER AS year,
              MAX(split_part(consultation_number, '-', 3)::INTEGER) AS last_value,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            FROM consultations
            WHERE consultation_number ~ '^DNS-[0-9]{4}-[0-9]{6}$'
            GROUP BY split_part(consultation_number, '-', 2)::INTEGER
            ON CONFLICT (year)
            DO UPDATE
            SET
              last_value = GREATEST(
                consultation_counters.last_value,
                EXCLUDED.last_value
              ),
              updated_at = CURRENT_TIMESTAMP
          `,
          {
            transaction,
          }
        );
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.sequelize.query(
          `DROP TABLE IF EXISTS consultation_counters`,
          {
            transaction,
          }
        );
      }
    );
  },
};
