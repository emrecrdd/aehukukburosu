'use strict';

/**
 * Derkenar Finance V2 core.
 *
 * This migration intentionally does not depend on the legacy `payments` table.
 * It creates an independent finance domain so a clean installation is deterministic
 * and legacy data can be migrated/reconciled separately.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    const uuid = {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    };

    const timestamps = {
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    };

    await queryInterface.createTable('finance_accounts', {
      id: uuid,
      code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      account_type: { type: DataTypes.ENUM('cash', 'bank', 'pos', 'clearing', 'other'), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      opening_balance: { type: DataTypes.DECIMAL(19, 4), allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      ...timestamps,
    });

    await queryInterface.createTable('finance_fee_agreements', {
      id: uuid,
      reference_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      client_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      case_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'cases', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      consultation_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'consultations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      title: { type: DataTypes.STRING(255), allowNull: false },
      billing_model: { type: DataTypes.ENUM('fixed', 'hourly', 'installment', 'success_fee', 'retainer', 'mixed', 'other'), allowNull: false, defaultValue: 'fixed' },
      agreed_amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      status: { type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'), allowNull: false, defaultValue: 'draft' },
      effective_from: { type: DataTypes.DATEONLY, allowNull: true },
      effective_to: { type: DataTypes.DATEONLY, allowNull: true },
      signed_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      approved_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('finance_receivables', {
      id: uuid,
      reference_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      fee_agreement_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'finance_fee_agreements', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      client_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      case_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'cases', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      consultation_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'consultations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      receivable_type: { type: DataTypes.ENUM('legal_fee', 'expense_reimbursement', 'success_fee', 'other'), allowNull: false, defaultValue: 'legal_fee' },
      description: { type: DataTypes.STRING(500), allowNull: false },
      amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      due_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.ENUM('draft', 'open', 'partially_paid', 'paid', 'written_off', 'cancelled'), allowNull: false, defaultValue: 'draft' },
      posted_at: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      ...timestamps,
    });

    await queryInterface.createTable('finance_transactions', {
      id: uuid,
      reference_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      idempotency_key: { type: DataTypes.STRING(128), allowNull: true, unique: true },
      client_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      case_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'cases', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      consultation_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'consultations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      account_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      transaction_type: { type: DataTypes.ENUM('receipt', 'refund', 'expense', 'transfer_in', 'transfer_out', 'adjustment', 'reversal'), allowNull: false },
      direction: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
      amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false },
      base_currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      fx_rate: { type: DataTypes.DECIMAL(24, 10), allowNull: false, defaultValue: 1 },
      base_amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      payment_method: { type: DataTypes.ENUM('cash', 'bank_transfer', 'credit_card', 'check', 'other'), allowNull: true },
      transaction_date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      description: { type: DataTypes.STRING(500), allowNull: true },
      external_reference: { type: DataTypes.STRING(160), allowNull: true },
      status: { type: DataTypes.ENUM('draft', 'posted', 'reversed', 'cancelled'), allowNull: false, defaultValue: 'draft' },
      reversed_transaction_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'finance_transactions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      reversal_reason: { type: DataTypes.STRING(500), allowNull: true },
      posted_at: { type: DataTypes.DATE, allowNull: true },
      reversed_at: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      reversed_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      ...timestamps,
    });

    await queryInterface.createTable('finance_allocations', {
      id: uuid,
      transaction_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_transactions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      receivable_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_receivables', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      ...timestamps,
    });

    await queryInterface.createTable('finance_expenses', {
      id: uuid,
      reference_no: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      transaction_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'finance_transactions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      client_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      case_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'cases', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      consultation_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'consultations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      expense_type: { type: DataTypes.ENUM('office', 'matter', 'client_reimbursable', 'non_reimbursable'), allowNull: false },
      category: { type: DataTypes.STRING(100), allowNull: true },
      description: { type: DataTypes.STRING(500), allowNull: false },
      amount: { type: DataTypes.DECIMAL(19, 4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      expense_date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      reimbursable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      reimbursement_receivable_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'finance_receivables', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      status: { type: DataTypes.ENUM('draft', 'posted', 'cancelled'), allowNull: false, defaultValue: 'draft' },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      ...timestamps,
    });

    await queryInterface.createTable('finance_periods', {
      id: uuid,
      period_key: { type: DataTypes.STRING(7), allowNull: false, unique: true },
      starts_on: { type: DataTypes.DATEONLY, allowNull: false },
      ends_on: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      closed_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      reopened_at: { type: DataTypes.DATE, allowNull: true },
      reopened_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      reopen_reason: { type: DataTypes.STRING(500), allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('finance_sequences', {
      id: uuid,
      sequence_key: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      current_value: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('finance_audit_events', {
      id: uuid,
      entity_type: { type: DataTypes.STRING(80), allowNull: false },
      entity_id: { type: DataTypes.UUID, allowNull: false },
      action: { type: DataTypes.STRING(80), allowNull: false },
      actor_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      reason: { type: DataTypes.STRING(500), allowNull: true },
      before_data: { type: DataTypes.JSONB, allowNull: true },
      after_data: { type: DataTypes.JSONB, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
      user_agent: { type: DataTypes.STRING(500), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    const positiveChecks = [
      ['finance_fee_agreements', 'agreed_amount'],
      ['finance_receivables', 'amount'],
      ['finance_transactions', 'amount'],
      ['finance_transactions', 'base_amount'],
      ['finance_transactions', 'fx_rate'],
      ['finance_allocations', 'amount'],
      ['finance_expenses', 'amount'],
    ];
    for (const [table, column] of positiveChecks) {
      await queryInterface.addConstraint(table, {
        fields: [column],
        type: 'check',
        where: { [column]: { [Sequelize.Op.gt]: 0 } },
        name: `ck_${table}_${column}_positive`,
      });
    }

    await queryInterface.addConstraint('finance_fee_agreements', {
      fields: ['client_id', 'case_id', 'consultation_id'],
      type: 'check',
      where: Sequelize.literal('client_id IS NOT NULL OR case_id IS NOT NULL OR consultation_id IS NOT NULL'),
      name: 'ck_finance_fee_agreements_context',
    });
    await queryInterface.addConstraint('finance_receivables', {
      fields: ['client_id', 'case_id', 'consultation_id'],
      type: 'check',
      where: Sequelize.literal('client_id IS NOT NULL OR case_id IS NOT NULL OR consultation_id IS NOT NULL'),
      name: 'ck_finance_receivables_context',
    });

    const indexes = [
      ['finance_fee_agreements', ['client_id', 'status']],
      ['finance_fee_agreements', ['case_id', 'status']],
      ['finance_fee_agreements', ['consultation_id', 'status']],
      ['finance_receivables', ['client_id', 'status', 'due_date']],
      ['finance_receivables', ['case_id', 'status']],
      ['finance_receivables', ['consultation_id', 'status']],
      ['finance_transactions', ['client_id', 'transaction_date']],
      ['finance_transactions', ['case_id', 'transaction_date']],
      ['finance_transactions', ['consultation_id', 'transaction_date']],
      ['finance_transactions', ['account_id', 'transaction_date']],
      ['finance_transactions', ['status', 'transaction_date']],
      ['finance_allocations', ['transaction_id']],
      ['finance_allocations', ['receivable_id']],
      ['finance_expenses', ['client_id', 'expense_date']],
      ['finance_expenses', ['case_id', 'expense_date']],
      ['finance_expenses', ['consultation_id', 'expense_date']],
      ['finance_audit_events', ['entity_type', 'entity_id', 'created_at']],
    ];
    for (const [table, fields] of indexes) {
      await queryInterface.addIndex(table, fields, { name: `idx_${table}_${fields.join('_')}` });
    }
  },

  async down(queryInterface) {
    const tables = [
      'finance_audit_events',
      'finance_sequences',
      'finance_periods',
      'finance_expenses',
      'finance_allocations',
      'finance_transactions',
      'finance_receivables',
      'finance_fee_agreements',
      'finance_accounts',
    ];
    for (const table of tables) await queryInterface.dropTable(table);

    const enums = [
      'enum_finance_accounts_account_type',
      'enum_finance_fee_agreements_billing_model',
      'enum_finance_fee_agreements_status',
      'enum_finance_receivables_receivable_type',
      'enum_finance_receivables_status',
      'enum_finance_transactions_transaction_type',
      'enum_finance_transactions_direction',
      'enum_finance_transactions_payment_method',
      'enum_finance_transactions_status',
      'enum_finance_expenses_expense_type',
      'enum_finance_expenses_status',
      'enum_finance_periods_status',
    ];
    for (const name of enums) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${name}";`);
    }
  },
};
