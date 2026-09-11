import { Sequelize, DataTypes } from 'sequelize';

class FinanceInstallment extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceInstallment.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},
      payment_plan_id:{type:DataTypes.UUID,allowNull:false},
      receivable_id:{type:DataTypes.UUID,allowNull:false,unique:true},
      installment_number:{type:DataTypes.INTEGER,allowNull:false},
      title:{type:DataTypes.STRING(255),allowNull:true},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false},
      currency:{type:DataTypes.STRING(3),allowNull:false},
      due_date:{type:DataTypes.DATEONLY,allowNull:false},
      status:{type:DataTypes.ENUM('pending','partially_paid','paid','overdue','cancelled'),allowNull:false,defaultValue:'pending'},
      paid_at:{type:DataTypes.DATE,allowNull:true},
      legacy_installment_id:{type:DataTypes.UUID,allowNull:true,unique:true},
    },{sequelize,modelName:'FinanceInstallment',tableName:'finance_installments',timestamps:true,paranoid:true,underscored:true,indexes:[{unique:true,fields:['payment_plan_id','installment_number'],where:{deleted_at:null}}]});
    return FinanceInstallment;
  }
}
export { FinanceInstallment };
