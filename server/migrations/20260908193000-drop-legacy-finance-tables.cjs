'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();

    const scalar = async (sql) => {
      const [rows] = await sequelize.query(sql, { transaction });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return Number(row?.value ?? 0);
    };

    const exists = async (table) => {
      const [rows] = await sequelize.query(
        `SELECT to_regclass('public.${table}') IS NOT NULL AS present`,
        { transaction }
      );
      return rows?.[0]?.present === true;
    };

    try {
      const hasPayments = await exists('payments');
      const hasPlans = await exists('payment_plans');
      const hasInstallments = await exists('payment_installments');

      // Destructive cutover guard: every legacy row must have a V2 traceability row.
      // We intentionally include soft-deleted legacy rows so historical records are not lost silently.
      if (hasPayments) {
        const unmappedPayments = await scalar(`
          SELECT COUNT(*)::int AS value
          FROM payments p
          LEFT JOIN finance_transactions t ON t.legacy_payment_id = p.id
          WHERE t.id IS NULL
        `);
        if (unmappedPayments > 0) {
          throw new Error(`Legacy finance cleanup blocked: ${unmappedPayments} payment row(s) are not mapped to Finance V2.`);
        }

        const ambiguousAdjustments = await scalar(`
          SELECT COUNT(*)::int AS value
          FROM payments p
          WHERE p.payment_type = 'adjustment'
        `);
        if (ambiguousAdjustments > 0) {
          throw new Error(`Legacy finance cleanup blocked: ${ambiguousAdjustments} adjustment payment row(s) require manual review.`);
        }
      }

      if (hasPlans) {
        const unmappedPlans = await scalar(`
          SELECT COUNT(*)::int AS value
          FROM payment_plans p
          LEFT JOIN finance_payment_plans v ON v.legacy_payment_plan_id = p.id
          WHERE v.id IS NULL
        `);
        if (unmappedPlans > 0) {
          throw new Error(`Legacy finance cleanup blocked: ${unmappedPlans} payment plan row(s) are not mapped to Finance V2.`);
        }
      }

      if (hasInstallments) {
        const unmappedInstallments = await scalar(`
          SELECT COUNT(*)::int AS value
          FROM payment_installments p
          LEFT JOIN finance_installments v ON v.legacy_installment_id = p.id
          WHERE v.id IS NULL
        `);
        if (unmappedInstallments > 0) {
          throw new Error(`Legacy finance cleanup blocked: ${unmappedInstallments} installment row(s) are not mapped to Finance V2.`);
        }
      }

      // Drop without CASCADE. Any unexpected external FK dependency must stop the migration.
      if (hasPayments) await queryInterface.dropTable('payments', { transaction });
      if (hasInstallments) await queryInterface.dropTable('payment_installments', { transaction });
      if (hasPlans) await queryInterface.dropTable('payment_plans', { transaction });

      // Sequelize-created enum types are not removed automatically when tables are dropped.
      // Drop only legacy finance enum types, and only after the tables are gone.
      await sequelize.query(`
        DROP TYPE IF EXISTS "enum_payments_payment_type";
        DROP TYPE IF EXISTS "enum_payment_installments_status";
        DROP TYPE IF EXISTS "enum_payment_plans_status";
        DROP TYPE IF EXISTS "enum_payment_plans_plan_type";
      `, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    throw new Error(
      '20260908193000-drop-legacy-finance-tables is intentionally irreversible. Restore legacy finance data from a database backup/Neon restore point if rollback is required.'
    );
  },
};
