import { Sequelize, DataTypes } from 'sequelize';
export class FinanceAuditEvent extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceAuditEvent.init({ id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true}, entity_type:{type:DataTypes.STRING(80),allowNull:false}, entity_id:{type:DataTypes.UUID,allowNull:false}, action:{type:DataTypes.STRING(80),allowNull:false}, actor_id:{type:DataTypes.UUID,allowNull:false}, reason:{type:DataTypes.STRING(500),allowNull:true}, before_data:{type:DataTypes.JSONB,allowNull:true}, after_data:{type:DataTypes.JSONB,allowNull:true}, metadata:{type:DataTypes.JSONB,allowNull:true}, ip_address:{type:DataTypes.STRING(64),allowNull:true}, user_agent:{type:DataTypes.STRING(500),allowNull:true} }, { sequelize, modelName:'FinanceAuditEvent', tableName:'finance_audit_events', underscored:true, timestamps:true, updatedAt:false, createdAt:'created_at', paranoid:false });
    return FinanceAuditEvent;
  }
}
