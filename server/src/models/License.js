import {
  DataTypes,
  Model,
} from 'sequelize';

import {
  sequelize,
} from '../config/database.js';

export class License extends Model {}

License.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    installation_key: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      defaultValue: 'primary',
    },

    license_key: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },

    office_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    license_type: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: 'Yıllık Kurumsal Lisans',
    },

    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [[
          'active',
          'suspended',
          'revoked',
        ]],
      },
    },

    starts_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    max_users: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1,
        max: 100000,
      },
    },

    support_included: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    updates_included: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'License',
    tableName: 'licenses',
    underscored: true,
    timestamps: true,
    paranoid: false,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default License;
