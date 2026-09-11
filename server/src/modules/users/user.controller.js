import {
  Op,
  UniqueConstraintError,
} from 'sequelize';

import {
  User,
} from '../../models/User.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

import {
  ROLES,
  ALL_PERMISSIONS,
  PERMISSION_PRESETS,
  getEffectivePermissions,
  isValidPermission,
} from '../../constants/roles.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  logger,
} from '../../config/logger.js';

// ======================================================
// HELPERS
// ======================================================

const VALID_ROLES =
  new Set(
    Object.values(
      ROLES
    )
  );

const normalizeEmail = (
  email
) => {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
};

const isValidEmail = (
  email
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};


const PASSWORD_MIN_LENGTH = 12;
const BCRYPT_MAX_PASSWORD_BYTES = 72;

const getPasswordValidationError = (
  password
) => {
  if (
    typeof password !==
      'string' ||
    password.length === 0
  ) {
    return 'Şifre gereklidir';
  }

  if (
    password.trim().length ===
    0
  ) {
    return 'Şifre yalnızca boşluklardan oluşamaz';
  }

  if (
    password.length <
    PASSWORD_MIN_LENGTH
  ) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
  }

  if (
    Buffer.byteLength(
      password,
      'utf8'
    ) >
    BCRYPT_MAX_PASSWORD_BYTES
  ) {
    return 'Şifre çok uzun. Lütfen daha kısa bir şifre kullanın.';
  }

  return null;
};

const getSafeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return typeof user.toJSON ===
    'function'
    ? user.toJSON()
    : user;
};

const getPermissionOverrides = (
  user
) => {
  const permissions =
    user?.permissions;

  if (
    !permissions ||
    typeof permissions !==
      'object' ||
    Array.isArray(
      permissions
    )
  ) {
    return {};
  }

  return permissions;
};

const sanitizePermissionOverrides = (
  permissions
) => {
  if (
    !permissions ||
    typeof permissions !==
      'object' ||
    Array.isArray(
      permissions
    )
  ) {
    return {};
  }

  const sanitized =
    {};

  for (
    const [
      permission,
      enabled,
    ] of Object.entries(
      permissions
    )
  ) {
    if (
      !isValidPermission(
        permission
      )
    ) {
      continue;
    }

    if (
      typeof enabled !==
      'boolean'
    ) {
      continue;
    }

    sanitized[
      permission
    ] =
      enabled;
  }

  return sanitized;
};

const buildPermissionPayload = (
  user
) => {
  const overrides =
    getPermissionOverrides(
      user
    );

  const effectivePermissions =
    getEffectivePermissions(
      user.role,
      overrides
    );

  return {
    user: {
      id:
        user.id,

      first_name:
        user.first_name,

      last_name:
        user.last_name,

      email:
        user.email,

      role:
        user.role,

      is_active:
        user.is_active,
    },

    overrides,

    effective_permissions:
      effectivePermissions,

    all_permissions:
      ALL_PERMISSIONS,
  };
};

const getAuditIp = (
  req
) => {
  return (
    req.realClientIp ||
    req.ip ||
    null
  );
};

const createAuditLog =
  async ({
    req,
    action,
    entityId,
    description,
  }) => {
    try {
      await AuditLog.create({
        action,

        entity_type:
          'user',

        entity_id:
          entityId,

        user_id:
          req.user.id,

        description,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ] ||
          null,
      });
    } catch (
      error
    ) {
      logger.error(
        'User audit log error:',
        error
      );
    }
  };

// ======================================================
// CONTROLLER
// ======================================================

export const userController = {
  // ====================================================
  // LIST
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        search,
        is_active,
      } =
        req.query;

      const where =
        {};

      if (
        role
      ) {
        if (
          !VALID_ROLES.has(
            role
          )
        ) {
          return errorResponse(
            res,
            'Geçersiz kullanıcı rolü',
            400
          );
        }

        where.role =
          role;
      }

      if (
        is_active !==
        undefined
      ) {
        where.is_active =
          String(
            is_active
          ) ===
          'true';
      }

      if (
        search?.trim()
      ) {
        const value =
          search.trim();

        where[
          Op.or
        ] = [
          {
            first_name: {
              [Op.iLike]:
                `%${value}%`,
            },
          },

          {
            last_name: {
              [Op.iLike]:
                `%${value}%`,
            },
          },

          {
            email: {
              [Op.iLike]:
                `%${value}%`,
            },
          },
        ];
      }

      const query =
        paginate(
          {
            where,
          },
          page,
          limit
        );

      const {
        count,
        rows,
      } =
        await User.findAndCountAll({
          ...query,

          attributes: {
            exclude: [
              'password',
              'refresh_token',
              'email_verification_token',
              'password_reset_token',
              'password_reset_expires',
            ],
          },

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        });

      const pagination =
        getPaginationData(
          count,
          page,
          limit
        );

      return paginatedResponse(
        res,
        rows,
        pagination,
        'Kullanıcılar getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User findAll error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcılar getirilemedi',
        500
      );
    }
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id,
          {
            attributes: {
              exclude: [
                'password',
                'refresh_token',
                'email_verification_token',
                'password_reset_token',
                'password_reset_expires',
              ],
            },
          }
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      return successResponse(
        res,
        user,
        'Kullanıcı getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User findOne error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı getirilemedi',
        500
      );
    }
  },

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const {
        first_name,
        last_name,
        email,
        password,
        phone,
        role = ROLES.INTERN,
        title,
        bio,
        is_active = true,
        permissions = {},
      } =
        req.body;

      const cleanFirstName =
        String(
          first_name || ''
        ).trim();

      const cleanLastName =
        String(
          last_name || ''
        ).trim();

      const cleanEmail =
        normalizeEmail(
          email
        );

      if (
        !cleanFirstName
      ) {
        return errorResponse(
          res,
          'Ad gereklidir',
          400
        );
      }

      if (
        !cleanLastName
      ) {
        return errorResponse(
          res,
          'Soyad gereklidir',
          400
        );
      }

      if (
        !cleanEmail
      ) {
        return errorResponse(
          res,
          'E-posta adresi gereklidir',
          400
        );
      }

      if (
        !isValidEmail(
          cleanEmail
        )
      ) {
        return errorResponse(
          res,
          'Geçerli bir e-posta adresi girin',
          400
        );
      }

      const passwordValidationError =
        getPasswordValidationError(
          password
        );

      if (
        passwordValidationError
      ) {
        return errorResponse(
          res,
          passwordValidationError,
          400
        );
      }

      if (
        !VALID_ROLES.has(
          role
        )
      ) {
        return errorResponse(
          res,
          'Geçersiz kullanıcı rolü',
          400
        );
      }

      const existingUser =
        await User.findOne({
          where: {
            email:
              cleanEmail,
          },
        });

      if (
        existingUser
      ) {
        return errorResponse(
          res,
          'Bu e-posta adresi zaten kullanılıyor',
          409
        );
      }

      const safePermissions =
        sanitizePermissionOverrides(
          permissions
        );

      const user =
        await User.create({
          first_name:
            cleanFirstName,

          last_name:
            cleanLastName,

          email:
            cleanEmail,

          password,

          phone:
            phone?.trim() ||
            null,

          role,

          title:
            title?.trim() ||
            null,

          bio:
            bio?.trim() ||
            null,

          is_active:
            Boolean(
              is_active
            ),

          permissions:
            safePermissions,
        });

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısı "${user.role}" rolüyle oluşturuldu`,
      });

      return successResponse(
        res,
        getSafeUser(
          user
        ),
        'Kullanıcı başarıyla oluşturuldu',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'User create error:',
        error
      );

      if (
        error instanceof
        UniqueConstraintError
      ) {
        return errorResponse(
          res,
          'Bu e-posta adresi zaten kullanılıyor',
          409
        );
      }

      return errorResponse(
        res,
        'Kullanıcı oluşturulamadı',
        500
      );
    }
  },

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      const {
        first_name,
        last_name,
        email,
        phone,
        title,
        bio,
      } =
        req.body;

      const updateData =
        {};

      if (
        first_name !==
        undefined
      ) {
        const value =
          String(
            first_name
          ).trim();

        if (
          !value
        ) {
          return errorResponse(
            res,
            'Ad boş olamaz',
            400
          );
        }

        updateData.first_name =
          value;
      }

      if (
        last_name !==
        undefined
      ) {
        const value =
          String(
            last_name
          ).trim();

        if (
          !value
        ) {
          return errorResponse(
            res,
            'Soyad boş olamaz',
            400
          );
        }

        updateData.last_name =
          value;
      }

      if (
        email !==
        undefined
      ) {
        const value =
          normalizeEmail(
            email
          );

        if (
          !isValidEmail(
            value
          )
        ) {
          return errorResponse(
            res,
            'Geçerli bir e-posta adresi girin',
            400
          );
        }

        const existing =
          await User.findOne({
            where: {
              email:
                value,

              id: {
                [Op.ne]:
                  user.id,
              },
            },
          });

        if (
          existing
        ) {
          return errorResponse(
            res,
            'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor',
            409
          );
        }

        updateData.email =
          value;
      }

      if (
        phone !==
        undefined
      ) {
        updateData.phone =
          phone?.trim() ||
          null;
      }

      if (
        title !==
        undefined
      ) {
        updateData.title =
          title?.trim() ||
          null;
      }

      if (
        bio !==
        undefined
      ) {
        updateData.bio =
          bio?.trim() ||
          null;
      }

      await user.update(
        updateData
      );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısının profil bilgileri güncellendi`,
      });

      return successResponse(
        res,
        getSafeUser(
          user
        ),
        'Kullanıcı başarıyla güncellendi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User update error:',
        error
      );

      if (
        error instanceof
        UniqueConstraintError
      ) {
        return errorResponse(
          res,
          'Bu e-posta adresi zaten kullanılıyor',
          409
        );
      }

      return errorResponse(
        res,
        'Kullanıcı güncellenemedi',
        500
      );
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async delete(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        user.id ===
        req.user.id
      ) {
        return errorResponse(
          res,
          'Kendi hesabınızı silemezsiniz',
          400
        );
      }

      if (
        user.role ===
        ROLES.ADMIN
      ) {
        const adminCount =
          await User.count({
            where: {
              role:
                ROLES.ADMIN,

              is_active:
                true,
            },
          });

        if (
          adminCount <=
          1
        ) {
          return errorResponse(
            res,
            'Sistemdeki son aktif yönetici silinemez',
            400
          );
        }
      }

      const userEmail =
        user.email;

      const userId =
        user.id;

      await user.destroy();

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          userId,

        description:
          `"${userEmail}" kullanıcısı silindi`,
      });

      return successResponse(
        res,
        null,
        'Kullanıcı başarıyla silindi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User delete error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı silinemedi',
        500
      );
    }
  },

  // ====================================================
  // TOGGLE ACTIVE
  // ====================================================

  async toggleActive(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        user.id ===
        req.user.id
      ) {
        return errorResponse(
          res,
          'Kendi hesabınızı pasif yapamazsınız',
          400
        );
      }

      const newStatus =
        !user.is_active;

      if (
        user.role ===
          ROLES.ADMIN &&
        newStatus ===
          false
      ) {
        const adminCount =
          await User.count({
            where: {
              role:
                ROLES.ADMIN,

              is_active:
                true,
            },
          });

        if (
          adminCount <=
          1
        ) {
          return errorResponse(
            res,
            'Sistemdeki son aktif yönetici pasif yapılamaz',
            400
          );
        }
      }

      await user.update({
        is_active:
          newStatus,

        refresh_token:
          newStatus
            ? user.refresh_token
            : null,
      });

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısı ${
            newStatus
              ? 'aktif'
              : 'pasif'
          } yapıldı`,
      });

      return successResponse(
        res,
        getSafeUser(
          user
        ),
        `Kullanıcı ${
          newStatus
            ? 'aktif'
            : 'pasif'
        } yapıldı`
      );
    } catch (
      error
    ) {
      logger.error(
        'User toggleActive error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı durumu güncellenemedi',
        500
      );
    }
  },

  // ====================================================
  // CHANGE ROLE
  // ====================================================

  async changeRole(
    req,
    res
  ) {
    try {
      const {
        role,
      } =
        req.body;

      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        !role ||
        !VALID_ROLES.has(
          role
        )
      ) {
        return errorResponse(
          res,
          'Geçerli bir rol belirtilmelidir',
          400
        );
      }

      if (
        user.id ===
        req.user.id
      ) {
        return errorResponse(
          res,
          'Kendi rolünüzü değiştiremezsiniz',
          400
        );
      }

      if (
        user.role ===
        role
      ) {
        return successResponse(
          res,
          getSafeUser(
            user
          ),
          'Kullanıcı zaten bu role sahip'
        );
      }

      if (
        user.role ===
          ROLES.ADMIN &&
        role !==
          ROLES.ADMIN
      ) {
        const adminCount =
          await User.count({
            where: {
              role:
                ROLES.ADMIN,

              is_active:
                true,
            },
          });

        if (
          adminCount <=
          1
        ) {
          return errorResponse(
            res,
            'Sistemdeki son aktif yöneticinin rolü değiştirilemez',
            400
          );
        }
      }

      const oldRole =
        user.role;

      await user.update({
        role,

        refresh_token:
          null,
      });

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısının rolü "${oldRole}" → "${role}" olarak değiştirildi`,
      });

      return successResponse(
        res,
        getSafeUser(
          user
        ),
        'Kullanıcı rolü başarıyla değiştirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User changeRole error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı rolü değiştirilemedi',
        500
      );
    }
  },

  // ====================================================
  // GET PERMISSIONS
  // ====================================================

  async getPermissions(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      return successResponse(
        res,
        buildPermissionPayload(
          user
        ),
        'Kullanıcı yetkileri getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User getPermissions error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı yetkileri getirilemedi',
        500
      );
    }
  },

  // ====================================================
  // UPDATE PERMISSIONS
  // ====================================================

  async updatePermissions(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        user.role ===
        ROLES.ADMIN
      ) {
        return errorResponse(
          res,
          'Yönetici rolü tam yetkilidir; kullanıcı bazlı yetki özelleştirmesi uygulanamaz',
          400
        );
      }

      const {
        permissions,
      } =
        req.body;

      if (
        !permissions ||
        typeof permissions !==
          'object' ||
        Array.isArray(
          permissions
        )
      ) {
        return errorResponse(
          res,
          'permissions alanı nesne olmalıdır',
          400
        );
      }

      const invalidPermissions =
        Object.keys(
          permissions
        ).filter(
          (
            permission
          ) =>
            !isValidPermission(
              permission
            )
        );

      if (
        invalidPermissions.length >
        0
      ) {
        return errorResponse(
          res,
          `Geçersiz yetkiler: ${invalidPermissions.join(
            ', '
          )}`,
          400
        );
      }

      const invalidValues =
        Object.entries(
          permissions
        ).filter(
          (
            [
              ,
              value,
            ]
          ) =>
            typeof value !==
            'boolean'
        );

      if (
        invalidValues.length >
        0
      ) {
        return errorResponse(
          res,
          'Yetki değerleri yalnızca true veya false olabilir',
          400
        );
      }

      const safePermissions =
        sanitizePermissionOverrides(
          permissions
        );

      await user.update({
        permissions:
          safePermissions,

        refresh_token:
          null,
      });

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısının özel yetkileri güncellendi`,
      });

      return successResponse(
        res,
        buildPermissionPayload(
          user
        ),
        'Kullanıcı yetkileri başarıyla güncellendi'
      );
    } catch (
      error
    ) {
      logger.error(
        'User updatePermissions error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı yetkileri güncellenemedi',
        500
      );
    }
  },

  // ====================================================
  // RESET PERMISSIONS
  // ====================================================

  async resetPermissions(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        user.role ===
        ROLES.ADMIN
      ) {
        return errorResponse(
          res,
          'Yönetici rolü zaten tam yetkilidir',
          400
        );
      }

      await user.update({
        permissions:
          {},

        refresh_token:
          null,
      });

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısının özel yetkileri sıfırlandı`,
      });

      return successResponse(
        res,
        buildPermissionPayload(
          user
        ),
        'Kullanıcı rol varsayılanlarına döndürüldü'
      );
    } catch (
      error
    ) {
      logger.error(
        'User resetPermissions error:',
        error
      );

      return errorResponse(
        res,
        'Kullanıcı yetkileri sıfırlanamadı',
        500
      );
    }
  },

  // ====================================================
  // APPLY PERMISSION PRESET
  // ====================================================

  async applyPermissionPreset(
    req,
    res
  ) {
    try {
      const user =
        await User.findByPk(
          req.params.id
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      if (
        user.role ===
        ROLES.ADMIN
      ) {
        return errorResponse(
          res,
          'Yönetici rolü zaten tam yetkilidir',
          400
        );
      }

      const {
        preset,
      } =
        req.body;

      const presetData =
        PERMISSION_PRESETS[
          preset
        ];

      if (
        !presetData
      ) {
        return errorResponse(
          res,
          'Geçersiz yetki şablonu',
          400
        );
      }

      if (
        presetData.role &&
        presetData.role !==
          user.role
      ) {
        return errorResponse(
          res,
          'Bu yetki şablonu kullanıcının rolüyle uyumlu değil',
          400
        );
      }

      const overrides =
        sanitizePermissionOverrides(
          presetData.overrides ||
          {}
        );

      await user.update({
        permissions:
          overrides,

        refresh_token:
          null,
      });

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          user.id,

        description:
          `"${user.email}" kullanıcısına "${presetData.label}" yetki şablonu uygulandı`,
      });

      return successResponse(
        res,
        {
          ...buildPermissionPayload(
            user
          ),

          preset: {
            key:
              preset,

            label:
              presetData.label,
          },
        },
        'Yetki şablonu başarıyla uygulandı'
      );
    } catch (
      error
    ) {
      logger.error(
        'User applyPermissionPreset error:',
        error
      );

      return errorResponse(
        res,
        'Yetki şablonu uygulanamadı',
        500
      );
    }
  },
};