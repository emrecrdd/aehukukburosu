import {
  clientService,
} from './client.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

// ======================================================
// HELPERS
// ======================================================

const getHttpStatusFromError = (
  error,
  fallback = 400
) => {
  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();

  /*
   * BOLA tarafında yetkisiz kayıt da
   * "not found" döndüğü için 404 korunur.
   *
   * Böylece kayıt varlığı sızdırılmaz.
   */
  if (
    message.includes(
      'not found'
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      'yetkiniz'
    ) ||
    message.includes(
      'forbidden'
    )
  ) {
    return 403;
  }

  if (
    message.includes(
      'unauthorized'
    )
  ) {
    return 401;
  }

  return fallback;
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

const createAuditLog = async ({
  req,
  action,
  entityId,
  description,
}) => {
  try {
    await AuditLog.create({
      action,

      entity_type:
        'client',

      entity_id:
        entityId,

      user_id:
        req.user.id,

      description,

      /*
       * Render proxy arkasında doğrulanmış
       * gerçek client IP tercih edilir.
       */
      ip_address:
        getAuditIp(
          req
        ),

      user_agent:
        req.headers[
          'user-agent'
        ],
    });
  } catch (
    auditError
  ) {
    /*
     * Audit log hatası ana business işlemini
     * başarısız göstermesin.
     */
    logger.error(
      'Client audit log error:',
      auditError
    );
  }
};

// ======================================================
// CONTROLLER
// ======================================================

export const clientController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      /*
       * created_by request body'ye eklenmiyor.
       *
       * Service authenticated actor ID'sini
       * kendisi kullanıyor.
       */
      const client =
        await clientService.create(
          req.body,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          client.id,

        description:
          `"${client.name}" müvekkil kaydı oluşturuldu`,
      });

      return successResponse(
        res,
        client,
        'Müvekkil başarıyla oluşturuldu',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Create client error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          400
        )
      );
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
      const {
        page = 1,
        limit = 10,
        search,
        status,
        client_type,
        tags,
        city,
      } = req.query;

      const result =
        await clientService.findAll({
          page,
          limit,
          search,
          status,
          client_type,
          tags,
          city,

          /*
           * Query-level BOLA scope.
           */
          actor:
            req.user,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Müvekkiller başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get clients error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          400
        )
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
      const client =
        await clientService.findOne(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        client,
        'Müvekkil başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          404
        )
      );
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
      const client =
        await clientService.update(
          req.params.id,
          req.body,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          client.id,

        description:
          `"${client.name}" müvekkil kaydı güncellendi`,
      });

      return successResponse(
        res,
        client,
        'Müvekkil başarıyla güncellendi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update client error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          400
        )
      );
    }
  },

  // ====================================================
  // REMOVE
  //
  // Client paranoid:true olduğu için soft-delete.
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      /*
       * Service hem authorization kontrolünü yapar
       * hem client kaydını döndürür.
       *
       * Ayrı findOne sorgusu gerekmiyor.
       */
      const client =
        await clientService.remove(
          req.params.id,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          client.id,

        description:
          `"${client.name}" müvekkil kaydı soft-delete ile kaldırıldı`,
      });

      return successResponse(
        res,
        null,
        'Müvekkil kaydı kaldırıldı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete client error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          400
        )
      );
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
      /*
       * İstatistikler artık global değil,
       * actor'ın erişebildiği kayıtlar üzerinden.
       */
      const stats =
        await clientService.getStatistics(
          req.user
        );

      return successResponse(
        res,
        stats,
        'Müvekkil istatistikleri başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          400
        )
      );
    }
  },

  // ====================================================
  // CASE HISTORY
  // ====================================================

  async getCaseHistory(
    req,
    res
  ) {
    try {
      const cases =
        await clientService.getCaseHistory(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        cases,
        'Müvekkil dava geçmişi başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client case history error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  // ====================================================
  // PAYMENTS
  // ====================================================

  async getPayments(
    req,
    res
  ) {
    try {
      const payments =
        await clientService.getPayments(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        payments,
        'Müvekkil ödemeleri başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client payments error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    req,
    res
  ) {
    try {
      const notes =
        await clientService.getNotes(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        notes,
        'Müvekkil notları başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client notes error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },
};