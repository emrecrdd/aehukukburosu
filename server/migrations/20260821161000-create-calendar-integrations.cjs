'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    await queryInterface.createTable(
      'calendar_integrations',
      {
        id: {
          type:
            Sequelize.UUID,

          allowNull:
            false,

          primaryKey:
            true,
        },

        // ==================================================
        // USER
        // ==================================================

        user_id: {
          type:
            Sequelize.UUID,

          allowNull:
            false,

          references: {
            model:
              'users',

            key:
              'id',
          },

          onUpdate:
            'CASCADE',

          onDelete:
            'CASCADE',
        },

        // ==================================================
        // PROVIDER
        // ==================================================

        /*
         * Şimdilik google kullanıyoruz.
         *
         * STRING bırakmamızın sebebi ileride:
         * microsoft / outlook
         *
         * eklerken migration karmaşası yaşamamak.
         */
        provider: {
          type:
            Sequelize.STRING(
              32
            ),

          allowNull:
            false,

          defaultValue:
            'google',
        },

        // ==================================================
        // GOOGLE ACCOUNT
        // ==================================================

        account_email: {
          type:
            Sequelize.STRING(
              255
            ),

          allowNull:
            true,
        },

        /*
         * Şimdilik kullanıcının ana Google takvimine
         * senkron yapacağız.
         */
        calendar_id: {
          type:
            Sequelize.STRING(
              255
            ),

          allowNull:
            false,

          defaultValue:
            'primary',
        },

        // ==================================================
        // TOKENS
        // ==================================================

        /*
         * Bunları DÜZ METİN olarak kaydetmeyeceğiz.
         *
         * Sonraki adımda server-side encryption util
         * oluşturup AES-GCM ile şifreleyeceğiz.
         */
        access_token_encrypted: {
          type:
            Sequelize.TEXT,

          allowNull:
            true,
        },

        refresh_token_encrypted: {
          type:
            Sequelize.TEXT,

          allowNull:
            true,
        },

        token_type: {
          type:
            Sequelize.STRING(
              50
            ),

          allowNull:
            true,
        },

        scope: {
          type:
            Sequelize.TEXT,

          allowNull:
            true,
        },

        /*
         * Google token expiry bilgisi.
         */
        expires_at: {
          type:
            Sequelize.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // STATE
        // ==================================================

        is_active: {
          type:
            Sequelize.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            true,
        },

        last_synced_at: {
          type:
            Sequelize.DATE,

          allowNull:
            true,
        },

        /*
         * Sync sırasında hata olursa bağlantıyı
         * tamamen düşürmeden son hatayı saklayabiliriz.
         */
        last_error: {
          type:
            Sequelize.TEXT,

          allowNull:
            true,
        },

        // ==================================================
        // TIMESTAMPS
        // ==================================================

        created_at: {
          type:
            Sequelize.DATE,

          allowNull:
            false,

          defaultValue:
            Sequelize.fn(
              'NOW'
            ),
        },

        updated_at: {
          type:
            Sequelize.DATE,

          allowNull:
            false,

          defaultValue:
            Sequelize.fn(
              'NOW'
            ),
        },
      }
    );

    // ====================================================
    // ONE PROVIDER PER USER
    // ====================================================

    /*
     * Bir kullanıcıda aynı provider için iki bağlantı
     * oluşmasını engelliyoruz.
     *
     * Örn:
     *
     * user-1 + google -> tek kayıt
     */
    await queryInterface.addIndex(
      'calendar_integrations',
      [
        'user_id',
        'provider',
      ],
      {
        unique:
          true,

        name:
          'calendar_integrations_user_provider_unique',
      }
    );

    // ====================================================
    // LOOKUP INDEX
    // ====================================================

    await queryInterface.addIndex(
      'calendar_integrations',
      [
        'provider',
        'is_active',
      ],
      {
        name:
          'calendar_integrations_provider_active_idx',
      }
    );
  },

  async down(
    queryInterface
  ) {
    await queryInterface.dropTable(
      'calendar_integrations'
    );
  },
};