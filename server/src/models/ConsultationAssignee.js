import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class ConsultationAssignee extends Sequelize.Model {
  static initModel(sequelize) {
    ConsultationAssignee.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        consultation_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'consultations',
            key: 'id',
          },
        },

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },

        is_primary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        assigned_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        tableName:
          'consultation_assignees',
        timestamps:
          true,

        /*
         * consultation_assignees bir junction/assignment tablosudur.
         * Migration yalnız created_at + updated_at oluşturur;
         * deleted_at kolonu yoktur.
         *
         * Sequelize global config'te paranoid açık olsa bile
         * bu model soft-delete kullanmamalıdır.
         */
        paranoid:
          false,

        indexes: [
          {
            name:
              'consultation_assignees_consultation_id_idx',
            fields: [
              'consultation_id',
            ],
          },
          {
            name:
              'consultation_assignees_user_id_idx',
            fields: [
              'user_id',
            ],
          },
          {
            name:
              'consultation_assignees_consultation_user_uq',
            unique:
              true,
            fields: [
              'consultation_id',
              'user_id',
            ],
          },
        ],
      }
    );

    return ConsultationAssignee;
  }
}

export {
  ConsultationAssignee,
};
