import {
  Sequelize,
  DataTypes,
} from 'sequelize';

import {
  CASE_STATUS,
} from '../constants/caseStatus.js';

class Case extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Case.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        // ==================================================
        // YARGI BİLGİLERİ
        // ==================================================

        judiciary_type: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },

        judiciary_unit: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },

        opening_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        court_name: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },

        case_number: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },

        // ==================================================
        // TEMEL DOSYA BİLGİLERİ
        // ==================================================

        title: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        subject: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        status: {
          type:
            DataTypes.ENUM(
              ...Object.values(
                CASE_STATUS
              )
            ),

          allowNull:
            false,

          defaultValue:
            CASE_STATUS.PREPARATION,
        },

        priority: {
          type:
            DataTypes.ENUM(
              'low',
              'normal',
              'high',
              'critical'
            ),

          allowNull:
            false,

          defaultValue:
            'normal',
        },

        // ==================================================
        // OWNERSHIP / ASSIGNMENT
        // ==================================================

        created_by: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },

        assigned_to: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },
      },
      {
        sequelize,

        tableName:
          'cases',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'assigned_to',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'priority',
            ],
          },

          {
            fields: [
              'opening_date',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          /*
           * Record-level access sorgularında:
           *
           * created_by = actorId
           * OR assigned_to = actorId
           *
           * kullanıldığı için tekli indexler özellikle
           * önemlidir.
           */

          {
            fields: [
              'status',
              'created_at',
            ],
          },
        ],
      }
    );

    return Case;
  }
}

export {
  Case,
};