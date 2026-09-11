'use strict';

/**
 * Finance V2 production hardening.
 * Adds DB-level invariants that do not rely on the service layer.
 */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`
      ALTER TABLE finance_accounts
        ADD CONSTRAINT ck_finance_accounts_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_fee_agreements
        ADD CONSTRAINT ck_finance_fee_agreements_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_receivables
        ADD CONSTRAINT ck_finance_receivables_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_transactions
        ADD CONSTRAINT ck_finance_transactions_currency CHECK (currency IN ('TRY','USD','EUR','GBP')),
        ADD CONSTRAINT ck_finance_transactions_base_currency CHECK (base_currency IN ('TRY','USD','EUR','GBP')),
        ADD CONSTRAINT ck_finance_transactions_direction_type CHECK (
          (transaction_type IN ('receipt','transfer_in') AND direction='in') OR
          (transaction_type IN ('refund','expense','transfer_out') AND direction='out') OR
          (transaction_type IN ('adjustment','reversal'))
        );
      ALTER TABLE finance_allocations
        ADD CONSTRAINT ck_finance_allocations_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_expenses
        ADD CONSTRAINT ck_finance_expenses_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_payment_plans
        ADD CONSTRAINT ck_finance_payment_plans_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_installments
        ADD CONSTRAINT ck_finance_installments_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_receivable_adjustments
        ADD CONSTRAINT ck_finance_receivable_adjustments_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
      ALTER TABLE finance_refund_allocations
        ADD CONSTRAINT ck_finance_refund_allocations_currency CHECK (currency IN ('TRY','USD','EUR','GBP'));
    `);

    await q.query(`CREATE UNIQUE INDEX uq_finance_allocations_transaction_receivable_active ON finance_allocations(transaction_id,receivable_id) WHERE deleted_at IS NULL;`);
    await q.query(`CREATE UNIQUE INDEX uq_finance_refund_allocations_refund_receivable_active ON finance_refund_allocations(refund_transaction_id,receivable_id) WHERE deleted_at IS NULL;`);
    await q.query(`CREATE INDEX idx_finance_audit_actor_created ON finance_audit_events(actor_id,created_at DESC);`);
    await q.query(`CREATE INDEX idx_finance_receivables_open_due ON finance_receivables(due_date,currency) WHERE deleted_at IS NULL AND status IN ('open','partially_paid');`);
    await q.query(`CREATE INDEX idx_finance_transactions_posted_date ON finance_transactions(transaction_date,currency) WHERE deleted_at IS NULL AND status='posted';`);
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`DROP INDEX IF EXISTS idx_finance_transactions_posted_date; DROP INDEX IF EXISTS idx_finance_receivables_open_due; DROP INDEX IF EXISTS idx_finance_audit_actor_created; DROP INDEX IF EXISTS uq_finance_refund_allocations_refund_receivable_active; DROP INDEX IF EXISTS uq_finance_allocations_transaction_receivable_active;`);
    for (const [table, names] of Object.entries({
      finance_accounts:['ck_finance_accounts_currency'],
      finance_fee_agreements:['ck_finance_fee_agreements_currency'],
      finance_receivables:['ck_finance_receivables_currency'],
      finance_transactions:['ck_finance_transactions_currency','ck_finance_transactions_base_currency','ck_finance_transactions_direction_type'],
      finance_allocations:['ck_finance_allocations_currency'],
      finance_expenses:['ck_finance_expenses_currency'],
      finance_payment_plans:['ck_finance_payment_plans_currency'],
      finance_installments:['ck_finance_installments_currency'],
      finance_receivable_adjustments:['ck_finance_receivable_adjustments_currency'],
      finance_refund_allocations:['ck_finance_refund_allocations_currency'],
    })) for (const name of names) await queryInterface.removeConstraint(table,name);
  }
};
