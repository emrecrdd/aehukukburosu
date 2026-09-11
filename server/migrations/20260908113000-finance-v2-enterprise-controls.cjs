'use strict';
module.exports={
 async up(queryInterface,Sequelize){const {DataTypes}=Sequelize;
  await queryInterface.addColumn('finance_transactions','transfer_group_id',{type:DataTypes.UUID,allowNull:true});
  await queryInterface.addColumn('finance_transactions','related_transaction_id',{type:DataTypes.UUID,allowNull:true,references:{model:'finance_transactions',key:'id'},onDelete:'RESTRICT'});
  await queryInterface.createTable('finance_receivable_adjustments',{
   id:{type:DataTypes.UUID,primaryKey:true,allowNull:false,defaultValue:Sequelize.literal('gen_random_uuid()')}, reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true},
   receivable_id:{type:DataTypes.UUID,allowNull:false,references:{model:'finance_receivables',key:'id'},onDelete:'RESTRICT'}, adjustment_type:{type:DataTypes.ENUM('discount','write_off'),allowNull:false},
   amount:{type:DataTypes.DECIMAL(19,4),allowNull:false},currency:{type:DataTypes.STRING(3),allowNull:false},reason:{type:DataTypes.STRING(500),allowNull:false},status:{type:DataTypes.ENUM('posted','reversed'),allowNull:false,defaultValue:'posted'},
   reversed_adjustment_id:{type:DataTypes.UUID,allowNull:true},created_by:{type:DataTypes.UUID,allowNull:false,references:{model:'users',key:'id'},onDelete:'RESTRICT'},reversed_by:{type:DataTypes.UUID,allowNull:true,references:{model:'users',key:'id'},onDelete:'RESTRICT'},reversed_at:{type:DataTypes.DATE,allowNull:true},
   created_at:{type:DataTypes.DATE,allowNull:false,defaultValue:Sequelize.fn('NOW')},updated_at:{type:DataTypes.DATE,allowNull:false,defaultValue:Sequelize.fn('NOW')},deleted_at:{type:DataTypes.DATE,allowNull:true}
  });
  await queryInterface.addConstraint('finance_receivable_adjustments',{fields:['amount'],type:'check',where:{amount:{[Sequelize.Op.gt]:0}},name:'ck_finance_receivable_adjustments_amount_positive'});
  await queryInterface.addIndex('finance_receivable_adjustments',['receivable_id','status']); await queryInterface.addIndex('finance_transactions',['transfer_group_id']); await queryInterface.addIndex('finance_transactions',['related_transaction_id']);
 },
 async down(queryInterface){await queryInterface.dropTable('finance_receivable_adjustments');await queryInterface.removeColumn('finance_transactions','related_transaction_id');await queryInterface.removeColumn('finance_transactions','transfer_group_id');await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_finance_receivable_adjustments_status"; DROP TYPE IF EXISTS "enum_finance_receivable_adjustments_adjustment_type";');}
};
