import { Sequelize, DataTypes } from 'sequelize';
export class FinanceExpense extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceExpense.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true}, transaction_id:{type:DataTypes.UUID,allowNull:true},
      client_id:{type:DataTypes.UUID,allowNull:true}, case_id:{type:DataTypes.UUID,allowNull:true}, consultation_id:{type:DataTypes.UUID,allowNull:true},
      expense_type:{type:DataTypes.ENUM('office','matter','client_reimbursable','non_reimbursable'),allowNull:false}, category:{type:DataTypes.STRING(100),allowNull:true}, description:{type:DataTypes.STRING(500),allowNull:false},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'}, expense_date:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW}, reimbursable:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false}, reimbursement_receivable_id:{type:DataTypes.UUID,allowNull:true}, status:{type:DataTypes.ENUM('draft','posted','cancelled'),allowNull:false,defaultValue:'draft'}, created_by:{type:DataTypes.UUID,allowNull:false},
    }, { sequelize, modelName:'FinanceExpense', tableName:'finance_expenses', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceExpense;
  }
}
