import { Sequelize, DataTypes } from 'sequelize';

class FinancePaymentPlan extends Sequelize.Model {
  static initModel(sequelize) {
    FinancePaymentPlan.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},
      reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true},
      fee_agreement_id:{type:DataTypes.UUID,allowNull:true},
      client_id:{type:DataTypes.UUID,allowNull:true},
      case_id:{type:DataTypes.UUID,allowNull:true},
      consultation_id:{type:DataTypes.UUID,allowNull:true},
      title:{type:DataTypes.STRING(255),allowNull:false},
      description:{type:DataTypes.TEXT,allowNull:true},
      total_amount:{type:DataTypes.DECIMAL(19,4),allowNull:false},
      currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'},
      plan_type:{type:DataTypes.ENUM('one_time','installment','custom'),allowNull:false,defaultValue:'installment'},
      status:{type:DataTypes.ENUM('draft','active','completed','cancelled','defaulted'),allowNull:false,defaultValue:'draft'},
      start_date:{type:DataTypes.DATEONLY,allowNull:true},
      end_date:{type:DataTypes.DATEONLY,allowNull:true},
      activated_at:{type:DataTypes.DATE,allowNull:true},
      completed_at:{type:DataTypes.DATE,allowNull:true},
      cancelled_at:{type:DataTypes.DATE,allowNull:true},
      legacy_payment_plan_id:{type:DataTypes.UUID,allowNull:true,unique:true},
      created_by:{type:DataTypes.UUID,allowNull:false},
    },{sequelize,modelName:'FinancePaymentPlan',tableName:'finance_payment_plans',timestamps:true,paranoid:true,underscored:true});
    return FinancePaymentPlan;
  }
}
export { FinancePaymentPlan };
