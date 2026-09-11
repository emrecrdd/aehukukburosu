'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    await queryInterface.changeColumn(
      'case_parties',
      'tax_office',
      {
        type:
          Sequelize.STRING(
            150
          ),

        allowNull:
          true,
      }
    );

    await queryInterface.changeColumn(
      'case_parties',
      'lawyer_registry_number',
      {
        type:
          Sequelize.STRING(
            100
          ),

        allowNull:
          true,
      }
    );

    await queryInterface.addIndex(
      'case_parties',
      [
        'case_id',
        'identification_number',
      ],
      {
        name:
          'case_parties_case_id_identification_number_idx',
      }
    );
  },

  async down(
    queryInterface,
    Sequelize
  ) {
    await queryInterface.removeIndex(
      'case_parties',
      'case_parties_case_id_identification_number_idx'
    );

    await queryInterface.changeColumn(
      'case_parties',
      'lawyer_registry_number',
      {
        type:
          Sequelize.STRING(
            50
          ),

        allowNull:
          true,
      }
    );

    await queryInterface.changeColumn(
      'case_parties',
      'tax_office',
      {
        type:
          Sequelize.STRING(
            255
          ),

        allowNull:
          true,
      }
    );
  },
};