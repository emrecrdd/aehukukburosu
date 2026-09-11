import {
  taskService,
} from './task.service.js';

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

import {
  AuditLog,
} from '../../models/AuditLog.js';

import {
  createIcsEvent,
  createIcsFileName,
} from '../../utils/ics.util.js';

// ======================================================
// HELPERS
// ======================================================

const createAuditLog = async ({
  req,
  action,
  entityType = 'task',
  entityId,
  description,
}) => {
  try {
    await AuditLog.create({
      action,

      entity_type:
        entityType,

      entity_id:
        entityId,

      user_id:
        req.user.id,

      description,

     ip_address:
  req.realClientIp ||
  req.ip ||
  null,

      user_agent:
        req.headers[
          'user-agent'
        ],
    });
  } catch (error) {
    /*
     * Audit log hatası ana işlemi bozmasın.
     */
    logger.error(
      'Task audit log error:',
      error
    );
  }
};

const getUserDisplayName = (
  user
) => {
  if (!user) {
    return 'Sistem';
  }

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    'Sistem'
  );
};

// ======================================================
// ASSIGNEE HELPERS
// ======================================================

const normalizeAssigneeIds = (
  value
) => {
  if (!value) {
    return [];
  }

  const values =
    Array.isArray(value)
      ? value
      : [value];

  return [
    ...new Set(
      values
        .map(
          (id) =>
            String(id).trim()
        )
        .filter(Boolean)
    ),
  ];
};

/*
 * Yeni request formatı:
 *
 * assignee_ids: [
 *   "uuid-1",
 *   "uuid-2"
 * ]
 *
 * Eski frontend geçiş sürecinde:
 *
 * assigned_to: "uuid-1"
 *
 * gönderirse onu da destekliyoruz.
 */
const getRequestedAssigneeIds = (
  body = {}
) => {
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'assignee_ids'
    )
  ) {
    return normalizeAssigneeIds(
      body.assignee_ids
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'assigned_to'
    )
  ) {
    return normalizeAssigneeIds(
      body.assigned_to
    );
  }

  return [];
};

// ======================================================
// ACCESS CONTEXT
// ======================================================

const getTaskAccessContext = (
  user
) => {
  return {
    userId:
      user.id,

    canViewAllTasks:
      hasPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_TASKS
      ),

    canViewAllCases:
      hasPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),

    canViewConsultations:
      hasPermission(
        user,
        PERMISSION_KEYS.VIEW_CONSULTATIONS
      ),

    canViewAllConsultations:
      hasPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS
      ),
  };
};

// ======================================================
// ERROR STATUS HELPER
// ======================================================

const getTaskErrorStatus = (
  error,
  fallback = 400
) => {
  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();

  if (
    message.includes(
      'not found'
    ) ||
    message.includes(
      'bulunamadı'
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      'erişim yetkiniz'
    ) ||
    message.includes(
      'yetkiniz bulunmuyor'
    ) ||
    message.includes(
      'permission'
    ) ||
    message.includes(
      'size atanmamış'
    )
  ) {
    return 403;
  }

  return fallback;
};

// ======================================================
// CONTROLLER
// ======================================================

export const taskController = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const canAssignTasks =
        hasPermission(
          req.user,
          PERMISSION_KEYS.ASSIGN_TASKS
        );

      const requestedAssigneeIds =
        getRequestedAssigneeIds(
          req.body
        );

      /*
       * ASSIGN_TASKS yetkisi olmayan kullanıcı
       * request'i elle değiştirerek başka kullanıcıya
       * görev atayamaz.
       *
       * Görev otomatik kendisine atanır.
       */
      const assigneeIds =
        canAssignTasks
          ? requestedAssigneeIds
          : [
              req.user.id,
            ];

      /*
       * Sistem / workflow alanları create request'i
       * üzerinden belirlenemez.
       *
       * assignee_ids Task tablosunun doğrudan kolonu
       * değildir. taskService ilişkileri oluşturur.
       */
      const {
        created_by,
        assigned_to,
        assignee_ids,
        status,
        progress,
        approved_by,
        approved_at,
        started_at,
        completed_at,
        actual_hours,
        ...safeBody
      } = req.body || {};

      const taskData = {
        ...safeBody,

        created_by:
          req.user.id,

        assignee_ids:
          assigneeIds,

        status:
          'pending',

        progress:
          0,
      };

      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.create(
          taskData,
          access
        );

      const assigneeCount =
        Array.isArray(
          task?.assignees
        )
          ? task.assignees.length
          : assigneeIds.length;

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi oluşturuldu${
            assigneeCount > 0
              ? ` ve ${assigneeCount} kullanıcıya atandı`
              : ''
          }`,
      });

      return successResponse(
        res,
        task,
        'Görev başarıyla oluşturuldu',
        201
      );
    } catch (error) {
      logger.error(
        'Create task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev oluşturulamadı',
        getTaskErrorStatus(
          error
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
        priority,

        /*
         * Query parametresi şimdilik geriye dönük
         * uyumluluk için assigned_to olarak kalıyor.
         *
         * Service bunu task_assignees üzerinden filtreler.
         */
        assigned_to,

        case_id,
        client_id,
      } = req.query;

      const access =
        getTaskAccessContext(
          req.user
        );

      const result =
        await taskService.findAll({
          page,
          limit,
          search,
          status,
          priority,
          assigned_to,
          case_id,
          client_id,

          userId:
            access.userId,

          canViewAllTasks:
            access.canViewAllTasks,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Görevler getirildi'
      );
    } catch (error) {
      logger.error(
        'Get tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görevler getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // CLIENT TASKS
  // ====================================================

  async getByClient(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 25,
        status,
      } = req.query;

      const access =
        getTaskAccessContext(
          req.user
        );

      const result =
        await taskService.getByClient(
          req.params.clientId,
          {
            page,
            limit,
            status,

            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,

            canViewAllCases:
              access.canViewAllCases,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Müvekkil görevleri getirildi'
      );
    } catch (error) {
      logger.error(
        'Get client tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Müvekkil görevleri getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // CLIENT OVERVIEW
  // ====================================================

  async getClientOverview(
    req,
    res
  ) {
    try {
      const {
        active_limit = 5,
        recent_limit = 5,
      } = req.query;

      const access =
        getTaskAccessContext(
          req.user
        );

      const overview =
        await taskService.getClientOverview(
          req.params.clientId,
          {
            activeLimit:
              active_limit,

            recentLimit:
              recent_limit,

            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,

            canViewAllCases:
              access.canViewAllCases,
          }
        );

      return successResponse(
        res,
        overview,
        'Müvekkil görev özeti getirildi'
      );
    } catch (error) {
      logger.error(
        'Get client task overview error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Müvekkil görev özeti getirilemedi',
        getTaskErrorStatus(
          error
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
      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.findOne(
          req.params.id,
          {
            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,
          }
        );

      return successResponse(
        res,
        task,
        'Görev getirildi'
      );
    } catch (error) {
      logger.error(
        'Get task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev getirilemedi',
        getTaskErrorStatus(
          error,
          404
        )
      );
    }
  },

  // ====================================================
  // DOWNLOAD CALENDAR / ICS
  // ====================================================

  async downloadCalendar(
    req,
    res
  ) {
    try {
      /*
       * Normal görev detayındaki record-level erişim
       * kontrolünü aynen kullanıyoruz.
       *
       * Görevi göremeyen kullanıcı ICS dosyasını da
       * indiremez.
       */
      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.findOne(
          req.params.id,
          {
            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,
          }
        );

      if (
        !task?.due_date
      ) {
        return errorResponse(
          res,
          'Görevin takvime eklenebilmesi için son tarih gereklidir',
          400
        );
      }

      // ==================================================
      // ALL DAY DETECTION
      // ==================================================

      /*
       * Sequelize DATEONLY kullanılıyorsa genellikle:
       *
       * 2026-08-25
       *
       * şeklinde string gelir.
       *
       * Bu durumda telefondaki takvimde tam gün
       * etkinliği olarak gösteriyoruz.
       *
       * DATE / timestamp ise saatli etkinlik olur.
       */
      const dueDate =
        task.due_date;

      const allDay =
        typeof dueDate ===
          'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
          dueDate.trim()
        );

      // ==================================================
      // DESCRIPTION
      // ==================================================

      const descriptionParts =
        [];

      descriptionParts.push(
        'Derkenar görev kaydı'
      );

      if (
        task.description
      ) {
        descriptionParts.push(
          '',
          String(
            task.description
          ).trim()
        );
      }

      if (
        task.case
      ) {
        const caseParts =
          [
            task.case
              .case_number,

            task.case
              .title,
          ].filter(
            Boolean
          );

        if (
          caseParts.length >
          0
        ) {
          descriptionParts.push(
            '',
            `Dava: ${caseParts.join(
              ' - '
            )}`
          );
        }
      }

      if (
        task.priority
      ) {
        descriptionParts.push(
          `Öncelik: ${task.priority}`
        );
      }

      // ==================================================
      // CREATE ICS
      // ==================================================

      const icsContent =
        createIcsEvent({
          entityType:
            'task',

          entityId:
            task.id,

          title:
            `Görev: ${task.title}`,

          description:
            descriptionParts.join(
              '\n'
            ),

          start:
            dueDate,

          allDay,

          calendarName:
            'Derkenar Görevleri',

          status:
            task.status ===
              'cancelled'
              ? 'CANCELLED'
              : 'CONFIRMED',
        });

      const fileName =
        createIcsFileName(
          `derkenar-gorev-${task.title}`
        );

      // ==================================================
      // RESPONSE
      // ==================================================

      res.setHeader(
        'Content-Type',
        'text/calendar; charset=utf-8'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );

      /*
       * Görev bilgisi kişisel / mesleki veri içerebilir.
       * Tarayıcı veya ara proxy tarafından uzun süreli
       * cache edilmesini istemiyoruz.
       */
      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      return res
        .status(200)
        .send(
          icsContent
        );
    } catch (error) {
      logger.error(
        'Download task calendar error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev takvim dosyası oluşturulamadı',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // UPDATE
  //
  // Assignment ve workflow alanları buradan
  // değiştirilemez.
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const {
        assigned_to,
        assignee_ids,
        created_by,
        status,
        progress,
        approved_by,
        approved_at,
        started_at,
        completed_at,
        actual_hours,
        ...safeUpdateData
      } = req.body || {};

      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.update(
          req.params.id,
          safeUpdateData,
          {
            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,

            canViewAllCases:
              access.canViewAllCases,

            canViewConsultations:
              access.canViewConsultations,

            canViewAllConsultations:
              access.canViewAllConsultations,
          }
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi güncellendi`,
      });

      return successResponse(
        res,
        task,
        'Görev başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev güncellenemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      const access =
        getTaskAccessContext(
          req.user
        );

      /*
       * Silmeden önce başlık audit log için alınır.
       * findOne record-level erişimi de kontrol eder.
       */
      const task =
        await taskService.findOne(
          req.params.id,
          {
            userId:
              access.userId,

            canViewAllTasks:
              access.canViewAllTasks,
          }
        );

      await taskService.remove(
        req.params.id,
        {
          userId:
            access.userId,

          canViewAllTasks:
            access.canViewAllTasks,
        }
      );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          req.params.id,

        description:
          `"${task.title}" görevi silindi`,
      });

      return successResponse(
        res,
        null,
        'Görev başarıyla silindi'
      );
    } catch (error) {
      logger.error(
        'Delete task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev silinemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const {
        status,
      } = req.body || {};

      if (!status) {
        return errorResponse(
          res,
          'Görev durumu gereklidir',
          400
        );
      }

      const access =
        getTaskAccessContext(
          req.user
        );

      const canManageAllTasks =
        access.canViewAllTasks;

      if (!canManageAllTasks) {
        return errorResponse(
          res,
          'Görev durumunu doğrudan değiştirme yetkiniz bulunmuyor',
          403
        );
      }

      const allowedStatuses = [
        'pending',
        'cancelled',
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return errorResponse(
          res,
          'Bu durum doğrudan değiştirilemez. Görev iş akışı kullanılmalıdır.',
          400
        );
      }

      const task =
        await taskService.updateStatus(
          req.params.id,
          status,
          access
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görev durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        task,
        'Görev durumu güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update task status error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev durumu güncellenemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // ASSIGN MULTIPLE USERS
  // ====================================================

  async assignTask(
    req,
    res
  ) {
    try {
      /*
       * Yeni format:
       *
       * {
       *   "assignee_ids": [
       *     "uuid-1",
       *     "uuid-2"
       *   ]
       * }
       *
       * Eski frontend:
       *
       * {
       *   "assigned_to": "uuid-1"
       * }
       *
       * gönderirse geçici olarak desteklenir.
       */
      const assigneeIds =
        getRequestedAssigneeIds(
          req.body
        );

      /*
       * Burada boş array'e izin vermiyoruz.
       *
       * İleride "tüm atamaları kaldır" özelliği
       * istersek ayrıca açık bir endpoint/işlem
       * tanımlamak daha güvenli olur.
       */
      if (
        assigneeIds.length ===
        0
      ) {
        return errorResponse(
          res,
          'En az bir atanacak kullanıcı gereklidir',
          400
        );
      }

      /*
       * Route zaten ASSIGN_TASKS permission'ı ile
       * korunuyor.
       */
      const assignedBy =
        getUserDisplayName(
          req.user
        );

      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.assignTask(
          req.params.id,
          assigneeIds,
          assignedBy,
          access
        );

      const assigneeCount =
        Array.isArray(
          task?.assignees
        )
          ? task.assignees.length
          : assigneeIds.length;

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi ${assigneeCount} kullanıcıya atandı`,
      });

      return successResponse(
        res,
        task,
        'Görev sorumluları başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Assign task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev atanamadı',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // MY TASKS
  // ====================================================

  async getMyTasks(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
      } = req.query;

      const result =
        await taskService.getMyTasks(
          req.user.id,
          {
            page,
            limit,
            status,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Görevlerim getirildi'
      );
    } catch (error) {
      logger.error(
        'Get my tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görevler getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // ASSIGNABLE USERS
  // ====================================================

  async getAssignableUsers(
    req,
    res
  ) {
    try {
      const users =
        await taskService.getAssignableUsers();

      return successResponse(
        res,
        users,
        'Görev atanabilir kullanıcılar getirildi'
      );
    } catch (error) {
      logger.error(
        'Get assignable users error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Kullanıcılar getirilemedi',
        getTaskErrorStatus(
          error
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
      const canViewAllTasks =
        hasPermission(
          req.user,
          PERMISSION_KEYS.VIEW_ALL_TASKS
        );

      const stats =
        await taskService.getStatistics(
          req.user.id,
          {
            canViewAllTasks,
          }
        );

      return successResponse(
        res,
        stats,
        'Görev istatistikleri getirildi'
      );
    } catch (error) {
      logger.error(
        'Get task statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev istatistikleri getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // OVERDUE
  // ====================================================

  async getOverdue(
    req,
    res
  ) {
    try {
      const tasks =
        await taskService.getOverdue(
          req.user.id
        );

      return successResponse(
        res,
        tasks,
        'Geciken görevler getirildi'
      );
    } catch (error) {
      logger.error(
        'Get overdue tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Geciken görevler getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    req,
    res
  ) {
    try {
      const tasks =
        await taskService.getUpcoming(
          req.user.id
        );

      return successResponse(
        res,
        tasks,
        'Yaklaşan görevler getirildi'
      );
    } catch (error) {
      logger.error(
        'Get upcoming tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Yaklaşan görevler getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // START
  // ====================================================

  async startTask(
    req,
    res
  ) {
    try {
      const task =
        await taskService.startTask(
          req.params.id,
          req.user.id
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi başlatıldı`,
      });

      return successResponse(
        res,
        task,
        'Görev başlatıldı'
      );
    } catch (error) {
      logger.error(
        'Start task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev başlatılamadı',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // COMPLETE
  // ====================================================

  async completeTask(
    req,
    res
  ) {
    try {
      const {
        note,
        actual_hours,
      } = req.body || {};

      const task =
        await taskService.completeTask(
          req.params.id,
          req.user.id,
          {
            note,
            actual_hours,
          }
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi tamamlanmaya gönderildi`,
      });

      return successResponse(
        res,
        task,
        'Görev tamamlandı ve onaya gönderildi'
      );
    } catch (error) {
      logger.error(
        'Complete task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev tamamlanamadı',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // APPROVE
  // ====================================================

  async approveTask(
    req,
    res
  ) {
    try {
      /*
       * Route zaten APPROVE_TASKS permission'ı ile
       * korunuyor.
       */
      const access =
        getTaskAccessContext(
          req.user
        );

      const task =
        await taskService.approveTask(
          req.params.id,
          req.user.id,
          access
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi onaylandı`,
      });

      return successResponse(
        res,
        task,
        'Görev onaylandı'
      );
    } catch (error) {
      logger.error(
        'Approve task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev onaylanamadı',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // ADD NOTE
  // ====================================================

  async addNote(
    req,
    res
  ) {
    try {
      const {
        content,
      } = req.body || {};

      if (
        !content?.trim()
      ) {
        return errorResponse(
          res,
          'Not içeriği gereklidir',
          400
        );
      }

      const note =
        await taskService.addNote(
          req.params.id,
          req.user.id,
          {
            content,
          }
        );

      const preview =
        String(
          note.content ||
          ''
        )
          .slice(
            0,
            50
          )
          .trim();

      await createAuditLog({
        req,

        action:
          'create',

        entityType:
          'note',

        entityId:
          note.id,

        description:
          `"${preview}${
            note.content?.length >
            50
              ? '...'
              : ''
          }" notu eklendi`,
      });

      return successResponse(
        res,
        note,
        'Not eklendi',
        201
      );
    } catch (error) {
      logger.error(
        'Add note error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Not eklenemedi',
        getTaskErrorStatus(
          error
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
      const access =
        getTaskAccessContext(
          req.user
        );

      const notes =
        await taskService.getNotes(
          req.params.id,
          req.user.id,
          {
            canViewAllTasks:
              access.canViewAllTasks,
          }
        );

      return successResponse(
        res,
        notes,
        'Notlar getirildi'
      );
    } catch (error) {
      logger.error(
        'Get notes error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Notlar getirilemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // PROGRESS
  // ====================================================

  async updateProgress(
    req,
    res
  ) {
    try {
      const {
        progress,
      } = req.body || {};

      if (
        progress ===
          undefined ||
        progress ===
          null
      ) {
        return errorResponse(
          res,
          'İlerleme değeri gereklidir',
          400
        );
      }

      const task =
        await taskService.updateProgress(
          req.params.id,
          req.user.id,
          progress
        );

      return successResponse(
        res,
        task,
        'İlerleme güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update progress error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'İlerleme güncellenemedi',
        getTaskErrorStatus(
          error
        )
      );
    }
  },
};

export default taskController;