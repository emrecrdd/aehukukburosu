import { Sequelize, DataTypes } from 'sequelize';
export class FinanceReceivableAdjustment extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceReceivableAdjustment.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},
      reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true},
      receivable_id:{type:DataTypes.UUID,allowNull:false},
      adjustment_type:{type:DataTypes.ENUM('discount','write_off'),allowNull:false},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false},
      reason:{type:DataTypes.STRING(500),allowNull:false}, status:{type:DataTypes.ENUM('posted','reversed'),allowNull:false,defaultValue:'posted'},
      reversed_adjustment_id:{type:DataTypes.UUID,allowNull:true}, created_by:{type:DataTypes.UUID,allowNull:false}, reversed_by:{type:DataTypes.UUID,allowNull:true}, reversed_at:{type:DataTypes.DATE,allowNull:true},
    }, { sequelize, modelName:'FinanceReceivableAdjustment', tableName:'finance_receivable_adjustments', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceReceivableAdjustment;
  }
}
