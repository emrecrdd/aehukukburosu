import { Sequelize, DataTypes } from 'sequelize';
export class FinanceAccount extends Sequelize.Model {
  static initModel(sequelize) {
    FinanceAccount.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      account_type: { type: DataTypes.ENUM('cash','bank','pos','clearing','other'), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
      opening_balance: { type: DataTypes.DECIMAL(19,4), allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.UUID, allowNull: false },
    }, { sequelize, modelName: 'FinanceAccount', tableName: 'finance_accounts', underscored: true, timestamps: true, paranoid: true, createdAt:'created_at', updatedAt:'updated_at', deletedAt:'deleted_at' });
    return FinanceAccount;
  }
}
