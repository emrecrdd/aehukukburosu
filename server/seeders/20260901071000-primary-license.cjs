'use strict';

const crypto = require('node:crypto');

const boolFromEnv = (
  value,
  fallback = true
) => {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const defaultExpiry =
      new Date(now);

    defaultExpiry.setFullYear(
      defaultExpiry.getFullYear() + 1
    );

    const licenseKey =
      process.env.LICENSE_KEY ||
      `DRK-${now.getFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const officeName =
      process.env.LICENSE_OFFICE_NAME ||
      process.env.OFFICE_NAME ||
      'ABC Hukuk & Danışmanlık';

    const licenseType =
      process.env.LICENSE_TYPE ||
      'Yıllık Kurumsal Lisans';

    const startsAt =
      process.env.LICENSE_STARTS_AT
        ? new Date(process.env.LICENSE_STARTS_AT)
        : now;

    const expiresAt =
      process.env.LICENSE_EXPIRES_AT
        ? new Date(process.env.LICENSE_EXPIRES_AT)
        : defaultExpiry;

    const maxUsers =
      Math.max(
        1,
        Number(
          process.env.LICENSE_MAX_USERS ||
            10
        ) || 10
      );

    await queryInterface.sequelize.query(
      `
        INSERT INTO licenses (
          id,
          installation_key,
          license_key,
          office_name,
          license_type,
          status,
          starts_at,
          expires_at,
          max_users,
          support_included,
          updates_included,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          :id,
          'primary',
          :licenseKey,
          :officeName,
          :licenseType,
          'active',
          :startsAt,
          :expiresAt,
          :maxUsers,
          :supportIncluded,
          :updatesIncluded,
          '{}'::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (installation_key)
        DO UPDATE SET
          license_key = EXCLUDED.license_key,
          office_name = EXCLUDED.office_name,
          license_type = EXCLUDED.license_type,
          status = EXCLUDED.status,
          starts_at = EXCLUDED.starts_at,
          expires_at = EXCLUDED.expires_at,
          max_users = EXCLUDED.max_users,
          support_included = EXCLUDED.support_included,
          updates_included = EXCLUDED.updates_included,
          updated_at = NOW();
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          licenseKey,
          officeName,
          licenseType,
          startsAt,
          expiresAt,
          maxUsers,
          supportIncluded:
            boolFromEnv(
              process.env
                .LICENSE_SUPPORT_INCLUDED,
              true
            ),
          updatesIncluded:
            boolFromEnv(
              process.env
                .LICENSE_UPDATES_INCLUDED,
              true
            ),
        },
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'licenses',
      {
        installation_key:
          'primary',
      }
    );
  },
};
