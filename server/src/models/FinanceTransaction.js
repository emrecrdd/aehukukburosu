import { Sequelize, DataTypes } from 'sequelize';
export class FinanceTransaction extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceTransaction.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true}, idempotency_key:{type:DataTypes.STRING(128),allowNull:true,unique:true},
      client_id:{type:DataTypes.UUID,allowNull:true}, case_id:{type:DataTypes.UUID,allowNull:true}, consultation_id:{type:DataTypes.UUID,allowNull:true}, account_id:{type:DataTypes.UUID,allowNull:false},
      transaction_type:{type:DataTypes.ENUM('receipt','refund','expense','transfer_in','transfer_out','adjustment','reversal'),allowNull:false}, direction:{type:DataTypes.ENUM('in','out'),allowNull:false},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false}, base_currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'}, fx_rate:{type:DataTypes.DECIMAL(24,10),allowNull:false,defaultValue:1}, base_amount:{type:DataTypes.DECIMAL(19,4),allowNull:false},
      payment_method:{type:DataTypes.ENUM('cash','bank_transfer','credit_card','check','other'),allowNull:true}, transaction_date:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW}, description:{type:DataTypes.STRING(500),allowNull:true}, external_reference:{type:DataTypes.STRING(160),allowNull:true},
      status:{type:DataTypes.ENUM('draft','posted','reversed','cancelled'),allowNull:false,defaultValue:'draft'}, legacy_payment_id:{type:DataTypes.UUID,allowNull:true,unique:true}, transfer_group_id:{type:DataTypes.UUID,allowNull:true}, related_transaction_id:{type:DataTypes.UUID,allowNull:true}, reversed_transaction_id:{type:DataTypes.UUID,allowNull:true}, reversal_reason:{type:DataTypes.STRING(500),allowNull:true}, posted_at:{type:DataTypes.DATE,allowNull:true}, reversed_at:{type:DataTypes.DATE,allowNull:true}, created_by:{type:DataTypes.UUID,allowNull:false}, reversed_by:{type:DataTypes.UUID,allowNull:true},
    }, { sequelize, modelName:'FinanceTransaction', tableName:'finance_transactions', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceTransaction;
  }
}
