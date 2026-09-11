import cron from 'node-cron';
import os from 'node:os';
import crypto from 'node:crypto';
import { Op } from 'sequelize';

import { Reminder } from '../models/Reminder.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { Event } from '../models/Event.js';
import { Meeting } from '../models/Meeting.js';

import { sequelize } from '../config/database.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

import {
  createEmailTemplate,
  createPlainTextEmail,
} from '../integrations/email-template.js';

import {
  addEmailJob,
  addNotificationJob,
} from './queue.js';

const WORKER_INTERVAL = '*/1 * * * *';
const WORKER_TIMEZONE = 'Europe/Istanbul';

const BATCH_SIZE = 50;
const LOCK_TIMEOUT_MINUTES = 10;
const BASE_RETRY_MINUTES = 5;

const SOURCE_CONFIG = {
  task: {
    association: 'task',
    notificationType: 'task',
    label: 'Görev',
    dateField: 'due_date',
    linkPrefix: '/tasks',
  },

  event: {
    association: 'event',
    notificationType: 'event',
    label: 'Etkinlik',
    dateField: 'start_date',
    linkPrefix: '/events',
  },

  meeting: {
    association: 'meeting',
    notificationType: 'meeting',
    label: 'Toplantı',
    dateField: 'start_date',
    linkPrefix: '/meetings',
  },
};

const formatDate = (value) => {
  if (!value) {
    return 'Belirtilmedi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Geçersiz tarih';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: WORKER_TIMEZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
};

const buildAbsoluteUrl = (link) => {
  if (!link) {
    return config.CLIENT_URL;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  const baseUrl =
    String(config.CLIENT_URL || '')
      .replace(/\/+$/, '');

  const normalizedLink =
    String(link).startsWith('/')
      ? String(link)
      : `/${String(link)}`;

  return `${baseUrl}${normalizedLink}`;
};

class ReminderWorker {
  constructor() {
    this.workerId =
      `${os.hostname()}-${process.pid}-${crypto
        .randomUUID()
        .slice(0, 8)}`;

    this.cronTask = null;
    this.isProcessing = false;
  }

  start() {
    if (this.cronTask) {
      logger.warn(
        'Reminder worker zaten çalışıyor',
        {
          workerId: this.workerId,
        }
      );

      return;
    }

    this.cronTask = cron.schedule(
      WORKER_INTERVAL,

      async () => {
        await this.run();
      },

      {
        timezone: WORKER_TIMEZONE,
      }
    );

    logger.info(
      'Reminder worker başlatıldı',
      {
        workerId: this.workerId,
        interval: WORKER_INTERVAL,
        timezone: WORKER_TIMEZONE,
      }
    );

    setTimeout(() => {
      this.run().catch((error) => {
        logger.error(
          'Reminder worker ilk çalıştırma hatası',
          {
            workerId: this.workerId,
            message: error.message,

            stack:
              config.NODE_ENV === 'development'
                ? error.stack
                : undefined,
          }
        );
      });
    }, 3000);
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask.destroy?.();

      this.cronTask = null;
    }

    logger.info(
      'Reminder worker durduruldu',
      {
        workerId: this.workerId,
      }
    );
  }

  async run() {
    if (this.isProcessing) {
      logger.debug(
        'Reminder worker önceki işlemi sürdürüyor',
        {
          workerId: this.workerId,
        }
      );

      return;
    }

    this.isProcessing = true;

    try {
      await this.releaseExpiredLocks();

      const reminderIds =
        await this.claimDueReminders();

      if (reminderIds.length === 0) {
        return;
      }

      logger.info(
        'Hatırlatmalar işlenmek üzere alındı',
        {
          workerId: this.workerId,
          count: reminderIds.length,
        }
      );

      for (const reminderId of reminderIds) {
        await this.processReminder(
          reminderId
        );
      }
    } catch (error) {
      logger.error(
        'Reminder worker çalıştırma hatası',
        {
          workerId: this.workerId,
          message: error.message,

          stack:
            config.NODE_ENV === 'development'
              ? error.stack
              : undefined,
        }
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async claimDueReminders() {
    const transaction =
      await sequelize.transaction();

    try {
      const now = new Date();

      const reminders =
        await Reminder.findAll({
          where: {
            status: {
              [Op.in]: [
                'pending',
                'failed',
              ],
            },

            remind_at: {
              [Op.lte]: now,
            },

            attempt_count: {
              [Op.lt]:
                sequelize.col(
                  'max_attempts'
                ),
            },

            [Op.or]: [
              {
                next_attempt_at: null,
              },
              {
                next_attempt_at: {
                  [Op.lte]: now,
                },
              },
            ],
          },

          attributes: [
            'id',
          ],

          order: [
            [
              'remind_at',
              'ASC',
            ],
          ],

          limit: BATCH_SIZE,

          transaction,

          lock:
            transaction.LOCK.UPDATE,

          skipLocked: true,
        });

      const reminderIds =
        reminders.map(
          (reminder) =>
            reminder.id
        );

      if (
        reminderIds.length > 0
      ) {
        await Reminder.update(
          {
            status: 'processing',
            locked_at: now,
            locked_by:
              this.workerId,
          },

          {
            where: {
              id: {
                [Op.in]:
                  reminderIds,
              },
            },

            transaction,
          }
        );
      }

      await transaction.commit();

      return reminderIds;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  async processReminder(
    reminderId
  ) {
    const reminder =
      await Reminder.findOne({
        where: {
          id: reminderId,
          status: 'processing',
          locked_by:
            this.workerId,
        },

        include: [
          {
            model: User,
            as: 'user',

            attributes: [
              'id',
              'email',
              'first_name',
              'last_name',
              'is_active',
            ],
          },

          {
            model: Task,
            as: 'task',
            required: false,
          },

          {
            model: Event,
            as: 'event',
            required: false,
          },

          {
            model: Meeting,
            as: 'meeting',
            required: false,
          },
        ],
      });

    if (!reminder) {
      return;
    }

    try {
      const source =
        this.resolveSource(
          reminder
        );

      if (!source) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,

          last_error:
            'Hatırlatmanın bağlı olduğu kayıt bulunamadı.',
        });

        return;
      }

      if (
        !reminder.user ||
        !reminder.user.is_active
      ) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,

          last_error:
            'Hatırlatma kullanıcısı aktif değil.',
        });

        return;
      }

      if (
        this.isSourceInactive(
          source.type,
          source.record
        )
      ) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,

          last_error:
            'Bağlı kayıt tamamlanmış veya iptal edilmiş.',
        });

        return;
      }

      const content =
        this.buildContent({
          reminder,
          source,
        });

      if (
        reminder.channel ===
          'in_app' ||
        reminder.channel ===
          'both'
      ) {
        await addNotificationJob({
          userId:
            reminder.user.id,

          type:
            SOURCE_CONFIG[
              source.type
            ].notificationType,

          title:
            content.title,

          message:
            content.message,

          link:
            content.link,

          metadata: {
            ...reminder.metadata,

            reminderId:
              reminder.id,

            sourceType:
              source.type,

            sourceId:
              source.record.id,

            remindAt:
              reminder.remind_at,

            deduplicationKey:
              reminder.deduplication_key,
          },
        });
      }

      if (
        reminder.channel ===
          'email' ||
        reminder.channel ===
          'both'
      ) {
        if (
          !reminder.user.email
        ) {
          throw new Error(
            'Hatırlatma kullanıcısının e-posta adresi bulunmuyor.'
          );
        }

        await addEmailJob({
          to:
            reminder.user.email,

          subject:
            content.emailSubject,

          html:
            content.emailHtml,

          text:
            content.emailText,

          tags: [
            'reminder',
            `reminder-${source.type}`,
          ],
        });
      }

      await reminder.update({
        status: 'sent',
        sent_at: new Date(),

        locked_at: null,
        locked_by: null,

        next_attempt_at: null,
        last_error: null,

        attempt_count:
          Number(
            reminder.attempt_count ||
            0
          ) + 1,
      });

      logger.info(
        'Hatırlatma başarıyla gönderildi',
        {
          reminderId:
            reminder.id,

          workerId:
            this.workerId,

          sourceType:
            source.type,

          sourceId:
            source.record.id,

          userId:
            reminder.user.id,

          channel:
            reminder.channel,
        }
      );
    } catch (error) {
      await this.markFailed(
        reminder,
        error
      );
    }
  }

  resolveSource(reminder) {
    if (reminder.task) {
      return {
        type: 'task',
        record:
          reminder.task,
      };
    }

    if (reminder.event) {
      return {
        type: 'event',
        record:
          reminder.event,
      };
    }

    if (reminder.meeting) {
      return {
        type: 'meeting',
        record:
          reminder.meeting,
      };
    }

    return null;
  }

  isSourceInactive(
    sourceType,
    source
  ) {
    if (!source) {
      return true;
    }

    if (
      sourceType === 'task'
    ) {
      return [
        'completed',
        'cancelled',
      ].includes(
        source.status
      );
    }

    return [
      'completed',
      'cancelled',
    ].includes(
      source.status
    );
  }

  buildContent({
    reminder,
    source,
  }) {
    const sourceConfig =
      SOURCE_CONFIG[
        source.type
      ];

    const sourceRecord =
  source.record;

const isHearing =
  source.type === 'event' &&
  sourceRecord.event_type === 'hearing';

const sourceLabel =
  isHearing
    ? 'Duruşma'
    : sourceConfig.label;

const title =
  reminder.title ||
  `${sourceLabel} Hatırlatması`;

    const targetDate =
      reminder.metadata
        ?.targetDate ||
      sourceRecord[
        sourceConfig.dateField
      ];

    const formattedDate =
      formatDate(
        targetDate
      );

    const message =
      reminder.message ||
      `"${sourceRecord.title}" için yaklaşan bir hatırlatmanız var.`;

    const link =
      reminder.metadata?.link ||
      `${sourceConfig.linkPrefix}/${sourceRecord.id}`;

    const absoluteLink =
      buildAbsoluteUrl(
        link
      );

    const details = [
  {
    label:
      sourceLabel,

    value:
      sourceRecord.title,
  },

      {
        label:
          'Tarih',

        value:
          formattedDate,
      },
    ];

    if (
      source.type ===
      'task'
    ) {
      if (
        sourceRecord.priority
      ) {
        details.push({
          label:
            'Öncelik',

          value:
            sourceRecord.priority,
        });
      }

      if (
        Number.isFinite(
          Number(
            sourceRecord.progress
          )
        )
      ) {
        details.push({
          label:
            'İlerleme',

          value:
            `%${sourceRecord.progress}`,
        });
      }
    }

    if (
      source.type ===
      'event'
    ) {
      if (
  sourceRecord.event_type &&
  !isHearing
) {
  details.push({
    label:
      'Etkinlik Türü',

    value:
      sourceRecord.event_type,
  });
}

if (
  sourceRecord.hearing_type &&
  isHearing
) {
  const hearingTypeLabels = {
    preliminary: 'Ön İnceleme',
    evidentiary: 'Tahkikat',
    final: 'Karar',
  };

  details.push({
    label:
      'Duruşma Türü',

    value:
      hearingTypeLabels[
        sourceRecord.hearing_type
      ] ||
      sourceRecord.hearing_type,
  });
}

      if (
        sourceRecord.location
      ) {
        details.push({
          label:
            'Yer',

          value:
            sourceRecord.location,
        });
      }

      if (
        sourceRecord.court_room
      ) {
        details.push({
          label:
            'Duruşma Salonu',

          value:
            sourceRecord.court_room,
        });
      }

      if (
        sourceRecord.judge_name
      ) {
        details.push({
          label:
            'Hakim',

          value:
            sourceRecord.judge_name,
        });
      }
    }

    if (
      source.type ===
      'meeting'
    ) {
     if (
  sourceRecord.meeting_type
) {
  const meetingTypeLabels = {
    client: 'Müvekkil Görüşmesi',
    internal: 'İç Toplantı',
    phone: 'Telefon Görüşmesi',
    other: 'Diğer',
  };

  details.push({
    label:
      'Toplantı Türü',

    value:
      meetingTypeLabels[
        sourceRecord.meeting_type
      ] ||
      'Diğer',
  });
}

      if (
        sourceRecord.location
      ) {
        details.push({
          label:
            'Yer',

          value:
            sourceRecord.location,
        });
      }

      if (
        sourceRecord.meeting_link
      ) {
        details.push({
          label:
            'Toplantı Linki',

          value:
            sourceRecord.meeting_link,
        });
      }
    }

    let buttonLabel =
      'Kaydı Görüntüle';

    if (
      source.type ===
      'task'
    ) {
      buttonLabel =
        'Görevi Görüntüle';
    }

    if (
      source.type ===
      'meeting'
    ) {
      buttonLabel =
        'Toplantıyı Görüntüle';
    }

    if (
      source.type ===
      'event'
    ) {
      buttonLabel =
        sourceRecord.event_type ===
        'hearing'
          ? 'Duruşmayı Görüntüle'
          : 'Etkinliği Görüntüle';
    }

    const templateData = {
      title,

      greeting:
        `Merhaba ${
          reminder.user
            .first_name ||
          'Kullanıcı'
        },`,

      paragraphs: [
        message,
      ],

      details,

      button: {
        label:
          buttonLabel,

        url:
          absoluteLink,
      },
    };

    return {
      title,
      message,
      link,

      emailSubject:
        `${title}: ${sourceRecord.title}`,

      emailHtml:
        createEmailTemplate(
          templateData
        ),

      emailText:
        createPlainTextEmail(
          templateData
        ),
    };
  }

  async markFailed(
    reminder,
    error
  ) {
    const attemptCount =
      Number(
        reminder.attempt_count ||
        0
      ) + 1;

    const maxAttempts =
      Number(
        reminder.max_attempts ||
        3
      );

    const exhausted =
      attemptCount >=
      maxAttempts;

    const retryDelayMinutes =
      BASE_RETRY_MINUTES *
      Math.pow(
        2,
        Math.max(
          attemptCount - 1,
          0
        )
      );

    const nextAttemptAt =
      exhausted
        ? null
        : new Date(
            Date.now() +
              retryDelayMinutes *
                60 *
                1000
          );

    await reminder.update({
      status:
        exhausted
          ? 'failed'
          : 'pending',

      attempt_count:
        attemptCount,

      next_attempt_at:
        nextAttemptAt,

      locked_at: null,
      locked_by: null,

      last_error:
        String(
          error?.message ||
            'Hatırlatma gönderilemedi.'
        ).slice(
          0,
          2000
        ),
    });

    logger.error(
      'Hatırlatma gönderilemedi',
      {
        reminderId:
          reminder.id,

        workerId:
          this.workerId,

        attemptCount,
        maxAttempts,
        exhausted,

        nextAttemptAt,

        errorName:
          error?.name,

        errorCode:
          error?.code,

        retryable:
          error?.retryable,

        message:
          error?.message,
      }
    );
  }

  async releaseExpiredLocks() {
    const expiredBefore =
      new Date(
        Date.now() -
          LOCK_TIMEOUT_MINUTES *
            60 *
            1000
      );

    const [releasedCount] =
      await Reminder.update(
        {
          status: 'pending',

          locked_at: null,
          locked_by: null,

          next_attempt_at:
            new Date(),

          last_error:
            'Süresi dolan worker kilidi otomatik olarak kaldırıldı.',
        },

        {
          where: {
            status:
              'processing',

            locked_at: {
              [Op.lt]:
                expiredBefore,
            },
          },
        }
      );

    if (
      releasedCount > 0
    ) {
      logger.warn(
        'Süresi dolan reminder kilitleri kaldırıldı',
        {
          count:
            releasedCount,

          workerId:
            this.workerId,
        }
      );
    }
  }
}

export const reminderWorker =
  new ReminderWorker();

export default reminderWorker;