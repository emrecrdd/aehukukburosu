import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class AIAnalysis extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    AIAnalysis.init(
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
        // RELATIONS
        // ==================================================

        document_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'documents',

            key:
              'id',
          },
        },

        case_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'cases',

            key:
              'id',
          },
        },

        user_id: {
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

        // ==================================================
        // ANALYSIS
        // ==================================================

        analysis_type: {
          type:
            DataTypes.ENUM(
              'document_analysis',
              'document_classification',
              'entity_extraction',
              'hearing_preparation',
              'case_summary',
              'case_completion',

               'case_question',
              'legal_research',
              'draft_generation',
              'sentiment_analysis'
            ),

          allowNull:
            false,
        },

        provider: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            false,

          defaultValue:
            'openai',
        },

        model: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,
        },

        openai_response_id: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,
        },

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'completed',
              'failed'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        // ==================================================
        // CACHE / VERSIONING
        // ==================================================

        input_hash: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,
        },

        prompt_version: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            false,

          defaultValue:
            'v1',
        },

        // ==================================================
        // QUALITY / PERFORMANCE
        // ==================================================

        confidence: {
          type:
            DataTypes.FLOAT,

          allowNull:
            true,

          validate: {
            min:
              0,

            max:
              1,
          },
        },

        duration_ms: {
          type:
            DataTypes.INTEGER,

          allowNull:
            true,

          validate: {
            min:
              0,
          },
        },

        // ==================================================
        // TOKEN USAGE
        // ==================================================

        input_tokens: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,
          },
        },

        output_tokens: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,
          },
        },

        total_tokens: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,
          },
        },

        // ==================================================
        // RESULT
        // ==================================================

        result: {
          type:
            DataTypes.JSONB,

          allowNull:
            true,
        },

        error_message: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        metadata: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,

          defaultValue:
            {},
        },
      },
      {
        sequelize,

        tableName:
          'ai_analyses',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'document_id',
            ],
          },

          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'user_id',
            ],
          },

          {
            fields: [
              'analysis_type',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'input_hash',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },

          {
            fields: [
              'user_id',
              'created_at',
            ],
          },

          {
            fields: [
              'document_id',
              'analysis_type',
              'created_at',
            ],
          },

          {
            fields: [
              'case_id',
              'analysis_type',
              'created_at',
            ],
          },
        ],
      }
    );

    return AIAnalysis;
  }
}

export {
  AIAnalysis,
};