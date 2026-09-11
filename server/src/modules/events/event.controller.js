import {
  eventService,
} from './event.service.js';

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


const isLikelyTechnicalEventMessage = (
  value
) => {
  const message =
    String(
      value ||
      ''
    ).trim();

  if (!message) {
    return false;
  }

  return /sequelize|validation error|constraint|foreign key|unique constraint|notnull|not null|invalid input syntax|uuid|database|sql|column|relation .* does not exist|syntax error|axioserror|network error|request failed with status code|econn|etimedout|timeout|cannot read properties|typeerror|referenceerror|stack trace|internal server error/i.test(
    message
  );
};

const isSafeTurkishEventMessage = (
  value
) => {
  const message =
    String(
      value ||
      ''
    ).trim();

  if (
    !message ||
    isLikelyTechnicalEventMessage(
      message
    )
  ) {
    return false;
  }

  return /[çğıöşüÇĞİÖŞÜ]|duruşma|etkinlik|başlangıç|bitiş|tarih|avukat|kullanıcı|dava|katılımcı|durum|masraf|harç|erişim|yetki|bulunamadı|gereklidir|geçersiz|atanan/i.test(
    message
  );
};

const getSafeEventErrorMessage = (
  error,
  fallback =
    'İşlem tamamlanamadı'
) => {
  const status =
    getHttpStatusFromError(
      error
    );

  const rawMessage =
    String(
      error?.message ||
      ''
    ).trim();

  /*
   * Service katmanındaki Türkçe business-rule mesajlarını
   * kullanıcıya aynen taşıyoruz.
   */
  if (
    isSafeTurkishEventMessage(
      rawMessage
    )
  ) {
    return rawMessage;
  }

  if (
    rawMessage
      .toLowerCase() ===
    'event not found'
  ) {
    return 'Duruşma / etkinlik bulunamadı veya artık erişilebilir değil';
  }

  if (status === 401) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Bu işlem için gerekli yetkiye sahip değilsiniz';
  }

  if (status === 404) {
    return 'Duruşma / etkinlik bulunamadı veya artık erişilebilir değil';
  }

  if (status >= 500) {
    return 'Sunucu tarafında geçici bir sorun oluştu. Lütfen tekrar deneyin.';
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

const getEventAccessContext = (
  user
) => {
  return {
    userId:
      user.id,

    /*
     * VIEW_ALL_EVENTS henüz permission setinde yoksa
     * fail-closed davranır. Admin zaten tam erişimlidir.
     */
    canViewAllEvents:
      user?.role === 'admin' ||
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_EVENTS
      ),

    canViewAllCases:
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),
  };
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
        'event',

      entity_id:
        entityId,

      user_id:
        req.user.id,

      description,

      ip_address:
        req.realClientIp ||
        req.ip,

      user_agent:
        req.headers[
          'user-agent'
        ],
    });
  } catch (auditError) {
    /*
     * Audit log hatası ana işlemi bozmasın.
     */
    logger.error(
      'Event audit log error:',
      auditError
    );
  }
};

// ======================================================
// CALENDAR HELPERS
// ======================================================

const isDateOnly = (
  value
) => {
  return (
    typeof value ===
      'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  );
};

/*
 * Event kayıtlarında farklı isimlendirmeler varsa
 * geriye dönük uyumluluk için birkaç alanı
 * destekliyoruz.
 *
 * Ana tercih start_date / end_date.
 */
const getEventStart = (
  event
) => {
  return (
    event?.start_date ||
    event?.event_date ||
    event?.scheduled_at ||
    event?.date ||
    null
  );
};

const getEventEnd = (
  event
) => {
  return (
    event?.end_date ||
    null
  );
};

const getEventLocation = (
  event
) => {
  return (
    event?.location ||
    event?.court_name ||
    event?.court ||
    event?.address ||
    ''
  );
};

/*
 * Tam gün etkinliklerde ICS DTEND bitiş gününü
 * "exclusive" kabul eder.
 *
 * Aynı gün başlangıç/bitiş gelmişse util'in
 * otomatik +1 gün üretmesine izin veriyoruz.
 */
const getSafeAllDayEnd = ({
  start,
  end,
}) => {
  if (
    !isDateOnly(start) ||
    !isDateOnly(end)
  ) {
    return null;
  }

  if (
    end <= start
  ) {
    return null;
  }

  return end;
};

// ======================================================
// CONTROLLER
// ======================================================

export const eventController = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const access =
        getEventAccessContext(
          req.user
        );

      const event =
        await eventService.create(
          req.body,
          access
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } oluşturuldu`,
      });

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla oluşturuldu',
        201
      );
    } catch (error) {
      logger.error(
        'Create event error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik oluşturulamadı'
        ),
        getHttpStatusFromError(
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
        case_id,
        status,
        event_type,
        assigned_to,
        start_date,
        end_date,
      } = req.query;

      const access =
        getEventAccessContext(
          req.user
        );

      const result =
        await eventService.findAll({
          page,
          limit,
          case_id,
          status,
          event_type,
          assigned_to,
          start_date,
          end_date,

          userId:
            access.userId,

          canViewAllEvents:
            access.canViewAllEvents,

          canViewAllCases:
            access.canViewAllCases,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Duruşma / etkinlik kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get events error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik kayıtları getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // CALENDAR
  // ====================================================

  async getCalendarEvents(
    req,
    res
  ) {
    try {
      const {
        year,
        month,
      } = req.query;

      const currentYear =
        year ||
        new Date()
          .getFullYear();

      const currentMonth =
        month ||
        new Date()
          .getMonth() +
          1;

      const access =
        getEventAccessContext(
          req.user
        );

      const events =
        await eventService
          .getCalendarEvents(
            req.user.id,
            {
              year:
                Number.parseInt(
                  currentYear,
                  10
                ),

              month:
                Number.parseInt(
                  currentMonth,
                  10
                ),
            },
            access
          );

      return successResponse(
        res,
        events,
        'Takvim kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get calendar events error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Takvim kayıtları getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // MY EVENTS
  // ====================================================

  async getMyEvents(
    req,
    res
  ) {
    try {
      const access =
        getEventAccessContext(
          req.user
        );

      const events =
        await eventService
          .getMyEvents(
            req.user.id,
            access
          );

      return successResponse(
        res,
        events,
        'Kullanıcıya ait duruşma / etkinlik kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get my events error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Kullanıcıya ait duruşma / etkinlik kayıtları getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // CASE EVENTS
  // ====================================================

  async getByCase(
    req,
    res
  ) {
    try {
      const access =
        getEventAccessContext(
          req.user
        );

      const events =
        await eventService.getByCase(
          req.params.caseId,
          access
        );

      return successResponse(
        res,
        events,
        'Davaya ait duruşmalar getirildi'
      );
    } catch (error) {
      logger.error(
        'Get case events error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Davaya ait duruşmalar getirilemedi'
        ),
        getHttpStatusFromError(
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
        getEventAccessContext(
          req.user
        );

      const event =
        await eventService.findOne(
          req.params.id,
          access
        );

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get event error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik getirilemedi'
        ),
        getHttpStatusFromError(
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
      const access =
        getEventAccessContext(
          req.user
        );

      /*
       * Normal event detayındaki record-level erişim
       * kontrolünü aynen kullanıyoruz.
       */
      const event =
        await eventService.findOne(
          req.params.id,
          access
        );

      const start =
        getEventStart(
          event
        );

      const end =
        getEventEnd(
          event
        );

      if (!start) {
        return errorResponse(
          res,
          'Duruşma / etkinliğin takvime eklenebilmesi için tarih bilgisi gereklidir',
          400
        );
      }

      // ==================================================
      // ALL DAY
      // ==================================================

      const allDay =
        isDateOnly(
          start
        );

      const safeEnd =
        allDay
          ? getSafeAllDayEnd({
              start,
              end,
            })
          : end;

      // ==================================================
      // DESCRIPTION
      // ==================================================

      const descriptionParts =
        [];

      const isHearing =
        event.event_type ===
        'hearing';

      descriptionParts.push(
        isHearing
          ? 'Derkenar duruşma kaydı'
          : 'Derkenar etkinlik kaydı'
      );

      if (
        event.description
      ) {
        descriptionParts.push(
          '',
          String(
            event.description
          ).trim()
        );
      }

      if (
        event.event_type
      ) {
        descriptionParts.push(
          '',
          `Tür: ${event.event_type}`
        );
      }

      if (
        event.case
      ) {
        const caseParts = [
          event.case
            .case_number,

          event.case
            .title,
        ].filter(
          Boolean
        );

        if (
          caseParts.length >
          0
        ) {
          descriptionParts.push(
            `Dava: ${caseParts.join(
              ' - '
            )}`
          );
        }
      }

      if (
        event.client
      ) {
        const clientName =
          event.client.name ||
          [
            event.client
              .first_name,

            event.client
              .last_name,
          ]
            .filter(
              Boolean
            )
            .join(' ')
            .trim();

        if (
          clientName
        ) {
          descriptionParts.push(
            `Müvekkil: ${clientName}`
          );
        }
      }

      if (
        event.notes
      ) {
        descriptionParts.push(
          '',
          `Not: ${String(
            event.notes
          ).trim()}`
        );
      }

      // ==================================================
      // CREATE ICS
      // ==================================================

      const icsContent =
        createIcsEvent({
          entityType:
            isHearing
              ? 'hearing'
              : 'event',

          entityId:
            event.id,

          title:
            `${
              isHearing
                ? 'Duruşma'
                : 'Etkinlik'
            }: ${event.title}`,

          description:
            descriptionParts.join(
              '\n'
            ),

          location:
            getEventLocation(
              event
            ),

          start,

          end:
            safeEnd,

          allDay,

          calendarName:
            isHearing
              ? 'Derkenar Duruşmaları'
              : 'Derkenar Etkinlikleri',

          status:
            event.status ===
              'cancelled'
              ? 'CANCELLED'
              : 'CONFIRMED',
        });

      const fileName =
        createIcsFileName(
          `derkenar-${
            isHearing
              ? 'durusma'
              : 'etkinlik'
          }-${event.title}`
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
        'Download event calendar error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik takvim dosyası oluşturulamadı'
        ),
        getHttpStatusFromError(
          error
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
      const access =
        getEventAccessContext(
          req.user
        );

      const event =
        await eventService.update(
          req.params.id,
          req.body,
          access
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } güncellendi`,
      });

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update event error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik güncellenemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
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
      const {
        status,
      } =
        req.body || {};

      if (!status) {
        return errorResponse(
          res,
          'Etkinlik durumu gereklidir',
          400
        );
      }

      const access =
        getEventAccessContext(
          req.user
        );

      const event =
        await eventService
          .updateStatus(
            req.params.id,
            status,
            access
          );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          event.id,

        description:
          `"${event.title}" durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        event,
        'Durum başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update event status error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Durum güncellenemedi'
        ),
        getHttpStatusFromError(
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
        getEventAccessContext(
          req.user
        );

      const event =
        await eventService.remove(
          req.params.id,
          access
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } silindi`,
      });

      return successResponse(
        res,
        null,
        'Duruşma / etkinlik silindi'
      );
    } catch (error) {
      logger.error(
        'Delete event error:',
        error
      );

      return errorResponse(
        res,
        getSafeEventErrorMessage(
          error,
          'Duruşma / etkinlik silinemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },
};

export default eventController;
