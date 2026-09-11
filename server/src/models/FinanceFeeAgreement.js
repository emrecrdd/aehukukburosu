import { Sequelize, DataTypes } from 'sequelize';
export class FinanceFeeAgreement extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceFeeAgreement.init({
      id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true},
      client_id:{type:DataTypes.UUID,allowNull:true}, case_id:{type:DataTypes.UUID,allowNull:true}, consultation_id:{type:DataTypes.UUID,allowNull:true},
      title:{type:DataTypes.STRING(255),allowNull:false}, billing_model:{type:DataTypes.ENUM('fixed','hourly','installment','success_fee','retainer','mixed','other'),allowNull:false,defaultValue:'fixed'},
      agreed_amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'}, status:{type:DataTypes.ENUM('draft','active','completed','cancelled'),allowNull:false,defaultValue:'draft'},
      effective_from:{type:DataTypes.DATEONLY,allowNull:true}, effective_to:{type:DataTypes.DATEONLY,allowNull:true}, signed_at:{type:DataTypes.DATE,allowNull:true}, notes:{type:DataTypes.TEXT,allowNull:true},
      created_by:{type:DataTypes.UUID,allowNull:false}, approved_by:{type:DataTypes.UUID,allowNull:true}, approved_at:{type:DataTypes.DATE,allowNull:true},
    }, { sequelize, modelName:'FinanceFeeAgreement', tableName:'finance_fee_agreements', underscored:true, timestamps:true, paranoid:true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceFeeAgreement;
  }
}
