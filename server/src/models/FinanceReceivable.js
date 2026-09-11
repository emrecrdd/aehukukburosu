import { Sequelize, DataTypes } from 'sequelize';
export class FinanceReceivable extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceReceivable.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true}, fee_agreement_id:{type:DataTypes.UUID,allowNull:true},
      client_id:{type:DataTypes.UUID,allowNull:true}, case_id:{type:DataTypes.UUID,allowNull:true}, consultation_id:{type:DataTypes.UUID,allowNull:true},
      receivable_type:{type:DataTypes.ENUM('legal_fee','expense_reimbursement','success_fee','other'),allowNull:false,defaultValue:'legal_fee'}, description:{type:DataTypes.STRING(500),allowNull:false},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'}, due_date:{type:DataTypes.DATEONLY,allowNull:true},
      status:{type:DataTypes.ENUM('draft','open','partially_paid','paid','written_off','cancelled'),allowNull:false,defaultValue:'draft'}, posted_at:{type:DataTypes.DATE,allowNull:true}, legacy_installment_id:{type:DataTypes.UUID,allowNull:true,unique:true}, created_by:{type:DataTypes.UUID,allowNull:false},
    }, { sequelize, modelName:'FinanceReceivable', tableName:'finance_receivables', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceReceivable;
  }
}
