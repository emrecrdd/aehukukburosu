import crypto from 'crypto';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import {
  google,
} from 'googleapis';

import {
  calendarIntegrationService,
} from './calendar-integration.service.js';

import {
  logger,
} from '../../config/logger.js';

dayjs.extend(
  utc
);

dayjs.extend(
  timezone
);

// ======================================================
// CONSTANTS
// ======================================================

const DEFAULT_TIME_ZONE =
  'Europe/Istanbul';

const DEFAULT_EVENT_DURATION_MINUTES =
  60;

// ======================================================
// HELPERS
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

const addOneDay = (
  dateValue
) => {
  return dayjs(
    dateValue
  )
    .add(
      1,
      'day'
    )
    .format(
      'YYYY-MM-DD'
    );
};

// ======================================================
// GOOGLE EVENT ID
// ======================================================

/*
 * Google Calendar event id:
 *
 * - 5 - 1024 karakter
 * - base32hex karakter setine uygun olmalı
 *
 * SHA-256 hex çıktısı yalnızca:
 *
 * 0-9
 * a-f
 *
 * içerdiği için Google'ın izin verdiği karakter
 * kümesinin alt kümesidir.
 *
 * Aynı:
 *
 * user + entity_type + entity_id
 *
 * her zaman aynı Google event id üretir.
 *
 * Böylece retry durumunda çift takvim kaydı oluşmaz.
 */
export const createGoogleEventId = ({
  userId,
  entityType,
  entityId,
}) => {
  if (
    !userId ||
    !entityType ||
    !entityId
  ) {
    throw new Error(
      'Google event id için userId, entityType ve entityId gereklidir'
    );
  }

  return crypto
    .createHash(
      'sha256'
    )
    .update(
      [
        'derkenar',
        String(
          userId
        ),
        String(
          entityType
        ),
        String(
          entityId
        ),
      ].join(
        ':'
      )
    )
    .digest(
      'hex'
    );
};

// ======================================================
// DATETIME NORMALIZATION
// ======================================================

const normalizeDateTime = (
  value,
  timeZone =
    DEFAULT_TIME_ZONE
) => {
  if (!value) {
    return null;
  }

  /*
   * Eğer gelen değer zaten timezone içeriyorsa:
   *
   * 2026-08-21T14:00:00+03:00
   * 2026-08-21T11:00:00Z
   *
   * mevcut zamanı koruyup hedef timezone'a çeviriyoruz.
   */
  const text =
    String(
      value
    );

  const hasExplicitOffset =
    /Z$/i.test(
      text
    ) ||
    /[+-]\d{2}:\d{2}$/.test(
      text
    );

  let parsed;

  if (
    hasExplicitOffset
  ) {
    parsed =
      dayjs(
        value
      ).tz(
        timeZone
      );
  } else {
    /*
     * Timezone bilgisi olmayan:
     *
     * 2026-08-21T14:00:00
     *
     * gibi değerleri Derkenar'ın timezone'u olan
     * Europe/Istanbul kabul ediyoruz.
     */
    parsed =
      dayjs.tz(
        value,
        timeZone
      );
  }

  if (
    !parsed.isValid()
  ) {
    return null;
  }

  return parsed.format();
};

// ======================================================
// GOOGLE EVENT RESOURCE
// ======================================================

const buildGoogleEventResource = ({
  googleEventId,
  entityType,
  entityId,
  title,
  description = '',
  location = '',
  start,
  end = null,
  allDay = false,
  timeZone =
    DEFAULT_TIME_ZONE,
}) => {
  if (!title) {
    throw new Error(
      'Google Calendar etkinlik başlığı gereklidir'
    );
  }

  if (!start) {
    throw new Error(
      'Google Calendar başlangıç tarihi gereklidir'
    );
  }

  // ====================================================
  // ALL DAY
  // ====================================================

  if (
    allDay
  ) {
    const startDate =
      isDateOnly(
        start
      )
        ? start.trim()
        : dayjs(
            start
          )
            .tz(
              timeZone
            )
            .format(
              'YYYY-MM-DD'
            );

    let endDate;

    if (
      end &&
      isDateOnly(
        end
      ) &&
      end >
        startDate
    ) {
      endDate =
        end.trim();
    } else {
      /*
       * Google Calendar'da all-day end tarihi
       * exclusive'dir.
       *
       * 21 Ağustos'taki tek günlük kayıt:
       *
       * start.date = 2026-08-21
       * end.date   = 2026-08-22
       */
      endDate =
        addOneDay(
          startDate
        );
    }

    return {
      id:
        googleEventId,

      summary:
        title,

      description:
        description ||
        undefined,

      location:
        location ||
        undefined,

      start: {
        date:
          startDate,
      },

      end: {
        date:
          endDate,
      },

      transparency:
        'opaque',

      reminders: {
        useDefault:
          true,
      },

      extendedProperties: {
        private: {
          derkenar_entity_type:
            String(
              entityType
            ),

          derkenar_entity_id:
            String(
              entityId
            ),
        },
      },
    };
  }

  // ====================================================
  // TIMED EVENT
  // ====================================================

  const startDateTime =
    normalizeDateTime(
      start,
      timeZone
    );

  if (
    !startDateTime
  ) {
    throw new Error(
      'Google Calendar başlangıç zamanı geçersiz'
    );
  }

  let endDateTime;

  if (end) {
    endDateTime =
      normalizeDateTime(
        end,
        timeZone
      );
  }

  if (
    !endDateTime
  ) {
    endDateTime =
      dayjs(
        startDateTime
      )
        .add(
          DEFAULT_EVENT_DURATION_MINUTES,
          'minute'
        )
        .format();
  }

  /*
   * End başlangıçtan önce veya aynıysa
   * otomatik 1 saat sonrasına çekiyoruz.
   */
  if (
    !dayjs(
      endDateTime
    ).isAfter(
      dayjs(
        startDateTime
      )
    )
  ) {
    endDateTime =
      dayjs(
        startDateTime
      )
        .add(
          DEFAULT_EVENT_DURATION_MINUTES,
          'minute'
        )
        .format();
  }

  return {
    id:
      googleEventId,

    summary:
      title,

    description:
      description ||
      undefined,

    location:
      location ||
      undefined,

    start: {
      dateTime:
        startDateTime,

      timeZone,
    },

    end: {
      dateTime:
        endDateTime,

      timeZone,
    },

    transparency:
      'opaque',

    reminders: {
      useDefault:
        true,
    },

    extendedProperties: {
      private: {
        derkenar_entity_type:
          String(
            entityType
          ),

        derkenar_entity_id:
          String(
            entityId
          ),
      },
    },
  };
};

// ======================================================
// GOOGLE CALENDAR SYNC SERVICE
// ======================================================

export const googleCalendarSyncService = {

  // ====================================================
  // UPSERT EVENT
  // ====================================================

  async upsertEvent({
    userId,
    entityType,
    entityId,
    title,
    description = '',
    location = '',
    start,
    end = null,
    allDay = false,
    timeZone =
      DEFAULT_TIME_ZONE,
  }) {
    if (!userId) {
      throw new Error(
        'Google Calendar senkronizasyonu için kullanıcı gereklidir'
      );
    }

    // ==================================================
    // CONNECTION CHECK
    // ==================================================

    const status =
      await calendarIntegrationService
        .getGoogleIntegration(
          userId
        );

    if (
      !status
        ?.connected
    ) {
      return {
        synced:
          false,

        skipped:
          true,

        reason:
          'google_not_connected',
      };
    }

    // ==================================================
    // AUTH CLIENT
    // ==================================================

    const {
      oauthClient,
      integration,
    } =
      await calendarIntegrationService
        .getAuthorizedGoogleClient(
          userId
        );

    const calendar =
      google.calendar({
        version:
          'v3',

        auth:
          oauthClient,
      });

    const calendarId =
      integration
        ?.calendar_id ||
      'primary';

    // ==================================================
    // STABLE GOOGLE EVENT ID
    // ==================================================

    const googleEventId =
      createGoogleEventId({
        userId,
        entityType,
        entityId,
      });

    const resource =
      buildGoogleEventResource({
        googleEventId,
        entityType,
        entityId,
        title,
        description,
        location,
        start,
        end,
        allDay,
        timeZone,
      });

    try {
      // =================================================
      // INSERT
      // =================================================

      const response =
        await calendar
          .events
          .insert({
            calendarId,

            requestBody:
              resource,
          });

      await calendarIntegrationService
        .markGoogleSyncSuccess(
          integration
        );

      return {
        synced:
          true,

        created:
          true,

        updated:
          false,

        google_event_id:
          response
            ?.data
            ?.id ||
          googleEventId,

        html_link:
          response
            ?.data
            ?.htmlLink ||
          null,
      };
    } catch (
      error
    ) {
      /*
       * Aynı deterministic ID daha önce oluşturulduysa
       * Google 409 conflict döndürür.
       *
       * Bu durumda yeni kayıt açmıyoruz;
       * mevcut event'i güncelliyoruz.
       */
      const statusCode =
        error
          ?.response
          ?.status ||
        error
          ?.code;

      if (
        Number(
          statusCode
        ) ===
        409
      ) {
        try {
          const {
            id,
            ...updateResource
          } =
            resource;

          const response =
            await calendar
              .events
              .update({
                calendarId,

                eventId:
                  googleEventId,

                requestBody:
                  updateResource,
              });

          await calendarIntegrationService
            .markGoogleSyncSuccess(
              integration
            );

          return {
            synced:
              true,

            created:
              false,

            updated:
              true,

            google_event_id:
              response
                ?.data
                ?.id ||
              googleEventId,

            html_link:
              response
                ?.data
                ?.htmlLink ||
              null,
          };
        } catch (
          updateError
        ) {
          await calendarIntegrationService
            .markGoogleSyncError(
              integration,
              updateError
            );

          throw updateError;
        }
      }

      await calendarIntegrationService
        .markGoogleSyncError(
          integration,
          error
        );

      throw error;
    }
  },

  // ====================================================
  // DELETE EVENT
  // ====================================================

  async deleteEvent({
    userId,
    entityType,
    entityId,
  }) {
    if (!userId) {
      throw new Error(
        'Google Calendar silme işlemi için kullanıcı gereklidir'
      );
    }

    if (
      !entityType ||
      !entityId
    ) {
      throw new Error(
        'Google Calendar silme işlemi için entity bilgileri gereklidir'
      );
    }

    // ==================================================
    // CONNECTION CHECK
    // ==================================================

    const status =
      await calendarIntegrationService
        .getGoogleIntegration(
          userId
        );

    if (
      !status?.connected
    ) {
      return {
        deleted:
          false,

        skipped:
          true,

        reason:
          'google_not_connected',
      };
    }

    // ==================================================
    // AUTH CLIENT
    // ==================================================

    const {
      oauthClient,
      integration,
    } =
      await calendarIntegrationService
        .getAuthorizedGoogleClient(
          userId
        );

    const calendar =
      google.calendar({
        version:
          'v3',

        auth:
          oauthClient,
      });

    const calendarId =
      integration
        ?.calendar_id ||
      'primary';

    // ==================================================
    // SAME DETERMINISTIC EVENT ID
    // ==================================================

    const googleEventId =
      createGoogleEventId({
        userId,
        entityType,
        entityId,
      });

    try {
      await calendar
        .events
        .delete({
          calendarId,

          eventId:
            googleEventId,

          sendUpdates:
            'none',
        });

      await calendarIntegrationService
        .markGoogleSyncSuccess(
          integration
        );

      return {
        deleted:
          true,

        skipped:
          false,

        google_event_id:
          googleEventId,
      };
    } catch (
      error
    ) {
      const statusCode =
        Number(
          error
            ?.response
            ?.status ||
          error
            ?.code
        );

      /*
       * Google tarafında etkinlik zaten yoksa
       * silme işlemini başarılı kabul ediyoruz.
       */
      if (
        statusCode ===
          404 ||
        statusCode ===
          410
      ) {
        await calendarIntegrationService
          .markGoogleSyncSuccess(
            integration
          );

        return {
          deleted:
            true,

          skipped:
            false,

          already_missing:
            true,

          google_event_id:
            googleEventId,
        };
      }

      await calendarIntegrationService
        .markGoogleSyncError(
          integration,
          error
        );

      throw error;
    }
  },

  // ====================================================
  // SAFE DELETE EVENT
  // ====================================================

  async deleteEventSafely(
    payload
  ) {
    try {
      logger.info(
        'Google Calendar auto delete START',
        {
          userId:
            payload
              ?.userId,

          entityType:
            payload
              ?.entityType,

          entityId:
            payload
              ?.entityId,
        }
      );

      const result =
        await this
          .deleteEvent(
            payload
          );

      logger.info(
        'Google Calendar auto delete RESULT',
        {
          userId:
            payload
              ?.userId,

          entityType:
            payload
              ?.entityType,

          entityId:
            payload
              ?.entityId,

          result,
        }
      );

      return result;
    } catch (
      error
    ) {
      logger.error(
        'Google Calendar auto delete ERROR',
        {
          userId:
            payload
              ?.userId,

          entityType:
            payload
              ?.entityType,

          entityId:
            payload
              ?.entityId,

          message:
            error
              ?.message,

          status:
            error
              ?.response
              ?.status,
        }
      );

      return {
        deleted:
          false,

        skipped:
          false,

        error:
          error
            ?.message ||
          'Google Calendar etkinliği silinemedi',
      };
    }
  },

  // ====================================================
  // SAFE UPSERT
  // ====================================================

  /*
   * Otomatik senkronizasyonda en önemli prensip:
   *
   * GOOGLE ÇÖKERSE DERKENAR KAYDI ÇÖKMEMELİ.
   *
   * Örneğin:
   *
   * görev DB'ye başarıyla oluşturuldu,
   * Google geçici olarak hata verdi.
   *
   * Bu durumda görev oluşturma işlemini
   * geri almıyoruz.
   *
   * Controller/service entegrasyonlarında
   * çoğunlukla bu methodu kullanacağız.
   */
  async upsertEventSafely(
    payload
  ) {
    try {
      return await this
        .upsertEvent(
          payload
        );
    } catch (
      error
    ) {
      logger.error(
        'Automatic Google Calendar sync error:',
        {
          userId:
            payload
              ?.userId,

          entityType:
            payload
              ?.entityType,

          entityId:
            payload
              ?.entityId,

          message:
            error
              ?.message,
        }
      );

      return {
        synced:
          false,

        skipped:
          false,

        error:
          error
            ?.message ||
          'Google Calendar senkronizasyonu başarısız',
      };
    }
  },
};

export default googleCalendarSyncService;