import crypto from 'crypto';
import { Op } from 'sequelize';

import { Reminder } from '../../models/Reminder.js';
import { User } from '../../models/User.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { Meeting } from '../../models/Meeting.js';
import { logger } from '../../config/logger.js';

export class ReminderServiceError extends Error {
  constructor(
    message,
    {
      code = 'REMINDER_SERVICE_ERROR',
      statusCode = 500,
      cause = null,
    } = {}
  ) {
    super(message);

    this.name = 'ReminderServiceError';
    this.code = code;
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(
      this,
      ReminderServiceError
    );
  }
}

// ======================================================
// CONSTANTS
// ======================================================

const REMINDER_CHANNELS = new Set([
  'in_app',
  'email',
  'both',
]);

const REMINDER_STATUSES = new Set([
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled',
]);

const SOURCE_FIELDS = {
  task: 'task_id',
  event: 'event_id',
  meeting: 'meeting_id',
};

const DEFAULT_OFFSETS = {
  task: [
    24 * 60,
    60,
  ],

  event: [
    24 * 60,
    60,
  ],

  meeting: [
    24 * 60,
    60,
  ],
};

// ======================================================
// DATE HELPERS
// ======================================================

const normalizeDate = (
  value,
  fieldName
) => {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new ReminderServiceError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
      {
        code:
          'INVALID_REMINDER_DATE',

        statusCode:
          400,
      }
    );
  }

  return date;
};

const normalizeOffsets = (
  offsets
) => {
  if (
    !Array.isArray(
      offsets
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      offsets
        .map(
          (value) =>
            Number(value)
        )
        .filter(
          (value) =>
            Number.isInteger(
              value
            ) &&
            value >= 0
        )
    ),
  ].sort(
    (a, b) =>
      b - a
  );
};

// ======================================================
// USER ID HELPERS
// ======================================================

const normalizeUserIds = (
  values = []
) => {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value
              ? String(
                  value
                ).trim()
              : null
        )
        .filter(
          Boolean
        )
    ),
  ];
};

// ======================================================
// SERVICE
// ======================================================

class ReminderService {

  // ====================================================
  // CREATE SINGLE REMINDER
  // ====================================================

  /**
   * Tek bir hatırlatma kaydı oluşturur.
   *
   * Aynı deduplication key ile daha önce source
   * reschedule nedeniyle cancelled olmuş bir kayıt
   * bulunursa yeni kayıt açmak yerine mevcut kayıt
   * tekrar pending durumuna getirilir.
   */
  async create({
    userId,
    createdBy,
    sourceType,
    sourceId,
    title,
    message = null,
    remindAt,
    channel = 'both',
    metadata = {},
    transaction = null,
  }) {
    this.validateCreateInput({
      userId,
      createdBy,
      sourceType,
      sourceId,
      title,
      remindAt,
      channel,
    });

    const normalizedRemindAt =
      normalizeDate(
        remindAt,
        'remindAt'
      );

    const sourceField =
      SOURCE_FIELDS[
        sourceType
      ];

    const deduplicationKey =
      this.createDeduplicationKey({
        userId,
        sourceType,
        sourceId,

        remindAt:
          normalizedRemindAt,

        channel,
      });

    const normalizedMetadata =
      metadata &&
      typeof metadata ===
        'object' &&
      !Array.isArray(
        metadata
      )
        ? metadata
        : {};

    const payload = {
      user_id:
        userId,

      created_by:
        createdBy,

      task_id:
        null,

      event_id:
        null,

      meeting_id:
        null,

      title:
        title.trim(),

      message:
        typeof message ===
          'string' &&
        message.trim()
          ? message.trim()
          : null,

      remind_at:
        normalizedRemindAt,

      channel,

      status:
        'pending',

      attempt_count:
        0,

      max_attempts:
        3,

      next_attempt_at:
        normalizedRemindAt,

      locked_at:
        null,

      locked_by:
        null,

      deduplication_key:
        deduplicationKey,

      metadata:
        normalizedMetadata,
    };

    payload[
      sourceField
    ] = sourceId;

    try {
      const [
        reminder,
        created,
      ] =
        await Reminder.findOrCreate({
          where: {
            deduplication_key:
              deduplicationKey,
          },

          defaults:
            payload,

          transaction,
        });

      if (created) {
        return reminder;
      }

      /*
       * ÖNEMLİ:
       *
       * rescheduleTask / rescheduleEvent /
       * rescheduleMeeting önce eski reminder'ları
       * cancelled yapar.
       *
       * Tarih değişmediyse deduplication key de
       * değişmez. findOrCreate bu durumda eski
       * cancelled kaydı bulur ve yeni kayıt açmaz.
       *
       * Bu yüzden cancelled kayıt aynı source için
       * yeniden schedule ediliyorsa tekrar pending
       * durumuna getiriyoruz.
       */
      if (
        reminder.status ===
        'cancelled'
      ) {
        await reminder.update(
          payload,
          {
            transaction,
          }
        );

        logger.debug(
          'İptal edilmiş hatırlatma yeniden aktifleştirildi',
          {
            reminderId:
              reminder.id,

            sourceType,

            sourceId,

            userId,

            remindAt:
              normalizedRemindAt.toISOString(),
          }
        );

        return reminder;
      }

      /*
       * Pending / processing / sent / failed durumda
       * aynı deduplication key zaten varsa ikinci bir
       * reminder oluşturulmaz.
       */
      logger.debug(
        'Hatırlatma zaten mevcut',
        {
          reminderId:
            reminder.id,

          status:
            reminder.status,

          sourceType,

          sourceId,

          userId,

          remindAt:
            normalizedRemindAt.toISOString(),
        }
      );

      return reminder;
    } catch (error) {
      logger.error(
        'Hatırlatma oluşturulamadı',
        {
          sourceType,

          sourceId,

          userId,

          remindAt:
            normalizedRemindAt.toISOString(),

          message:
            error.message,
        }
      );

      throw new ReminderServiceError(
        'Hatırlatma oluşturulamadı.',
        {
          code:
            'REMINDER_CREATE_FAILED',

          statusCode:
            500,

          cause:
            error,
        }
      );
    }
  }

  // ====================================================
  // CREATE REMINDERS FOR SOURCE
  // ====================================================

  /**
   * Bir kaydın tarihine göre birden fazla
   * hatırlatma oluşturur.
   *
   * offsetsMinutes örneği:
   *
   * [1440, 60, 15]
   */
  async createForSource({
    userId,
    createdBy,
    sourceType,
    sourceId,
    sourceTitle,
    targetDate,
    offsetsMinutes,
    channel = 'both',
    metadata = {},
    transaction = null,
  }) {
    const normalizedTargetDate =
      normalizeDate(
        targetDate,
        'targetDate'
      );

    const offsets =
      normalizeOffsets(
        offsetsMinutes ??
          DEFAULT_OFFSETS[
            sourceType
          ] ??
          []
      );

    if (
      offsets.length ===
      0
    ) {
      return [];
    }

    const now =
      new Date();

    const reminders =
      [];

    for (
      const offsetMinutes
      of offsets
    ) {
      const remindAt =
        new Date(
          normalizedTargetDate.getTime() -
            offsetMinutes *
              60 *
              1000
        );

      /*
       * Geçmişte kalan hatırlatmaları oluşturma.
       *
       * Böylece eski kayıtlar sisteme eklendiğinde
       * anında bildirim yağmuru oluşmaz.
       */
      if (
        remindAt <=
        now
      ) {
        continue;
      }

      const reminderLabel =
        this.formatOffsetLabel(
          offsetMinutes
        );

      const reminder =
        await this.create({
          userId,

          createdBy,

          sourceType,

          sourceId,

          title:
            `${sourceTitle} – ${reminderLabel}`,

          message:
            `"${sourceTitle}" için ${reminderLabel.toLowerCase()} hatırlatma.`,

          remindAt,

          channel,

          metadata: {
            ...metadata,

            targetDate:
              normalizedTargetDate.toISOString(),

            offsetMinutes,

            reminderLabel,
          },

          transaction,
        });

      reminders.push(
        reminder
      );
    }

    return reminders;
  }

  // ====================================================
  // TASK ASSIGNEES
  // ====================================================

  /**
   * Görevin hatırlatma alacak kullanıcılarını bulur.
   *
   * Öncelik:
   *
   * 1. task.assignees yüklenmişse onu kullan.
   *
   * 2. Yüklenmemişse belongsToMany getAssignees()
   *    üzerinden task_assignees tablosunu sorgula.
   *
   * 3. Hiç sorumlu yoksa görevi oluşturan kullanıcıya
   *    reminder oluştur.
   *
   * Aynı kullanıcı hiçbir zaman iki kez dönmez.
   */
  async getTaskReminderUserIds(
    task,
    {
      transaction = null,
    } = {}
  ) {
    if (
      !task?.id
    ) {
      return [];
    }

    let assigneeIds =
      [];

    // ==================================================
    // ALREADY LOADED ASSIGNEES
    // ==================================================

    if (
      Array.isArray(
        task.assignees
      )
    ) {
      assigneeIds =
        task.assignees
          .map(
            (user) =>
              user?.id
          )
          .filter(
            Boolean
          );
    }

    // ==================================================
    // LOAD FROM task_assignees
    // ==================================================

    else if (
      typeof task.getAssignees ===
      'function'
    ) {
      const assignees =
        await task.getAssignees({
          attributes: [
            'id',
          ],

          joinTableAttributes:
            [],

          transaction,
        });

      assigneeIds =
        assignees
          .map(
            (user) =>
              user?.id
          )
          .filter(
            Boolean
          );
    }

    assigneeIds =
      normalizeUserIds(
        assigneeIds
      );

    /*
     * Göreve kimse atanmamışsa oluşturan kullanıcı
     * kendi görevi için hatırlatma almaya devam eder.
     *
     * Bu, çoklu assignee sisteminde creator fallback
     * davranışıdır.
     */
    if (
      assigneeIds.length ===
        0 &&
      task.created_by
    ) {
      return normalizeUserIds([
        task.created_by,
      ]);
    }

    return assigneeIds;
  }

  // ====================================================
  // TASK REMINDERS
  // ====================================================

  async createTaskReminders(
    task,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.task,

      channel = 'both',

      transaction = null,
    } = {}
  ) {
    if (
      !task?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir görev zorunludur.',
        {
          code:
            'INVALID_TASK',

          statusCode:
            400,
        }
      );
    }

    if (
      !task.due_date
    ) {
      return [];
    }

    const userIds =
      await this.getTaskReminderUserIds(
        task,
        {
          transaction,
        }
      );

    if (
      userIds.length ===
      0
    ) {
      return [];
    }

    const reminders =
      [];

    /*
     * Bir göreve birden fazla kullanıcı atanmışsa
     * her kullanıcı için ayrı reminder kayıtları
     * oluşturulur.
     *
     * Deduplication key içerisinde userId bulunduğu için
     * kullanıcıların reminder kayıtları birbirleriyle
     * çakışmaz.
     */
    for (
      const userId
      of userIds
    ) {
      const userReminders =
        await this.createForSource({
          userId,

          createdBy:
            task.created_by,

          sourceType:
            'task',

          sourceId:
            task.id,

          sourceTitle:
            task.title,

          targetDate:
            task.due_date,

          offsetsMinutes,

          channel,

          metadata: {
            taskId:
              task.id,

            priority:
              task.priority,

            caseId:
              task.case_id,

            clientId:
              task.client_id,

            assigneeUserId:
              userId,

            link:
              `/tasks/${task.id}`,
          },

          transaction,
        });

      reminders.push(
        ...userReminders
      );
    }

    return reminders;
  }

  // ====================================================
  // EVENT REMINDERS
  // ====================================================

  async createEventReminders(
    event,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.event,

      channel = 'both',

      transaction = null,
    } = {}
  ) {
    if (
      !event?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir etkinlik zorunludur.',
        {
          code:
            'INVALID_EVENT',

          statusCode:
            400,
        }
      );
    }

    if (
      !event.start_date
    ) {
      return [];
    }

    /*
     * Event sistemi şu an tek assignee mantığında.
     * Bu davranışa dokunmuyoruz.
     */
    const userId =
      event.assigned_to ||
      event.created_by;

    if (!userId) {
      return [];
    }

    return this.createForSource({
      userId,

      createdBy:
        event.created_by,

      sourceType:
        'event',

      sourceId:
        event.id,

      sourceTitle:
        event.title,

      targetDate:
        event.start_date,

      offsetsMinutes,

      channel,

      metadata: {
        eventId:
          event.id,

        eventType:
          event.event_type,

        location:
          event.location,

        caseId:
          event.case_id,

        link:
          `/events/${event.id}`,
      },

      transaction,
    });
  }

  // ====================================================
  // MEETING PARTICIPANTS
  // ====================================================

  /**
   * Toplantının hatırlatma alacak Derkenar kullanıcılarını bulur.
   *
   * Öncelik:
   * 1. meeting.participantUsers yüklenmişse onu kullan.
   * 2. Değilse belongsToMany getParticipantUsers() ile
   *    meeting_attendees tablosunu sorgula.
   * 3. Geçiş dönemi için assigned_to fallback'i.
   * 4. Hiç katılımcı yoksa created_by fallback'i.
   */
  async getMeetingReminderUserIds(
    meeting,
    {
      transaction = null,
    } = {}
  ) {
    if (
      !meeting?.id
    ) {
      return [];
    }

    let participantIds =
      [];

    if (
      Array.isArray(
        meeting.participantUsers
      )
    ) {
      participantIds =
        meeting.participantUsers
          .map(
            (user) =>
              user?.id
          )
          .filter(
            Boolean
          );
    } else if (
      typeof meeting.getParticipantUsers ===
      'function'
    ) {
      const participants =
        await meeting.getParticipantUsers({
          attributes: [
            'id',
          ],

          joinTableAttributes:
            [],

          transaction,
        });

      participantIds =
        participants
          .map(
            (user) =>
              user?.id
          )
          .filter(
            Boolean
          );
    }

    participantIds =
      normalizeUserIds(
        participantIds
      );

    if (
      participantIds.length >
      0
    ) {
      return participantIds;
    }

    if (
      meeting.assigned_to
    ) {
      return normalizeUserIds([
        meeting.assigned_to,
      ]);
    }

    if (
      meeting.created_by
    ) {
      return normalizeUserIds([
        meeting.created_by,
      ]);
    }

    return [];
  }

  // ====================================================
  // MEETING REMINDERS
  // ====================================================

  async createMeetingReminders(
    meeting,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.meeting,

      channel = 'both',

      transaction = null,
    } = {}
  ) {
    if (
      !meeting?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir toplantı zorunludur.',
        {
          code:
            'INVALID_MEETING',

          statusCode:
            400,
        }
      );
    }

    if (
      !meeting.start_date
    ) {
      return [];
    }

    const userIds =
      await this.getMeetingReminderUserIds(
        meeting,
        {
          transaction,
        }
      );

    if (
      userIds.length ===
      0
    ) {
      return [];
    }

    const reminders =
      [];

    /*
     * Her toplantı katılımcısı için ayrı reminder oluşturulur.
     * Deduplication key userId içerdiği için kayıtlar çakışmaz.
     */
    for (
      const userId of
      userIds
    ) {
      const userReminders =
        await this.createForSource({
          userId,

          createdBy:
            meeting.created_by,

          sourceType:
            'meeting',

          sourceId:
            meeting.id,

          sourceTitle:
            meeting.title,

          targetDate:
            meeting.start_date,

          offsetsMinutes,

          channel,

          metadata: {
            meetingId:
              meeting.id,

            meetingType:
              meeting.meeting_type,

            location:
              meeting.location,

            meetingLink:
              meeting.meeting_link,

            caseId:
              meeting.case_id,

            clientId:
              meeting.client_id,

            participantUserId:
              userId,

            link:
              `/meetings/${meeting.id}`,
          },

          transaction,
        });

      reminders.push(
        ...userReminders
      );
    }

    return reminders;
  }

  // ====================================================
  // CANCEL SOURCE
  // ====================================================

  /**
   * Kaynağın aktif / tekrar denenebilir
   * hatırlatmalarını iptal eder.
   *
   * Task için birden fazla kullanıcıya oluşturulmuş
   * reminder varsa tamamını iptal eder.
   *
   * sent kayıtlar geçmiş/audit niteliği taşıdığı için
   * değiştirilmez.
   */
  async cancelForSource({
    sourceType,
    sourceId,
    transaction = null,
  }) {
    const sourceField =
      SOURCE_FIELDS[
        sourceType
      ];

    if (
      !sourceField ||
      !sourceId
    ) {
      throw new ReminderServiceError(
        'Geçerli bir hatırlatma kaynağı zorunludur.',
        {
          code:
            'INVALID_REMINDER_SOURCE',

          statusCode:
            400,
        }
      );
    }

    const [
      affectedCount,
    ] =
      await Reminder.update(
        {
          status:
            'cancelled',

          locked_at:
            null,

          locked_by:
            null,

          next_attempt_at:
            null,
        },
        {
          where: {
            [sourceField]:
              sourceId,

            status: {
              [Op.in]: [
                'pending',
                'failed',
                'processing',
              ],
            },
          },

          transaction,
        }
      );

    return affectedCount;
  }

  // ====================================================
  // RESCHEDULE TASK
  // ====================================================

  /**
   * Görev tarihi veya görev sorumluları değiştiğinde:
   *
   * 1. Görevin mevcut aktif reminder kayıtlarını
   *    iptal eder.
   *
   * 2. task_assignees tablosundaki güncel kullanıcılar
   *    için yeniden oluşturur / gerekiyorsa eski
   *    cancelled kayıtları yeniden aktifleştirir.
   */
  async rescheduleTask(
    task,
    options = {}
  ) {
    if (
      !task?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir görev zorunludur.',
        {
          code:
            'INVALID_TASK',

          statusCode:
            400,
        }
      );
    }

    await this.cancelForSource({
      sourceType:
        'task',

      sourceId:
        task.id,

      transaction:
        options.transaction ||
        null,
    });

    return this.createTaskReminders(
      task,
      options
    );
  }

  // ====================================================
  // RESCHEDULE EVENT
  // ====================================================

  async rescheduleEvent(
    event,
    options = {}
  ) {
    if (
      !event?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir etkinlik zorunludur.',
        {
          code:
            'INVALID_EVENT',

          statusCode:
            400,
        }
      );
    }

    await this.cancelForSource({
      sourceType:
        'event',

      sourceId:
        event.id,

      transaction:
        options.transaction ||
        null,
    });

    return this.createEventReminders(
      event,
      options
    );
  }

  // ====================================================
  // RESCHEDULE MEETING
  // ====================================================

  async rescheduleMeeting(
    meeting,
    options = {}
  ) {
    if (
      !meeting?.id
    ) {
      throw new ReminderServiceError(
        'Geçerli bir toplantı zorunludur.',
        {
          code:
            'INVALID_MEETING',

          statusCode:
            400,
        }
      );
    }

    await this.cancelForSource({
      sourceType:
        'meeting',

      sourceId:
        meeting.id,

      transaction:
        options.transaction ||
        null,
    });

    return this.createMeetingReminders(
      meeting,
      options
    );
  }

  // ====================================================
  // CANCEL BY ID
  // ====================================================

  /**
   * Bir hatırlatmayı kullanıcı tarafından iptal eder.
   *
   * user_id ile birlikte sorgulandığı için başka
   * kullanıcının reminder kaydı UUID üzerinden
   * iptal edilemez.
   */
  async cancelById(
    reminderId,
    userId
  ) {
    if (
      !reminderId ||
      !userId
    ) {
      throw new ReminderServiceError(
        'Hatırlatma bulunamadı.',
        {
          code:
            'REMINDER_NOT_FOUND',

          statusCode:
            404,
        }
      );
    }

    const reminder =
      await Reminder.findOne({
        where: {
          id:
            reminderId,

          user_id:
            userId,
        },
      });

    if (!reminder) {
      throw new ReminderServiceError(
        'Hatırlatma bulunamadı.',
        {
          code:
            'REMINDER_NOT_FOUND',

          statusCode:
            404,
        }
      );
    }

    if (
      [
        'sent',
        'cancelled',
      ].includes(
        reminder.status
      )
    ) {
      return reminder;
    }

    await reminder.update({
      status:
        'cancelled',

      locked_at:
        null,

      locked_by:
        null,

      next_attempt_at:
        null,
    });

    return reminder;
  }

  // ====================================================
  // LIST UPCOMING
  // ====================================================

  /**
   * Kullanıcının yaklaşan hatırlatmalarını listeler.
   *
   * user_id her zaman query içerisinde olduğu için
   * kullanıcı yalnız kendi reminder kayıtlarını görür.
   */
  async listUpcoming({
    userId,
    limit = 50,
  }) {
    if (!userId) {
      return [];
    }

    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 50,
          1
        ),
        100
      );

    return Reminder.findAll({
      where: {
        user_id:
          userId,

        status:
          'pending',

        remind_at: {
          [Op.gte]:
            new Date(),
        },
      },

      include: [
        {
          model:
            Task,

          as:
            'task',

          required:
            false,
        },

        {
          model:
            Event,

          as:
            'event',

          required:
            false,
        },

        {
          model:
            Meeting,

          as:
            'meeting',

          required:
            false,
        },

        {
          model:
            User,

          as:
            'user',

          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
      ],

      order: [
        [
          'remind_at',
          'ASC',
        ],
      ],

      limit:
        safeLimit,
    });
  }

  // ====================================================
  // VALIDATE
  // ====================================================

  validateCreateInput({
    userId,
    createdBy,
    sourceType,
    sourceId,
    title,
    remindAt,
    channel,
  }) {
    if (!userId) {
      throw new ReminderServiceError(
        'Hatırlatma kullanıcısı zorunludur.',
        {
          code:
            'REMINDER_USER_REQUIRED',

          statusCode:
            400,
        }
      );
    }

    if (!createdBy) {
      throw new ReminderServiceError(
        'Hatırlatmayı oluşturan kullanıcı zorunludur.',
        {
          code:
            'REMINDER_CREATOR_REQUIRED',

          statusCode:
            400,
        }
      );
    }

    if (
      !SOURCE_FIELDS[
        sourceType
      ]
    ) {
      throw new ReminderServiceError(
        'Geçersiz hatırlatma kaynak türü.',
        {
          code:
            'INVALID_REMINDER_SOURCE_TYPE',

          statusCode:
            400,
        }
      );
    }

    if (!sourceId) {
      throw new ReminderServiceError(
        'Hatırlatma kaynak kimliği zorunludur.',
        {
          code:
            'REMINDER_SOURCE_REQUIRED',

          statusCode:
            400,
        }
      );
    }

    if (
      typeof title !==
        'string' ||
      !title.trim()
    ) {
      throw new ReminderServiceError(
        'Hatırlatma başlığı zorunludur.',
        {
          code:
            'REMINDER_TITLE_REQUIRED',

          statusCode:
            400,
        }
      );
    }

    if (!remindAt) {
      throw new ReminderServiceError(
        'Hatırlatma zamanı zorunludur.',
        {
          code:
            'REMINDER_DATE_REQUIRED',

          statusCode:
            400,
        }
      );
    }

    if (
      !REMINDER_CHANNELS.has(
        channel
      )
    ) {
      throw new ReminderServiceError(
        'Geçersiz hatırlatma kanalı.',
        {
          code:
            'INVALID_REMINDER_CHANNEL',

          statusCode:
            400,
        }
      );
    }
  }

  // ====================================================
  // DEDUPLICATION
  // ====================================================

  createDeduplicationKey({
    userId,
    sourceType,
    sourceId,
    remindAt,
    channel,
  }) {
    return crypto
      .createHash(
        'sha256'
      )
      .update(
        [
          userId,
          sourceType,
          sourceId,
          remindAt.toISOString(),
          channel,
        ].join(':')
      )
      .digest(
        'hex'
      );
  }

  // ====================================================
  // OFFSET LABEL
  // ====================================================

  formatOffsetLabel(
    minutes
  ) {
    if (
      minutes === 0
    ) {
      return 'Tam zamanında';
    }

    if (
      minutes %
        (
          24 *
          60
        ) ===
      0
    ) {
      const days =
        minutes /
        (
          24 *
          60
        );

      return `${days} gün önce`;
    }

    if (
      minutes %
        60 ===
      0
    ) {
      const hours =
        minutes /
        60;

      return `${hours} saat önce`;
    }

    return `${minutes} dakika önce`;
  }

  // ====================================================
  // STATUS
  // ====================================================

  isValidStatus(
    status
  ) {
    return REMINDER_STATUSES.has(
      status
    );
  }
}

export const reminderService =
  new ReminderService();

export default reminderService;