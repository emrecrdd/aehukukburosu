import { Sequelize, DataTypes } from 'sequelize';
export class FinancePeriod extends Sequelize.Model {
  static initModel(sequelize) {
    FinancePeriod.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, period_key:{type:DataTypes.STRING(7),allowNull:false,unique:true}, starts_on:{type:DataTypes.DATEONLY,allowNull:false}, ends_on:{type:DataTypes.DATEONLY,allowNull:false}, status:{type:DataTypes.ENUM('open','closed'),allowNull:false,defaultValue:'open'}, closed_at:{type:DataTypes.DATE,allowNull:true}, closed_by:{type:DataTypes.UUID,allowNull:true}, reopened_at:{type:DataTypes.DATE,allowNull:true}, reopened_by:{type:DataTypes.UUID,allowNull:true}, reopen_reason:{type:DataTypes.STRING(500),allowNull:true},
    }, { sequelize, modelName:'FinancePeriod', tableName:'finance_periods', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinancePeriod;
  }
}
