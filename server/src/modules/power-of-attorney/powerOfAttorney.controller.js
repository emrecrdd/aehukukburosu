import {
  powerOfAttorneyService,
} from './powerOfAttorney.service.js';

import {
  documentService,
} from '../documents/document.service.js';

import {
  logger,
} from '../../config/logger.js';

import {
  hasPermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

// ======================================================
// HELPERS
// ======================================================

const getHttpStatusFromError = (
  error,
  fallback = 400
) => {
  const message =
    String(
      error?.message || ''
    ).toLowerCase();

  if (
    message.includes('bulunamadı') ||
    message.includes('not found')
  ) {
    return 404;
  }

  if (
    message.includes('yetki') ||
    message.includes('forbidden')
  ) {
    return 403;
  }

  if (
    message.includes('unauthorized')
  ) {
    return 401;
  }

  return fallback;
};

const hasOptionalPermission = (
  user,
  permissionKey
) => {
  if (!permissionKey) {
    return false;
  }

  return hasPermission(
    user,
    permissionKey
  );
};

const getPowerOfAttorneyAccessContext = (
  user
) => {
  return {
    userId:
      user.id,

    /*
     * VIEW_ALL_POWER_OF_ATTORNEY permission setinde
     * henüz yoksa fail-closed davranır.
     *
     * Admin global erişimli kalır.
     */
    canViewAllPowerOfAttorney:
      user?.role === 'admin' ||
      hasOptionalPermission(
        user,
        PERMISSION_KEYS
          .VIEW_ALL_POWER_OF_ATTORNEY
      ),

    canViewAllCases:
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),
  };
};



const normalizeNullableId = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return (
    normalized ||
    null
  );
};

const normalizeNullableDate = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  return value;
};

const parseAuthorities = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value !==
    'string'
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        value
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const normalizePowerOfAttorneyBody = (
  body = {}
) => {
  const data = {
    ...body,
  };

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        data,
        'client_id'
      )
  ) {
    data.client_id =
      normalizeNullableId(
        data.client_id
      );
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        data,
        'case_id'
      )
  ) {
    data.case_id =
      normalizeNullableId(
        data.case_id
      );
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        data,
        'start_date'
      )
  ) {
    data.start_date =
      normalizeNullableDate(
        data.start_date
      );
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        data,
        'end_date'
      )
  ) {
    data.end_date =
      normalizeNullableDate(
        data.end_date
      );
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        data,
        'authorities'
      )
  ) {
    data.authorities =
      parseAuthorities(
        data.authorities
      );
  }

  /*
   * created_by hiçbir zaman request body'den
   * kabul edilmez.
   *
   * Service authenticated actor'dan zorlar.
   */
  delete data.created_by;

  return data;
};

// ======================================================
// CONTROLLER
// ======================================================

export const powerOfAttorneyController = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const data =
        normalizePowerOfAttorneyBody(
          req.body
        );

      // ==================================================
      // POWER OF ATTORNEY
      // ==================================================

      const powerOfAttorney =
        await powerOfAttorneyService.create(
          data,
          access
        );

      // ==================================================
      // OPTIONAL DOCUMENT
      // ==================================================

      // ==================================================
// OPTIONAL DOCUMENT
// ==================================================

if (
  req.file
) {
  try {
    const documentData = {
      file:
        req.file,

      name:
        `${
          data.title ||
          powerOfAttorney.title ||
          'Vekaletname'
        } - Vekaletname`,

      description:
        data.description ||
        'Vekaletname belgesi',

      category:
        'general',

      power_of_attorney_id:
        powerOfAttorney.id,

      client_id:
        powerOfAttorney.client_id ||
        null,

      case_id:
        powerOfAttorney.case_id ||
        null,

      is_public:
        false,

      tags: [
        'vekaletname',
      ],
    };

    const savedDoc =
      await documentService.upload(
        documentData,
        req.user
      );

    logger.info(
      'Vekaletname belgesi yüklendi',
      {
        powerOfAttorneyId:
          powerOfAttorney.id,

        documentId:
          savedDoc.id,

        userId:
          req.user.id,
      }
    );
  } catch (
    docError
  ) {
    logger.error(
      'Vekaletname belge yükleme hatası',
      {
        powerOfAttorneyId:
          powerOfAttorney.id,

        userId:
          req.user.id,

        message:
          docError.message,
      }
    );

    return res
      .status(201)
      .json({
        success:
          true,

        message:
          'Vekaletname oluşturuldu ama belge yüklenemedi',

        data:
          powerOfAttorney,

        warning:
          docError.message ||
          'Belge yüklenirken bir hata oluştu',
      });
  }
}

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            'Vekaletname başarıyla oluşturuldu',

          data:
            powerOfAttorney,
        });
    } catch (error) {
      logger.error(
        'Vekaletname oluşturma hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        page = 1,
        limit = 10,
        client_id,
        case_id,
        status,
        search,
      } =
        req.query;

      const result =
        await powerOfAttorneyService
          .findAll({
            page,
            limit,
            client_id,
            case_id,
            status,
            search,

            userId:
              access.userId,

            canViewAllPowerOfAttorney:
              access
                .canViewAllPowerOfAttorney,

            canViewAllCases:
              access.canViewAllCases,
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Vekaletnameler başarıyla getirildi',

          data:
            result,
        });
    } catch (error) {
      logger.error(
        'Vekaletnameler getirme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
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
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        id,
      } =
        req.params;

      const powerOfAttorney =
        await powerOfAttorneyService.findOne(
          id,
          access
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Vekaletname başarıyla getirildi',

          data:
            powerOfAttorney,
        });
    } catch (error) {
      logger.error(
        'Vekaletname getirme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error,
            404
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async findByClient(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        clientId,
      } =
        req.params;

      const powerOfAttorneys =
        await powerOfAttorneyService
          .findByClient(
            clientId,
            access
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Müvekkile ait vekaletnameler getirildi',

          data:
            powerOfAttorneys,
        });
    } catch (error) {
      logger.error(
        'Müvekkil vekaletnameleri getirme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        id,
      } =
        req.params;

      const data =
        normalizePowerOfAttorneyBody(
          req.body
        );

      const powerOfAttorney =
        await powerOfAttorneyService.update(
          id,
          data,
          access
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Vekaletname başarıyla güncellendi',

          data:
            powerOfAttorney,
        });
    } catch (error) {
      logger.error(
        'Vekaletname güncelleme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
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
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        id,
      } =
        req.params;

      await powerOfAttorneyService.delete(
        id,
        access
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Vekaletname başarıyla silindi',

          data:
            null,
        });
    } catch (error) {
      logger.error(
        'Vekaletname silme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error,
            404
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ====================================================
  // STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const {
        id,
      } =
        req.params;

      const {
        status,
      } =
        req.body;

      if (!status) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Vekaletname durumu gereklidir',
          });
      }

      const powerOfAttorney =
        await powerOfAttorneyService
          .updateStatus(
            id,
            status,
            access
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'Durum başarıyla güncellendi',

          data:
            powerOfAttorney,
        });
    } catch (error) {
      logger.error(
        'Vekaletname durum güncelleme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    req,
    res
  ) {
    try {
      const access =
        getPowerOfAttorneyAccessContext(
          req.user
        );

      const stats =
        await powerOfAttorneyService
          .getStatistics(
            access
          );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            'İstatistikler başarıyla getirildi',

          data:
            stats,
        });
    } catch (error) {
      logger.error(
        'Vekaletname istatistik getirme hatası',
        {
          userId:
            req.user?.id,

          message:
            error.message,
        }
      );

      return res
        .status(
          getHttpStatusFromError(
            error
          )
        )
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  },
};

export default powerOfAttorneyController;
