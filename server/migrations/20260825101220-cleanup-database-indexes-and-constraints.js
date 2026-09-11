'use strict';

/**
 * FINAL DATABASE CLEANUP / HARDENING
 *
 * Amaç:
 *
 * - Eski sequelize.sync / migration geçmişinden kalan
 *   duplicate index ve unique constraintleri temizlemek.
 *
 * - paranoid:true tablolarında global UNIQUE yerine
 *   yalnız aktif kayıtları kapsayan partial UNIQUE
 *   indexler kullanmak.
 *
 * - Eksik kritik lookup indexlerini eklemek.
 *
 * - Eski migration geçmişine dokunmadan mevcut canlı
 *   şemayı normalize etmek.
 */

const dropConstraintIfExists =
  async (
    queryInterface,
    tableName,
    constraintName,
    transaction
  ) => {
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "${tableName}"
        DROP CONSTRAINT IF EXISTS "${constraintName}";
      `,
      {
        transaction,
      }
    );
  };

const dropIndexIfExists =
  async (
    queryInterface,
    indexName,
    transaction
  ) => {
    await queryInterface.sequelize.query(
      `
        DROP INDEX IF EXISTS "${indexName}";
      `,
      {
        transaction,
      }
    );
  };

const indexExists =
  async (
    queryInterface,
    indexName,
    transaction
  ) => {
    const [
      rows,
    ] =
      await queryInterface.sequelize.query(
        `
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = :indexName
          LIMIT 1;
        `,
        {
          replacements: {
            indexName,
          },

          transaction,
        }
      );

    return (
      rows.length >
      0
    );
  };

const addIndexIfMissing =
  async (
    queryInterface,
    tableName,
    fields,
    options,
    transaction
  ) => {
    const exists =
      await indexExists(
        queryInterface,
        options.name,
        transaction
      );

    if (
      exists
    ) {
      return;
    }

    await queryInterface.addIndex(
      tableName,
      fields,
      {
        ...options,

        transaction,
      }
    );
  };

export async function up(
  queryInterface
) {
  const transaction =
    await queryInterface.sequelize.transaction();

  try {
    // ====================================================
    // CLIENTS
    //
    // identification_number zaten önceki migration ile
    // partial unique hale getirildi.
    //
    // email / phone tarafındaki eski global UNIQUE
    // constraintlerin tamamını temizliyoruz.
    // ====================================================

    const clientEmailConstraints = [
      'clients_email_key',
      'clients_email_key1',
      'clients_email_key2',
      'clients_email_key3',
      'clients_email_key4',
      'clients_email_key5',
      'clients_email_key6',
      'clients_email_key7',
      'clients_email_key8',
    ];

    const clientPhoneConstraints = [
      'clients_phone_key',
      'clients_phone_key1',
      'clients_phone_key2',
      'clients_phone_key3',
      'clients_phone_key4',
      'clients_phone_key5',
      'clients_phone_key6',
      'clients_phone_key7',
      'clients_phone_key8',
    ];

    for (
      const constraintName of
      [
        ...clientEmailConstraints,
        ...clientPhoneConstraints,
      ]
    ) {
      await dropConstraintIfExists(
        queryInterface,
        'clients',
        constraintName,
        transaction
      );
    }

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS
          "uq_clients_email_active"
        ON "clients" (
          "email"
        )
        WHERE
          "deleted_at" IS NULL
          AND "email" IS NOT NULL;
      `,
      {
        transaction,
      }
    );

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS
          "uq_clients_phone_active"
        ON "clients" (
          "phone"
        )
        WHERE
          "deleted_at" IS NULL
          AND "phone" IS NOT NULL;
      `,
      {
        transaction,
      }
    );

    // ====================================================
    // USERS
    //
    // Soft-delete edilmiş kullanıcı e-postası yeni
    // kullanıcıyı bloke etmemeli.
    // ====================================================

    const userEmailConstraints = [
      'users_email_key',
      'users_email_key1',
      'users_email_key2',
      'users_email_key3',
      'users_email_key4',
      'users_email_key5',
      'users_email_key6',
      'users_email_key7',
      'users_email_key8',
    ];

    for (
      const constraintName of
      userEmailConstraints
    ) {
      await dropConstraintIfExists(
        queryInterface,
        'users',
        constraintName,
        transaction
      );
    }

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS
          "uq_users_email_active"
        ON "users" (
          "email"
        )
        WHERE
          "deleted_at" IS NULL;
      `,
      {
        transaction,
      }
    );

    // ====================================================
    // CASE CLIENTS
    //
    // PK zaten:
    //
    // (client_id, case_id)
    //
    // Dolayısıyla client_id lookup ayrıca gereksiz.
    // Ters yön case_id indexi ise gerekli.
    // ====================================================

    await dropIndexIfExists(
      queryInterface,
      'idx_case_clients_client_id',
      transaction
    );

    await dropIndexIfExists(
      queryInterface,
      'uq_case_clients_case_client',
      transaction
    );

    // ====================================================
    // CASE PARTIES
    //
    // Aynı kolonlara açılmış *_idx kopyalarını
    // temizliyoruz.
    // ====================================================

    const duplicateCasePartyIndexes = [
      'case_parties_case_id_idx',
      'case_parties_party_type_idx',
      'case_parties_case_party_type_idx',
      'case_parties_identification_number_idx',
      'case_parties_case_id_identification_number_idx',
    ];

    for (
      const indexName of
      duplicateCasePartyIndexes
    ) {
      await dropIndexIfExists(
        queryInterface,
        indexName,
        transaction
      );
    }

    // ====================================================
    // TASK ASSIGNEES
    //
    // PK:
    // (task_id, user_id)
    //
    // task_id zaten PK'nin ilk kolonu.
    // ====================================================

    await dropIndexIfExists(
      queryInterface,
      'task_assignees_task_id_idx',
      transaction
    );

    // ====================================================
    // PAYMENT PLANS
    //
    // Migration ile eklenen idx_* indexler ile
    // Sequelize tarafından oluşturulan payment_plans_*
    // indexler aynı kolonları kapsıyor.
    //
    // Model isimli olanları bırakıyoruz.
    // ====================================================

    const duplicatePaymentPlanIndexes = [
      'idx_payment_plans_client_id',
      'idx_payment_plans_case_id',
      'idx_payment_plans_created_by',
      'idx_payment_plans_status',
      'idx_payment_plans_plan_type',
      'idx_payment_plans_client_status',
      'idx_payment_plans_case_status',
      'idx_payment_plans_client_created_at',
    ];

    for (
      const indexName of
      duplicatePaymentPlanIndexes
    ) {
      await dropIndexIfExists(
        queryInterface,
        indexName,
        transaction
      );
    }

    // ====================================================
    // PAYMENT INSTALLMENTS
    //
    // Duplicate normal indexler.
    // ====================================================

    const duplicateInstallmentIndexes = [
      'idx_payment_installments_plan_id',
      'idx_payment_installments_due_date',
      'idx_payment_installments_status',
      'idx_payment_installments_plan_status',
      'idx_payment_installments_plan_due_date',
      'idx_payment_installments_status_due_date',
    ];

    for (
      const indexName of
      duplicateInstallmentIndexes
    ) {
      await dropIndexIfExists(
        queryInterface,
        indexName,
        transaction
      );
    }

    // ====================================================
    // INSTALLMENT UNIQUE
    //
    // Eski global unique indexler paranoid:true ile
    // uyumsuz.
    // ====================================================

    await dropIndexIfExists(
      queryInterface,
      'uq_payment_installments_plan_number',
      transaction
    );

    await dropIndexIfExists(
      queryInterface,
      'payment_installments_payment_plan_id_installment_number',
      transaction
    );

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS
          "uq_payment_installments_plan_number_active"
        ON "payment_installments" (
          "payment_plan_id",
          "installment_number"
        )
        WHERE
          "deleted_at" IS NULL;
      `,
      {
        transaction,
      }
    );

    // ====================================================
    // PAYMENTS
    //
    // idx_* kopyalarını kaldırıyoruz.
    // ====================================================

    const duplicatePaymentIndexes = [
      'idx_payments_payment_plan_id',
      'idx_payments_installment_id',
      'idx_payments_reversed_payment_id',
      'idx_payments_plan_status',
      'idx_payments_installment_status',
    ];

    for (
      const indexName of
      duplicatePaymentIndexes
    ) {
      await dropIndexIfExists(
        queryInterface,
        indexName,
        transaction
      );
    }

    // ====================================================
    // REMINDERS
    //
    // Global deduplication unique soft-delete ile
    // uyumsuz.
    // ====================================================

    await dropConstraintIfExists(
      queryInterface,
      'reminders',
      'reminders_deduplication_key_key',
      transaction
    );

    await dropIndexIfExists(
      queryInterface,
      'reminders_deduplication_key_key',
      transaction
    );

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS
          "uq_reminders_deduplication_key_active"
        ON "reminders" (
          "deduplication_key"
        )
        WHERE
          "deleted_at" IS NULL;
      `,
      {
        transaction,
      }
    );

    // ====================================================
    // REMINDER SOURCE CHECK
    //
    // Migration geçmişinde var fakat canlı DB'de yoksa
    // tekrar oluşturuyoruz.
    // ====================================================

    await queryInterface.sequelize.query(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE
              conname =
                'reminders_exactly_one_source_check'
              AND conrelid =
                'reminders'::regclass
          ) THEN

            ALTER TABLE "reminders"
            ADD CONSTRAINT
              "reminders_exactly_one_source_check"
            CHECK (
              (
                CASE
                  WHEN task_id IS NOT NULL
                  THEN 1
                  ELSE 0
                END
                +
                CASE
                  WHEN event_id IS NOT NULL
                  THEN 1
                  ELSE 0
                END
                +
                CASE
                  WHEN meeting_id IS NOT NULL
                  THEN 1
                  ELSE 0
                END
              ) = 1
            );

          END IF;
        END
        $$;
      `,
      {
        transaction,
      }
    );

    // ====================================================
    // MISSING INDEXES - DOCUMENTS
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'documents',
      [
        'uploaded_by',
      ],
      {
        name:
          'documents_uploaded_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'documents',
      [
        'client_id',
      ],
      {
        name:
          'documents_client_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'documents',
      [
        'case_id',
      ],
      {
        name:
          'documents_case_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'documents',
      [
        'parent_id',
      ],
      {
        name:
          'documents_parent_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'documents',
      [
        'power_of_attorney_id',
      ],
      {
        name:
          'documents_power_of_attorney_id_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - TASKS
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'created_by',
      ],
      {
        name:
          'tasks_created_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'approved_by',
      ],
      {
        name:
          'tasks_approved_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'case_id',
      ],
      {
        name:
          'tasks_case_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'client_id',
      ],
      {
        name:
          'tasks_client_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'parent_task_id',
      ],
      {
        name:
          'tasks_parent_task_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'status',
      ],
      {
        name:
          'tasks_status_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'due_date',
      ],
      {
        name:
          'tasks_due_date_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'tasks',
      [
        'status',
        'due_date',
      ],
      {
        name:
          'tasks_status_due_date_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - NOTES
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'notes',
      [
        'client_id',
      ],
      {
        name:
          'notes_client_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'notes',
      [
        'case_id',
      ],
      {
        name:
          'notes_case_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'notes',
      [
        'task_id',
      ],
      {
        name:
          'notes_task_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'notes',
      [
        'created_by',
      ],
      {
        name:
          'notes_created_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'notes',
      [
        'created_at',
      ],
      {
        name:
          'notes_created_at_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - AUDIT LOG
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'audit_logs',
      [
        'user_id',
      ],
      {
        name:
          'audit_logs_user_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'audit_logs',
      [
        'action',
      ],
      {
        name:
          'audit_logs_action_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'audit_logs',
      [
        'entity_type',
        'entity_id',
      ],
      {
        name:
          'audit_logs_entity_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'audit_logs',
      [
        'created_at',
      ],
      {
        name:
          'audit_logs_created_at_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'audit_logs',
      [
        'user_id',
        'created_at',
      ],
      {
        name:
          'audit_logs_user_created_at_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - NOTIFICATIONS
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'notifications',
      [
        'user_id',
      ],
      {
        name:
          'notifications_user_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'notifications',
      [
        'user_id',
        'read',
        'created_at',
      ],
      {
        name:
          'notifications_user_read_created_at_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - POWER OF ATTORNEY
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'power_of_attorneys',
      [
        'client_id',
      ],
      {
        name:
          'power_of_attorneys_client_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'power_of_attorneys',
      [
        'case_id',
      ],
      {
        name:
          'power_of_attorneys_case_id_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'power_of_attorneys',
      [
        'created_by',
      ],
      {
        name:
          'power_of_attorneys_created_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'power_of_attorneys',
      [
        'status',
      ],
      {
        name:
          'power_of_attorneys_status_idx',
      },
      transaction
    );

    // ====================================================
    // MISSING INDEXES - TEMPLATES
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'templates',
      [
        'category',
      ],
      {
        name:
          'templates_category_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'templates',
      [
        'law_area',
      ],
      {
        name:
          'templates_law_area_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'templates',
      [
        'created_by',
      ],
      {
        name:
          'templates_created_by_idx',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'templates',
      [
        'is_active',
        'created_at',
      ],
      {
        name:
          'templates_active_created_at_idx',
      },
      transaction
    );

    // ====================================================
    // PAYMENT PLAN DATE INDEXES
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'payment_plans',
      [
        'start_date',
      ],
      {
        name:
          'payment_plans_start_date',
      },
      transaction
    );

    await addIndexIfMissing(
      queryInterface,
      'payment_plans',
      [
        'end_date',
      ],
      {
        name:
          'payment_plans_end_date',
      },
      transaction
    );

    // ====================================================
    // REMINDER CREATED_BY INDEX
    // ====================================================

    await addIndexIfMissing(
      queryInterface,
      'reminders',
      [
        'created_by',
      ],
      {
        name:
          'reminders_created_by_idx',
      },
      transaction
    );

    await transaction.commit();
  } catch (
    error
  ) {
    await transaction.rollback();

    throw error;
  }
}

export async function down(
  queryInterface
) {
  const transaction =
    await queryInterface.sequelize.transaction();

  try {
    /*
     * Cleanup migration'ın amacı eski duplicate
     * yapıyı yeniden üretmek değildir.
     *
     * Down yalnızca bu migration'ın oluşturduğu
     * yeni hardening indexlerini kaldırır.
     */

    const createdIndexes = [
      'uq_clients_email_active',
      'uq_clients_phone_active',
      'uq_users_email_active',
      'uq_payment_installments_plan_number_active',
      'uq_reminders_deduplication_key_active',

      'documents_uploaded_by_idx',
      'documents_client_id_idx',
      'documents_case_id_idx',
      'documents_parent_id_idx',
      'documents_power_of_attorney_id_idx',

      'tasks_created_by_idx',
      'tasks_approved_by_idx',
      'tasks_case_id_idx',
      'tasks_client_id_idx',
      'tasks_parent_task_id_idx',
      'tasks_status_idx',
      'tasks_due_date_idx',
      'tasks_status_due_date_idx',

      'notes_client_id_idx',
      'notes_case_id_idx',
      'notes_task_id_idx',
      'notes_created_by_idx',
      'notes_created_at_idx',

      'audit_logs_user_id_idx',
      'audit_logs_action_idx',
      'audit_logs_entity_idx',
      'audit_logs_created_at_idx',
      'audit_logs_user_created_at_idx',

      'notifications_user_id_idx',
      'notifications_user_read_created_at_idx',

      'power_of_attorneys_client_id_idx',
      'power_of_attorneys_case_id_idx',
      'power_of_attorneys_created_by_idx',
      'power_of_attorneys_status_idx',

      'templates_category_idx',
      'templates_law_area_idx',
      'templates_created_by_idx',
      'templates_active_created_at_idx',

      'reminders_created_by_idx',
    ];

    for (
      const indexName of
      createdIndexes
    ) {
      await dropIndexIfExists(
        queryInterface,
        indexName,
        transaction
      );
    }

    await transaction.commit();
  } catch (
    error
  ) {
    await transaction.rollback();

    throw error;
  }
}