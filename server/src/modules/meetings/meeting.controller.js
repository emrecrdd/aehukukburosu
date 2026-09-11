import {
  meetingService,
} from './meeting.service.js';

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


const getMeetingErrorMessage = (
  error,
  fallback =
    'İşlem gerçekleştirilemedi'
) => {
  const validationMessage =
    Array.isArray(
      error?.errors
    )
      ? error.errors
          .map(
            (item) =>
              String(
                item?.message ||
                ''
              ).trim()
          )
          .find(
            Boolean
          )
      : '';

  if (
    validationMessage
  ) {
    return validationMessage;
  }

  const rawMessage =
    String(
      error?.message ||
      ''
    ).trim();

  if (!rawMessage) {
    return fallback;
  }

  const normalized =
    rawMessage.toLocaleLowerCase(
      'tr-TR'
    );

  if (
    normalized.includes(
      'meeting not found'
    )
  ) {
    return 'Toplantı kaydı bulunamadı.';
  }

  if (
    normalized.includes(
      'case not found'
    )
  ) {
    return 'Seçilen dava bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    normalized.includes(
      'client not found'
    )
  ) {
    return 'Seçilen müvekkil bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    normalized.includes(
      'consultation not found'
    )
  ) {
    return 'Seçilen danışmanlık bulunamadı veya bu kayda erişim yetkiniz yok.';
  }

  if (
    normalized.includes(
      'user not found'
    ) ||
    normalized.includes(
      'assignee not found'
    )
  ) {
    return 'Seçilen sorumlu kullanıcı bulunamadı veya artık erişilebilir değil.';
  }

  if (
    normalized.includes(
      'forbidden'
    ) ||
    normalized.includes(
      'unauthorized'
    ) ||
    normalized.includes(
      'permission denied'
    ) ||
    normalized.includes(
      'access denied'
    )
  ) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  }

  if (
    normalized.includes(
      'invalid meeting status'
    ) ||
    normalized.includes(
      'invalid status'
    )
  ) {
    return 'Geçerli bir toplantı durumu seçilmelidir.';
  }

  if (
    normalized.includes(
      'invalid meeting type'
    ) ||
    normalized.includes(
      'invalid meeting_type'
    )
  ) {
    return 'Geçerli bir toplantı türü seçilmelidir.';
  }

  if (
    /validation error:\s*/i.test(
      rawMessage
    )
  ) {
    const cleaned =
      rawMessage.replace(
        /^validation error:\s*/i,
        ''
      ).trim();

    if (
      cleaned &&
      !/validation\s+(?:len|notempty|is_in|isin|notnull)/i.test(
        cleaned
      )
    ) {
      return cleaned;
    }

    return 'Toplantı bilgileri doğrulanamadı. Lütfen formdaki alanları kontrol edin.';
  }

  if (
    /sequelize|constraint|foreign key|duplicate key|invalid input syntax|not-null violation|cannot read propert|stack trace|internal server error|econn|socket|request failed with status code/i.test(
      rawMessage
    )
  ) {
    return 'Toplantı işlemi tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.';
  }

  /*
   * Service katmanında bilinçli olarak üretilmiş Türkçe
   * iş kuralı mesajlarını kullanıcıya gösterebiliriz.
   */
  if (
    /[çğıöşüİ]/u.test(
      rawMessage
    ) ||
    /\b(toplantı|tarih|müvekkil|dava|danışmanlık|yetki|katılımcı|bağlantı|kullanıcı)\b/i.test(
      rawMessage
    )
  ) {
    return rawMessage;
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

const getMeetingAccessContext = (
  user
) => {
  return {
    userId:
      user.id,

    /*
     * VIEW_ALL_MEETINGS permission setinde yoksa
     * fail-closed davranır.
     *
     * Admin tam erişimli kalır.
     */
    canViewAllMeetings:
      user?.role === 'admin' ||
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_MEETINGS
      ),

    canViewAllCases:
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CASES
      ),

    canViewConsultations:
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_CONSULTATIONS
      ),

    canViewAllConsultations:
      user?.role === 'admin' ||
      hasOptionalPermission(
        user,
        PERMISSION_KEYS.VIEW_ALL_CONSULTATIONS
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
        'meeting',

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
     * Ancak loglarda görünür olsun.
     */
    logger.error(
      'Meeting audit log error:',
      error
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
 * Meeting modelindeki tarih alanının adı projede
 * farklı olabilir.
 *
 * Aşağıdaki sıra mevcut/yaygın alan isimlerini
 * güvenli şekilde destekler.
 *
 * İlk bulunan dolu değer kullanılır.
 */
const getMeetingStart = (
  meeting
) => {
  return (
    meeting?.start_date ||
    meeting?.start_time ||
    meeting?.meeting_date ||
    meeting?.scheduled_at ||
    meeting?.date ||
    null
  );
};

const getMeetingEnd = (
  meeting
) => {
  return (
    meeting?.end_date ||
    meeting?.end_time ||
    null
  );
};

const getMeetingLocation = (
  meeting
) => {
  return (
    meeting?.location ||
    meeting?.meeting_location ||
    meeting?.address ||
    ''
  );
};

// ======================================================
// CONTROLLER
// ======================================================

export const meetingController = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const access =
        getMeetingAccessContext(
          req.user
        );

      /*
       * created_by service tarafından actor'dan
       * zorlanır.
       */
      const meeting =
        await meetingService.create(
          req.body,
          access
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantısı oluşturuldu`,
      });

      return successResponse(
        res,
        meeting,
        'Toplantı başarıyla oluşturuldu',
        201
      );
    } catch (error) {
      logger.error(
        'Create meeting error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı oluşturulamadı'
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
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        page = 1,
        limit = 10,
        search,
        status,
        meeting_type,
        case_id,
        client_id,
        assigned_to,
        start_date,
        end_date,
      } = req.query;

      const result =
        await meetingService.findAll({
          page,
          limit,
          search,
          status,
          meeting_type,
          case_id,
          client_id,
          assigned_to,
          start_date,
          end_date,

          userId:
            access.userId,

          canViewAllMeetings:
            access.canViewAllMeetings,

          canViewAllCases:
            access.canViewAllCases,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Toplantılar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get meetings error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantılar getirilemedi'
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
        getMeetingAccessContext(
          req.user
        );

      const meeting =
        await meetingService.findOne(
          req.params.id,
          access
        );

      return successResponse(
        res,
        meeting,
        'Toplantı başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get meeting error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı getirilemedi'
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
        getMeetingAccessContext(
          req.user
        );

      /*
       * Normal toplantı detayında kullanılan service
       * metodunu kullanıyoruz.
       *
       * Böylece ICS indirme de record-level BOLA
       * kontrolünden geçer.
       */
      const meeting =
        await meetingService.findOne(
          req.params.id,
          access
        );

      const start =
        getMeetingStart(
          meeting
        );

      const end =
        getMeetingEnd(
          meeting
        );

      if (!start) {
        return errorResponse(
          res,
          'Toplantının takvime eklenebilmesi için tarih bilgisi gereklidir',
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

      /*
       * Tam gün etkinlikte end değeri DATEONLY değilse
       * göndermiyoruz.
       *
       * ICS util başlangıç tarihinden sonraki günü
       * otomatik DTEND yapar.
       */
      const safeEnd =
        allDay
          ? (
              isDateOnly(
                end
              )
                ? end
                : null
            )
          : end;

      // ==================================================
      // DESCRIPTION
      // ==================================================

      const descriptionParts =
        [];

      descriptionParts.push(
        'Derkenar toplantı kaydı'
      );

      if (
        meeting.description
      ) {
        descriptionParts.push(
          '',
          String(
            meeting.description
          ).trim()
        );
      }

      if (
        meeting.meeting_type
      ) {
        descriptionParts.push(
          '',
          `Toplantı Türü: ${meeting.meeting_type}`
        );
      }

      if (
        meeting.case
      ) {
        const caseParts = [
          meeting.case
            .case_number,

          meeting.case
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
        meeting.client
      ) {
        const clientName =
          meeting.client.name ||
          [
            meeting.client
              .first_name,

            meeting.client
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

      // ==================================================
      // CREATE ICS
      // ==================================================

      const icsContent =
        createIcsEvent({
          entityType:
            'meeting',

          entityId:
            meeting.id,

          title:
            `Toplantı: ${meeting.title}`,

          description:
            descriptionParts.join(
              '\n'
            ),

          location:
            getMeetingLocation(
              meeting
            ),

          start,

          end:
            safeEnd,

          allDay,

          calendarName:
            'Derkenar Toplantıları',

          status:
            meeting.status ===
              'cancelled'
              ? 'CANCELLED'
              : 'CONFIRMED',
        });

      const fileName =
        createIcsFileName(
          `derkenar-toplanti-${meeting.title}`
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
       * Dava / müvekkil bilgileri içerebileceği için
       * cache'e alınmasını istemiyoruz.
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
        'Download meeting calendar error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı takvim dosyası oluşturulamadı'
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
        getMeetingAccessContext(
          req.user
        );

      const meeting =
        await meetingService.update(
          req.params.id,
          req.body,
          access
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantısı güncellendi`,
      });

      return successResponse(
        res,
        meeting,
        'Toplantı başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update meeting error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı güncellenemedi'
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
        getMeetingAccessContext(
          req.user
        );

      /*
       * Service record-level erişimi kontrol eder ve
       * silinen meeting'i geri döndürür.
       *
       * Önceden ayrı findOne çağrısına gerek yok.
       */
      const meeting =
        await meetingService.remove(
          req.params.id,
          access
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantısı silindi`,
      });

      return successResponse(
        res,
        null,
        'Toplantı başarıyla silindi'
      );
    } catch (error) {
      logger.error(
        'Delete meeting error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı silinemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // MY MEETINGS
  // ====================================================

  async getMyMeetings(
    req,
    res
  ) {
    try {
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        page = 1,
        limit = 25,
        include_completed,
      } = req.query;

      const result =
        await meetingService.getMyMeetings(
          req.user.id,
          {
            page,
            limit,

            includeCompleted:
              include_completed ===
              'true',
          },
          access
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Toplantılarınız başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get my meetings error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantılarınız getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // BY CASE
  // ====================================================

  async getByCase(
    req,
    res
  ) {
    try {
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        page = 1,
        limit = 25,
      } = req.query;

      const result =
        await meetingService.getByCase(
          req.params.caseId,
          {
            page,
            limit,
          },
          access
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Davaya ait toplantılar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get case meetings error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Davaya ait toplantılar getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async getByClient(
    req,
    res
  ) {
    try {
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        page = 1,
        limit = 25,
      } = req.query;

      const result =
        await meetingService.getByClient(
          req.params.clientId,
          {
            page,
            limit,
          },
          access
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Müvekkile ait toplantılar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get client meetings error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Müvekkile ait toplantılar getirilemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // CLIENT COCKPIT TIMELINE
  // ====================================================

  async getClientTimeline(
    req,
    res
  ) {
    try {
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        upcoming_limit = 5,
        recent_limit = 5,
      } = req.query;

      const timeline =
        await meetingService.getClientTimeline(
          req.params.clientId,
          {
            upcomingLimit:
              upcoming_limit,

            recentLimit:
              recent_limit,
          },
          access
        );

      return successResponse(
        res,
        timeline,
        'Müvekkil toplantı zaman çizelgesi başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get client meeting timeline error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Müvekkil toplantı zaman çizelgesi getirilemedi'
        ),
        getHttpStatusFromError(
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
      const access =
        getMeetingAccessContext(
          req.user
        );

      const {
        limit = 5,
      } = req.query;

      const meetings =
        await meetingService.getUpcoming(
          req.user.id,
          limit,
          access
        );

      return successResponse(
        res,
        meetings,
        'Yaklaşan toplantılar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get upcoming meetings error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Yaklaşan toplantılar getirilemedi'
        ),
        getHttpStatusFromError(
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
      } = req.body;

      if (!status) {
        return errorResponse(
          res,
          'Toplantı durumu zorunludur',
          400
        );
      }

      const access =
        getMeetingAccessContext(
          req.user
        );

      const meeting =
        await meetingService.updateStatus(
          req.params.id,
          status,
          access
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantı durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        meeting,
        'Toplantı durumu başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update meeting status error:',
        error
      );

      return errorResponse(
        res,
        getMeetingErrorMessage(
          error,
          'Toplantı durumu güncellenemedi'
        ),
        getHttpStatusFromError(
          error
        )
      );
    }
  },
};

export default meetingController;
