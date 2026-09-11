'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_analyses', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },

      document_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      case_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'cases',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      analysis_type: {
        type: Sequelize.ENUM(
          'document_analysis',
          'document_classification',
          'entity_extraction',
          'case_summary',
          'legal_research',
          'draft_generation',
          'sentiment_analysis'
        ),
        allowNull: false,
      },

      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'openai',
      },

      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      openai_response_id: {
        type: Sequelize.STRING,
      },

      status: {
        type: Sequelize.ENUM(
          'pending',
          'completed',
          'failed'
        ),
        defaultValue: 'pending',
      },

      input_hash: {
        type: Sequelize.STRING(64),
      },

      prompt_version: {
        type: Sequelize.STRING,
        defaultValue: 'v1',
      },

      confidence: {
        type: Sequelize.FLOAT,
      },

      duration_ms: {
        type: Sequelize.INTEGER,
      },

      input_tokens: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      output_tokens: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      total_tokens: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      result: {
        type: Sequelize.JSONB,
      },

      error_message: {
        type: Sequelize.TEXT,
      },

      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      deleted_at: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('ai_analyses', ['document_id']);
    await queryInterface.addIndex('ai_analyses', ['case_id']);
    await queryInterface.addIndex('ai_analyses', ['user_id']);
    await queryInterface.addIndex('ai_analyses', ['analysis_type']);
    await queryInterface.addIndex('ai_analyses', ['status']);
    await queryInterface.addIndex('ai_analyses', ['input_hash']);
    await queryInterface.addIndex('ai_analyses', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_analyses');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ai_analyses_analysis_type";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ai_analyses_status";'
    );
  },
};