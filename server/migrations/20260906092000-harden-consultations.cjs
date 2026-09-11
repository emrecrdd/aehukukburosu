'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        // Legacy değer varsa normalize et.
        await queryInterface.sequelize.query(
          `
            UPDATE consultations
            SET consultation_mode = 'on_site'
            WHERE consultation_mode = 'onsite'
          `,
          { transaction }
        );

        // ==================================================
        // STATUS
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_status_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_status_chk
            CHECK (
              status IN (
                'new',
                'evaluating',
                'meeting_scheduled',
                'in_progress',
                'waiting_client',
                'completed',
                'converted_to_case',
                'rejected',
                'cancelled'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // CONSULTATION TYPE
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_type_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_type_chk
            CHECK (
              consultation_type IN (
                'oral',
                'written_opinion',
                'contract_review',
                'contract_drafting',
                'notice_petition',
                'corporate',
                'continuous',
                'other'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // CONSULTATION MODE
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_mode_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_mode_chk
            CHECK (
              consultation_mode IS NULL
              OR consultation_mode IN (
                'office',
                'phone',
                'online',
                'on_site',
                'written'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // SERVICE MODEL
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_service_model_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_service_model_chk
            CHECK (
              service_model IN (
                'one_time',
                'ongoing'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // PRIORITY
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_priority_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_priority_chk
            CHECK (
              priority IN (
                'low',
                'normal',
                'high',
                'critical'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // BILLING TYPE
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_billing_type_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_billing_type_chk
            CHECK (
              billing_type IN (
                'free',
                'fixed',
                'hourly',
                'retainer'
              )
            )
          `,
          { transaction }
        );

        /*
         * agreed_fee için strict DB CHECK şimdilik eklenmiyor.
         * Eski verileri uydurma ücretlerle değiştirmiyoruz.
         * Bu kural model/service katmanında enforce edilecek.
         */

        // ==================================================
        // CURRENCY
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_currency_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_currency_chk
            CHECK (
              currency IN (
                'TRY',
                'USD',
                'EUR',
                'GBP'
              )
            )
          `,
          { transaction }
        );

        // ==================================================
        // SOURCE
        // ==================================================

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            DROP CONSTRAINT IF EXISTS consultations_source_chk
          `,
          { transaction }
        );

        await queryInterface.sequelize.query(
          `
            ALTER TABLE consultations
            ADD CONSTRAINT consultations_source_chk
            CHECK (
              source IS NULL
              OR source IN (
                'referral',
                'web',
                'existing_client',
                'phone',
                'other'
              )
            )
          `,
          { transaction }
        );
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        const constraints = [
          'consultations_source_chk',
          'consultations_currency_chk',
          'consultations_billing_type_chk',
          'consultations_priority_chk',
          'consultations_service_model_chk',
          'consultations_mode_chk',
          'consultations_type_chk',
          'consultations_status_chk',
        ];

        for (const constraint of constraints) {
          await queryInterface.sequelize.query(
            `
              ALTER TABLE consultations
              DROP CONSTRAINT IF EXISTS ${constraint}
            `,
            { transaction }
          );
        }
      }
    );
  },
};
