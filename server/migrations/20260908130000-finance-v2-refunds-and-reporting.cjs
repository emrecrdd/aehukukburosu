'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('finance_refund_allocations', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      refund_transaction_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_transactions', key: 'id' }, onDelete: 'RESTRICT' },
      original_transaction_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_transactions', key: 'id' }, onDelete: 'RESTRICT' },
      receivable_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'finance_receivables', key: 'id' }, onDelete: 'RESTRICT' },
      amount: { type: DataTypes.DECIMAL(19,4), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false },
      created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    });
    await queryInterface.addConstraint('finance_refund_allocations', {
      fields:['amount'], type:'check', where:{ amount:{ [Sequelize.Op.gt]:0 } }, name:'ck_finance_refund_allocations_amount_positive'
    });
    await queryInterface.addIndex('finance_refund_allocations',['refund_transaction_id'],{name:'idx_finance_refund_allocations_refund'});
    await queryInterface.addIndex('finance_refund_allocations',['original_transaction_id','receivable_id'],{name:'idx_finance_refund_allocations_original_receivable'});
    await queryInterface.addIndex('finance_transactions',['transaction_type','related_transaction_id','status'],{name:'idx_finance_transactions_refund_relation'});
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('finance_transactions','idx_finance_transactions_refund_relation');
    await queryInterface.dropTable('finance_refund_allocations');
  }
};
