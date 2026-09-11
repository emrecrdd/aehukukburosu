'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('licenses', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      installation_key: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        defaultValue: 'primary',
      },
      license_key: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      office_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      license_type: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: 'Yıllık Kurumsal Lisans',
      },
      status: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'active',
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      max_users: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      support_included: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      updates_included: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('licenses', ['status'], {
      name: 'licenses_status_idx',
    });

    await queryInterface.addIndex('licenses', ['expires_at'], {
      name: 'licenses_expires_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('licenses');
  },
};
