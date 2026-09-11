import {
  Sequelize,
  DataTypes,
} from 'sequelize';

import {
  CONSULTATION_STATUS,
  CONSULTATION_TYPE,
  CONSULTATION_MODE,
  CONSULTATION_SERVICE_MODEL,
  CONSULTATION_PRIORITY,
  CONSULTATION_BILLING_TYPE,
  CONSULTATION_CURRENCY,
  CONSULTATION_SOURCE,
} from '../constants/consultation.js';

const normalizeNullableText = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
};

class Consultation extends Sequelize.Model {
  static initModel(sequelize) {
    Consultation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        consultation_number: {
          type: DataTypes.STRING(32),
          allowNull: false,
          set(value) {
            const normalized =
              String(value || '')
                .trim()
                .toUpperCase();

            this.setDataValue(
              'consultation_number',
              normalized
            );
          },
          validate: {
            notEmpty: true,
            len: [1, 32],
          },
        },

        title: {
          type: DataTypes.STRING(240),
          allowNull: false,
          set(value) {
            this.setDataValue(
              'title',
              String(value || '').trim()
            );
          },
          validate: {
            notEmpty: true,
            len: [2, 240],
          },
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value) {
            this.setDataValue(
              'description',
              normalizeNullableText(value)
            );
          },
        },

        client_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'clients',
            key: 'id',
          },
        },

        prospect_name: {
          type: DataTypes.STRING(200),
          allowNull: true,
          set(value) {
            this.setDataValue(
              'prospect_name',
              normalizeNullableText(value)
            );
          },
          validate: {
            len: [2, 200],
          },
        },

        prospect_email: {
          type: DataTypes.STRING(254),
          allowNull: true,
          set(value) {
            const normalized =
              normalizeNullableText(value);

            this.setDataValue(
              'prospect_email',
              normalized
                ? normalized.toLowerCase()
                : null
            );
          },
          validate: {
            isEmailOrEmpty(value) {
              if (!value) return;

              const normalized =
                String(value)
                  .trim()
                  .toLowerCase();

              const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !emailRegex.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir e-posta adresi girilmelidir'
                );
              }
            },
          },
        },

        prospect_phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
          set(value) {
            this.setDataValue(
              'prospect_phone',
              normalizeNullableText(value)
            );
          },
        },

        legal_area: {
          type: DataTypes.STRING(120),
          allowNull: false,
          set(value) {
            this.setDataValue(
              'legal_area',
              String(value || '').trim()
            );
          },
          validate: {
            notEmpty: true,
            len: [2, 120],
          },
        },

        consultation_type: {
          type: DataTypes.STRING(40),
          allowNull: false,
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_TYPE
              ),
            ],
          },
        },

        consultation_mode: {
          type: DataTypes.STRING(24),
          allowNull: true,
          validate: {
            isValidMode(value) {
              if (value === null || value === undefined || value === '') {
                return;
              }

              if (
                !Object.values(
                  CONSULTATION_MODE
                ).includes(value)
              ) {
                throw new Error(
                  'Geçersiz danışmanlık görüşme şekli'
                );
              }
            },
          },
        },

        service_model: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue:
            CONSULTATION_SERVICE_MODEL.ONE_TIME,
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_SERVICE_MODEL
              ),
            ],
          },
        },

        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue:
            CONSULTATION_STATUS.NEW,
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_STATUS
              ),
            ],
          },
        },

        priority: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue:
            CONSULTATION_PRIORITY.NORMAL,
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_PRIORITY
              ),
            ],
          },
        },

        billing_type: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue:
            CONSULTATION_BILLING_TYPE.FIXED,
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_BILLING_TYPE
              ),
            ],
          },
        },

        agreed_fee: {
          type: DataTypes.DECIMAL(
            14,
            2
          ),
          allowNull: true,
          validate: {
            min: 0,
          },
        },

        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue:
            CONSULTATION_CURRENCY.TRY,
          set(value) {
            this.setDataValue(
              'currency',
              String(
                value ||
                  CONSULTATION_CURRENCY.TRY
              )
                .trim()
                .toUpperCase()
            );
          },
          validate: {
            isIn: [
              Object.values(
                CONSULTATION_CURRENCY
              ),
            ],
          },
        },

        source: {
          type: DataTypes.STRING(32),
          allowNull: true,
          validate: {
            isValidSource(value) {
              if (value === null || value === undefined || value === '') {
                return;
              }

              if (
                !Object.values(
                  CONSULTATION_SOURCE
                ).includes(value)
              ) {
                throw new Error(
                  'Geçersiz danışmanlık kaynağı'
                );
              }
            },
          },
        },

        opened_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue:
            DataTypes.NOW,
        },

        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        converted_case_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'cases',
            key: 'id',
          },
        },

        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },

        updated_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },

        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName:
          'consultations',
        timestamps:
          true,
        paranoid:
          true,
        validate: {
          clientOrProspectRequired() {
            const clientId =
              this.getDataValue(
                'client_id'
              );

            const prospectName =
              normalizeNullableText(
                this.getDataValue(
                  'prospect_name'
                )
              );

            if (
              !clientId &&
              !prospectName
            ) {
              throw new Error(
                'Müvekkil veya potansiyel kişi bilgisi gereklidir'
              );
            }
          },

          billingConsistency() {
            const billingType =
              this.getDataValue(
                'billing_type'
              );

            const agreedFee =
              this.getDataValue(
                'agreed_fee'
              );

            if (
              billingType ===
              CONSULTATION_BILLING_TYPE.FREE
            ) {
              if (
                agreedFee !== null &&
                agreedFee !== undefined
              ) {
                throw new Error(
                  'Ücretsiz danışmanlıkta ücret girilemez'
                );
              }

              return;
            }

            if (
              agreedFee === null ||
              agreedFee === undefined ||
              Number(agreedFee) <= 0
            ) {
              throw new Error(
                'Ücretli danışmanlıklarda ücret sıfırdan büyük olmalıdır'
              );
            }
          },
        },
        indexes: [
          {
            name:
              'consultations_number_idx',
            unique:
              true,
            fields: [
              'consultation_number',
            ],
          },
          {
            name:
              'consultations_client_id_idx',
            fields: [
              'client_id',
            ],
          },
          {
            name:
              'consultations_status_idx',
            fields: [
              'status',
            ],
          },
          {
            name:
              'consultations_legal_area_idx',
            fields: [
              'legal_area',
            ],
          },
          {
            name:
              'consultations_type_idx',
            fields: [
              'consultation_type',
            ],
          },
          {
            name:
              'consultations_converted_case_id_idx',
            fields: [
              'converted_case_id',
            ],
          },
          {
            name:
              'consultations_created_by_idx',
            fields: [
              'created_by',
            ],
          },
          {
            name:
              'consultations_deleted_at_idx',
            fields: [
              'deleted_at',
            ],
          },
        ],
      }
    );

    return Consultation;
  }
}

export {
  Consultation,
};
