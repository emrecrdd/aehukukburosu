import {
  auditLogService,
} from './audit-log.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  hasPermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const getAuditAccessContext =
  (
    user
  ) => ({
    actorId:
      user?.id ||
      null,

    canViewConsultations:
      hasPermission(
        user,
        PERMISSION_KEYS
          .VIEW_CONSULTATIONS
      ),

    canViewAllConsultations:
      user?.role ===
        'admin' ||
      hasPermission(
        user,
        PERMISSION_KEYS
          .VIEW_ALL_CONSULTATIONS
      ),
  });

const getAuditErrorStatus =
  (
    error,
    fallback = 400
  ) => {
    const status =
      Number(
        error?.statusCode
      );

    return (
      Number.isInteger(
        status
      ) &&
      status >=
        400 &&
      status <=
        599
    )
      ? status
      : fallback;
  };

export const auditLogController = {
  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        action,
        entity_type,
        entity_id,
        startDate,
        endDate,
        search,
      } =
        req.query;

      const result =
        await auditLogService.findAll({
          page,
          limit,
          action,
          entity_type,
          entity_id,
          startDate,
          endDate,
          search,
          ...getAuditAccessContext(
            req.user
          ),
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Loglar başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get audit logs error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getAuditErrorStatus(
          error
        )
      );
    }
  },

  async findOne(
    req,
    res
  ) {
    try {
      const log =
        await auditLogService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        log,
        'Log başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get audit log error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  async remove(
    req,
    res
  ) {
    try {
      await auditLogService.remove(
        req.params.id
      );

      return successResponse(
        res,
        null,
        'Log başarıyla silindi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete audit log error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async removeMany(
    req,
    res
  ) {
    try {
      const {
        ids,
      } =
        req.body;

      if (
        !ids ||
        !Array.isArray(
          ids
        ) ||
        ids.length ===
          0
      ) {
        return errorResponse(
          res,
          'Lütfen silinecek logları seçin',
          400
        );
      }

      const result =
        await auditLogService.removeMany(
          ids
        );

      return successResponse(
        res,
        result,
        `${result.deletedCount} log başarıyla silindi`
      );
    } catch (
      error
    ) {
      logger.error(
        'Bulk delete audit logs error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async cleanOldLogs(
    req,
    res
  ) {
    try {
      const {
        days = 30,
      } =
        req.query;

      const result =
        await auditLogService.cleanOldLogs(
          parseInt(
            days
          )
        );

      return successResponse(
        res,
        result,
        `${result.deletedCount} eski log silindi`
      );
    } catch (
      error
    ) {
      logger.error(
        'Clean old logs error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};
