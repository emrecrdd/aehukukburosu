import { Sequelize, DataTypes } from 'sequelize';
export class FinanceAllocation extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceAllocation.init({ id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, transaction_id:{type:DataTypes.UUID,allowNull:false}, receivable_id:{type:DataTypes.UUID,allowNull:false}, amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false}, created_by:{type:DataTypes.UUID,allowNull:false} }, { sequelize, modelName:'FinanceAllocation', tableName:'finance_allocations', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceAllocation;
  }
}
