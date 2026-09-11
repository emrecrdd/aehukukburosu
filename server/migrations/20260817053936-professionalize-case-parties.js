export async function up(
  queryInterface,
  Sequelize
) {
  const table =
    await queryInterface.describeTable(
      'case_parties'
    );

  // ======================================================
  // ENTITY TYPE
  // ======================================================

  if (
    !table.entity_type
  ) {
    await queryInterface.addColumn(
      'case_parties',
      'entity_type',
      {
        type:
          Sequelize.ENUM(
            'person',
            'company'
          ),

        allowNull:
          false,

        defaultValue:
          'person',
      }
    );
  }

  // ======================================================
  // IDENTIFICATION NUMBER
  //
  // Mevcut tc_number verisini kaybetmiyoruz.
  // ======================================================

  if (
    !table.identification_number
  ) {
    await queryInterface.addColumn(
      'case_parties',
      'identification_number',
      {
        type:
          Sequelize.STRING(
            20
          ),

        allowNull:
          true,
      }
    );

    if (
      table.tc_number
    ) {
      await queryInterface.sequelize.query(`
        UPDATE "case_parties"
        SET "identification_number" = "tc_number"
        WHERE "tc_number" IS NOT NULL
          AND "identification_number" IS NULL
      `);
    }
  }

  // ======================================================
  // TAX OFFICE
  // ======================================================

  if (
    !table.tax_office
  ) {
    await queryInterface.addColumn(
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
  }

  // ======================================================
  // LAWYER EMAIL
  // ======================================================

  if (
    !table.lawyer_email
  ) {
    await queryInterface.addColumn(
      'case_parties',
      'lawyer_email',
      {
        type:
          Sequelize.STRING(
            255
          ),

        allowNull:
          true,
      }
    );
  }

  // ======================================================
  // INDEXES
  // ======================================================

  const indexes =
    await queryInterface.showIndex(
      'case_parties'
    );

  const indexNames =
    new Set(
      indexes.map(
        (index) =>
          index.name
      )
    );

  if (
    !indexNames.has(
      'case_parties_case_id_idx'
    )
  ) {
    await queryInterface.addIndex(
      'case_parties',
      [
        'case_id',
      ],
      {
        name:
          'case_parties_case_id_idx',
      }
    );
  }

  if (
    !indexNames.has(
      'case_parties_party_type_idx'
    )
  ) {
    await queryInterface.addIndex(
      'case_parties',
      [
        'party_type',
      ],
      {
        name:
          'case_parties_party_type_idx',
      }
    );
  }

  if (
    !indexNames.has(
      'case_parties_case_party_type_idx'
    )
  ) {
    await queryInterface.addIndex(
      'case_parties',
      [
        'case_id',
        'party_type',
      ],
      {
        name:
          'case_parties_case_party_type_idx',
      }
    );
  }

  if (
    !indexNames.has(
      'case_parties_identification_number_idx'
    )
  ) {
    await queryInterface.addIndex(
      'case_parties',
      [
        'identification_number',
      ],
      {
        name:
          'case_parties_identification_number_idx',
      }
    );
  }

  // ======================================================
  // OLD COLUMN
  //
  // tc_number'ı şimdilik SILMIYORUZ.
  // Önce yeni kod canlıda stabil çalışsın.
  // Sonra ayrı migration ile kaldırabiliriz.
  // ======================================================
}

export async function down(
  queryInterface
) {
  const table =
    await queryInterface.describeTable(
      'case_parties'
    );

  const indexes =
    await queryInterface.showIndex(
      'case_parties'
    );

  const indexNames =
    new Set(
      indexes.map(
        (index) =>
          index.name
      )
    );

  if (
    indexNames.has(
      'case_parties_identification_number_idx'
    )
  ) {
    await queryInterface.removeIndex(
      'case_parties',
      'case_parties_identification_number_idx'
    );
  }

  if (
    indexNames.has(
      'case_parties_case_party_type_idx'
    )
  ) {
    await queryInterface.removeIndex(
      'case_parties',
      'case_parties_case_party_type_idx'
    );
  }

  if (
    indexNames.has(
      'case_parties_party_type_idx'
    )
  ) {
    await queryInterface.removeIndex(
      'case_parties',
      'case_parties_party_type_idx'
    );
  }

  if (
    indexNames.has(
      'case_parties_case_id_idx'
    )
  ) {
    await queryInterface.removeIndex(
      'case_parties',
      'case_parties_case_id_idx'
    );
  }

  if (
    table.lawyer_email
  ) {
    await queryInterface.removeColumn(
      'case_parties',
      'lawyer_email'
    );
  }

  if (
    table.tax_office
  ) {
    await queryInterface.removeColumn(
      'case_parties',
      'tax_office'
    );
  }

  if (
    table.identification_number
  ) {
    await queryInterface.removeColumn(
      'case_parties',
      'identification_number'
    );
  }

  if (
    table.entity_type
  ) {
    await queryInterface.removeColumn(
      'case_parties',
      'entity_type'
    );
  }

  /*
   * PostgreSQL enum type'ını da temizliyoruz.
   */
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_case_parties_entity_type";
  `);
}