export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_ai_analyses_analysis_type"
    ADD VALUE IF NOT EXISTS 'case_completion';
  `);
}

export async function down(queryInterface, Sequelize) {
  // PostgreSQL enum değerini doğrudan kaldırmıyoruz.
}