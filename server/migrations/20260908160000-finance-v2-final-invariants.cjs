'use strict';

/**
 * Finance V2 final integrity invariants.
 * Keeps transfer/refund/reversal relationships structurally valid even if a
 * future service-layer regression attempts to write malformed rows.
 */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`
      ALTER TABLE finance_transactions
        ADD CONSTRAINT ck_finance_transactions_refund_relation CHECK (
          transaction_type <> 'refund' OR related_transaction_id IS NOT NULL
        ),
        ADD CONSTRAINT ck_finance_transactions_transfer_relation CHECK (
          transaction_type NOT IN ('transfer_in','transfer_out') OR (transfer_group_id IS NOT NULL AND related_transaction_id IS NOT NULL)
        ),
        ADD CONSTRAINT ck_finance_transactions_reversal_relation CHECK (
          transaction_type <> 'reversal' OR reversed_transaction_id IS NOT NULL
        ),
        ADD CONSTRAINT ck_finance_transactions_no_self_relation CHECK (
          (related_transaction_id IS NULL OR related_transaction_id <> id)
          AND (reversed_transaction_id IS NULL OR reversed_transaction_id <> id)
        ),
        ADD CONSTRAINT ck_finance_transactions_reversed_metadata CHECK (
          status <> 'reversed' OR (reversed_at IS NOT NULL AND reversed_by IS NOT NULL)
        );

      ALTER TABLE finance_refund_allocations
        ADD CONSTRAINT ck_finance_refund_allocations_distinct_transactions CHECK (
          refund_transaction_id <> original_transaction_id
        );

      ALTER TABLE finance_receivable_adjustments
        ADD CONSTRAINT ck_finance_receivable_adjustments_reversed_metadata CHECK (
          status <> 'reversed' OR (reversed_at IS NOT NULL AND reversed_by IS NOT NULL)
        );
    `);

    await q.query(`
      CREATE UNIQUE INDEX uq_finance_transactions_active_reversal
      ON finance_transactions(reversed_transaction_id)
      WHERE deleted_at IS NULL AND status='posted' AND transaction_type='reversal';
    `);
    await q.query(`
      CREATE INDEX idx_finance_expenses_date_currency
      ON finance_expenses(expense_date,currency)
      WHERE deleted_at IS NULL;
    `);
    await q.query(`
      CREATE INDEX idx_finance_periods_status_range
      ON finance_periods(status,starts_on,ends_on)
      WHERE deleted_at IS NULL;
    `);
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`DROP INDEX IF EXISTS idx_finance_periods_status_range;`);
    await q.query(`DROP INDEX IF EXISTS idx_finance_expenses_date_currency;`);
    await q.query(`DROP INDEX IF EXISTS uq_finance_transactions_active_reversal;`);
    await queryInterface.removeConstraint('finance_receivable_adjustments','ck_finance_receivable_adjustments_reversed_metadata');
    await queryInterface.removeConstraint('finance_refund_allocations','ck_finance_refund_allocations_distinct_transactions');
    for (const name of [
      'ck_finance_transactions_reversed_metadata',
      'ck_finance_transactions_no_self_relation',
      'ck_finance_transactions_reversal_relation',
      'ck_finance_transactions_transfer_relation',
      'ck_finance_transactions_refund_relation',
    ]) await queryInterface.removeConstraint('finance_transactions',name);
  },
};
