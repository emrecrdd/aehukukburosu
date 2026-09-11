import {
  License,
} from '../../models/License.js';

import {
  User,
} from '../../models/User.js';

const PRIMARY_INSTALLATION =
  'primary';

const MS_PER_DAY =
  24 * 60 * 60 * 1000;

const maskLicenseKey = (
  value
) => {
  const key =
    String(value || '').trim();

  if (!key) {
    return null;
  }

  if (key.length <= 10) {
    return key;
  }

  return `${key.slice(0, 7)}••••${key.slice(-4)}`;
};

const getEffectiveStatus = (
  license,
  now = new Date()
) => {
  if (!license) {
    return 'missing';
  }

  if (
    license.status === 'revoked'
  ) {
    return 'revoked';
  }

  if (
    license.status === 'suspended'
  ) {
    return 'suspended';
  }

  const startsAt =
    new Date(license.starts_at);

  const expiresAt =
    new Date(license.expires_at);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return 'invalid';
  }

  if (startsAt > now) {
    return 'scheduled';
  }

  if (expiresAt <= now) {
    return 'expired';
  }

  return 'active';
};

const getStatusLabel = (
  status
) => {
  const labels = {
    active: 'Aktif',
    expired: 'Süresi Dolmuş',
    suspended: 'Askıya Alınmış',
    revoked: 'İptal Edilmiş',
    scheduled: 'Başlangıç Bekliyor',
    missing: 'Tanımlanmamış',
    invalid: 'Geçersiz',
  };

  return (
    labels[status] ||
    'Bilinmiyor'
  );
};

const getDaysRemaining = (
  expiresAt,
  now = new Date()
) => {
  const expires =
    new Date(expiresAt);

  if (
    Number.isNaN(expires.getTime())
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (expires.getTime() -
        now.getTime()) /
        MS_PER_DAY
    )
  );
};

export const licenseService = {
  async getCurrentRecord() {
    return License.findOne({
      where: {
        installation_key:
          PRIMARY_INSTALLATION,
      },
    });
  },

  async getCurrent() {
    const license =
      await this.getCurrentRecord();

    if (!license) {
      return {
        exists: false,
        effectiveStatus:
          'missing',
        statusLabel:
          getStatusLabel(
            'missing'
          ),
      };
    }

    const now =
      new Date();

    const effectiveStatus =
      getEffectiveStatus(
        license,
        now
      );

    const activeUsers =
      await User.count({
        where: {
          is_active: true,
        },
      });

    const maxUsers =
      Number(
        license.max_users || 0
      );

    return {
      exists: true,
      id: license.id,
      licenseKey:
        maskLicenseKey(
          license.license_key
        ),
      officeName:
        license.office_name,
      licenseType:
        license.license_type,
      configuredStatus:
        license.status,
      effectiveStatus,
      statusLabel:
        getStatusLabel(
          effectiveStatus
        ),
      startsAt:
        license.starts_at,
      expiresAt:
        license.expires_at,
      daysRemaining:
        getDaysRemaining(
          license.expires_at,
          now
        ),
      maxUsers,
      activeUsers,
      availableSeats:
        Math.max(
          0,
          maxUsers -
            activeUsers
        ),
      supportIncluded:
        license.support_included ===
        true,
      updatesIncluded:
        license.updates_included ===
        true,
      metadata:
        license.metadata || {},
      isUsable:
        effectiveStatus ===
        'active',
    };
  },

  async assertUsable() {
    const license =
      await this.getCurrent();

    if (
      license.effectiveStatus ===
      'active'
    ) {
      return license;
    }

    const error =
      new Error(
        license.effectiveStatus ===
          'expired'
          ? 'Derkenar lisans süresi sona ermiştir.'
          : license.effectiveStatus ===
              'suspended'
            ? 'Derkenar lisansı geçici olarak askıya alınmıştır.'
            : license.effectiveStatus ===
                'revoked'
              ? 'Derkenar lisansı iptal edilmiştir.'
              : license.effectiveStatus ===
                  'scheduled'
                ? 'Derkenar lisans başlangıç tarihi henüz gelmemiştir.'
                : 'Bu kurulum için geçerli bir Derkenar lisansı bulunamadı.'
      );

    error.code =
      `LICENSE_${String(
        license.effectiveStatus ||
          'invalid'
      ).toUpperCase()}`;

    error.license =
      license;

    throw error;
  },

  async assertSeatAvailable() {
    const license =
      await this.assertUsable();

    if (
      license.activeUsers >=
      license.maxUsers
    ) {
      const error =
        new Error(
          'Lisans kullanıcı kapasitesine ulaşıldı. Yeni kullanıcı eklemek için lisans kapasitesini artırın.'
        );

      error.code =
        'LICENSE_USER_LIMIT_REACHED';
      error.license =
        license;

      throw error;
    }

    return license;
  },
};

export default licenseService;
