import crypto from 'node:crypto';

import { logger } from '../config/logger.js';

class MemoryQueue {
  constructor(name, processor) {
    this.name = name;
    this.processor = processor;

    this.jobs = [];
    this.completedCount = 0;
    this.failedCount = 0;

    this.listeners = {
      completed: [],
      failed: [],
    };
  }

  async add(data, options = {}) {
    const job = {
      id: crypto.randomUUID(),
      name: options.name || this.name,
      data,
      options,
      status: 'waiting',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      result: null,
      error: null,
    };

    this.jobs.push(job);

    logger.info('Queue işi eklendi', {
      queue: this.name,
      jobId: job.id,
      jobName: job.name,
    });

    /*
     * Memory queue kullandığımız sürece işlem burada beklenir.
     *
     * Böylece email veya notification gerçekten oluşturulmadan
     * add() başarılı dönmez. ReminderWorker da gönderim hatasını
     * yakalayıp retry uygulayabilir.
     */
    return this.processJob(job);
  }

  async processJob(job) {
    job.status = 'active';
    job.startedAt = new Date();

    try {
      if (typeof this.processor !== 'function') {
        throw new Error(
          `${this.name} için processor tanımlanmamış.`
        );
      }

      const result = await this.processor(job.data, job);

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();

      this.completedCount += 1;

      this.emit('completed', job, result);

      logger.info('Queue işi tamamlandı', {
        queue: this.name,
        jobId: job.id,
        durationMs:
          job.completedAt.getTime() -
          job.startedAt.getTime(),
      });

      return {
        id: job.id,
        data: job.data,
        result,
        status: job.status,
      };
    } catch (error) {
      job.status = 'failed';
      job.failedAt = new Date();
      job.error = {
        name: error.name,
        message: error.message,
      };

      this.failedCount += 1;

      this.emit('failed', job, error);

      logger.error('Queue işi başarısız', {
        queue: this.name,
        jobId: job.id,
        name: error.name,
        message: error.message,
      });

      /*
       * Hata mutlaka yukarı taşınmalıdır.
       * Aksi hâlde ReminderWorker işlemi gönderilmiş sanır.
       */
      throw error;
    } finally {
      this.pruneJobs();
    }
  }

  async addBulk(items = []) {
    if (!Array.isArray(items)) {
      throw new TypeError(
        'Queue bulk verisi bir dizi olmalıdır.'
      );
    }

    const results = [];

    /*
     * Sıralı çalıştırıyoruz. Böylece geçici memory queue
     * aynı anda çok fazla e-posta isteği başlatmaz.
     */
    for (const item of items) {
      const data = item?.data ?? item;
      const options = item?.options ?? {};

      results.push(
        await this.add(data, options)
      );
    }

    return results;
  }

  async getJobCounts() {
    const waiting = this.jobs.filter(
      (job) => job.status === 'waiting'
    ).length;

    const active = this.jobs.filter(
      (job) => job.status === 'active'
    ).length;

    return {
      waiting,
      active,
      completed: this.completedCount,
      failed: this.failedCount,
      retained: this.jobs.length,
    };
  }

  async clean() {
    this.jobs = [];
    this.completedCount = 0;
    this.failedCount = 0;
  }

  on(eventName, callback) {
    if (
      !this.listeners[eventName] ||
      typeof callback !== 'function'
    ) {
      return this;
    }

    this.listeners[eventName].push(callback);

    return this;
  }

  emit(eventName, ...args) {
    const callbacks =
      this.listeners[eventName] || [];

    for (const callback of callbacks) {
      try {
        callback(...args);
      } catch (error) {
        logger.error('Queue event listener hatası', {
          queue: this.name,
          eventName,
          message: error.message,
        });
      }
    }
  }

  pruneJobs() {
    const maxRetainedJobs = 250;

    if (this.jobs.length <= maxRetainedJobs) {
      return;
    }

    /*
     * Aktif veya bekleyen işler korunur.
     * Eski tamamlanmış/başarısız işler RAM'den temizlenir.
     */
    const unfinishedJobs = this.jobs.filter(
      (job) =>
        job.status === 'waiting' ||
        job.status === 'active'
    );

    const finishedJobs = this.jobs
      .filter(
        (job) =>
          job.status === 'completed' ||
          job.status === 'failed'
      )
      .slice(-maxRetainedJobs);

    this.jobs = [
      ...unfinishedJobs,
      ...finishedJobs,
    ];
  }
}

const processNotification = async (data) => {
  if (!data?.userId) {
    throw new Error(
      'Notification için userId zorunludur.'
    );
  }

  if (!data?.message) {
    throw new Error(
      'Notification mesajı zorunludur.'
    );
  }

  const {
    notificationService,
  } = await import(
    '../modules/notifications/notification.service.js'
  );

  const notification =
    await notificationService.create(
      data.userId,
      data.type || 'system',
      data.title || 'Bildirim',
      data.message,
      data.link || null,
      data.metadata || {}
    );

  logger.info('Bildirim oluşturuldu', {
    notificationId: notification.id,
    userId: data.userId,
  });

  return notification;
};

const processEmail = async (data) => {
  if (!data?.to) {
    throw new Error(
      'E-posta alıcısı zorunludur.'
    );
  }

  if (!data?.subject) {
    throw new Error(
      'E-posta konusu zorunludur.'
    );
  }

  if (!data?.html && !data?.text) {
    throw new Error(
      'E-posta içeriği zorunludur.'
    );
  }

  const {
    emailService,
  } = await import(
    '../integrations/email.service.js'
  );

  const result =
  await emailService.sendEmail({
    to: data.to,
    subject: data.subject,
    html: data.html,
    text: data.text,
    replyTo: data.replyTo,
    tags: data.tags,
  });

  /*
   * Eski emailService başarısızlıkta
   * { success: false } döndürüyorsa bunu da hata say.
   */
  if (result?.success === false) {
    const message =
      typeof result.error === 'string'
        ? result.error
        : JSON.stringify(result.error);

    throw new Error(
      message || 'E-posta gönderilemedi.'
    );
  }

  logger.info('E-posta gönderildi', {
    to: data.to,
    subject: data.subject,
  });

  return result;
};

const processAI = async (data) => {
  /*
   * Şimdilik gerçek AI worker bulunmuyor.
   * Sahte başarı dönmek yerine açıkça işaretliyoruz.
   */
  logger.warn(
    'AI memory queue işi için gerçek processor tanımlı değil',
    {
      operation: data?.operation || null,
    }
  );

  return {
    processed: false,
    deferred: true,
    reason: 'AI_WORKER_NOT_IMPLEMENTED',
  };
};

export const emailQueue =
  new MemoryQueue(
    'email-queue',
    processEmail
  );

export const notificationQueue =
  new MemoryQueue(
    'notification-queue',
    processNotification
  );

export const aiQueue =
  new MemoryQueue(
    'ai-queue',
    processAI
  );

const setupQueueEvents = (
  queue,
  displayName
) => {
  queue.on(
    'completed',
    (job) => {
      logger.debug(
        `${displayName} queue işi tamamlandı`,
        {
          jobId: job.id,
        }
      );
    }
  );

  queue.on(
    'failed',
    (job, error) => {
      logger.error(
        `${displayName} queue işi başarısız`,
        {
          jobId: job.id,
          message: error.message,
        }
      );
    }
  );
};

setupQueueEvents(
  emailQueue,
  'Email'
);

setupQueueEvents(
  notificationQueue,
  'Notification'
);

setupQueueEvents(
  aiQueue,
  'AI'
);

export const addEmailJob = async (
  data,
  options = {}
) => {
  return emailQueue.add(
    data,
    options
  );
};

export const addNotificationJob = async (
  data,
  options = {}
) => {
  return notificationQueue.add(
    data,
    options
  );
};

export const addAIJob = async (
  data,
  options = {}
) => {
  return aiQueue.add(
    data,
    options
  );
};

export const addEmailJobs = async (
  jobs
) => {
  return emailQueue.addBulk(jobs);
};

export const addNotificationJobs = async (
  jobs
) => {
  return notificationQueue.addBulk(
    jobs
  );
};

export const addAIJobs = async (
  jobs
) => {
  return aiQueue.addBulk(jobs);
};

export const getQueueStatus = async () => {
  const [
    email,
    notification,
    ai,
  ] = await Promise.all([
    emailQueue.getJobCounts(),
    notificationQueue.getJobCounts(),
    aiQueue.getJobCounts(),
  ]);

  return {
    email,
    notification,
    ai,
    driver: 'memory',
    durable: false,
  };
};

export const cleanQueues = async () => {
  await Promise.all([
    emailQueue.clean(),
    notificationQueue.clean(),
    aiQueue.clean(),
  ]);
};

export default {
  emailQueue,
  notificationQueue,
  aiQueue,

  addEmailJob,
  addNotificationJob,
  addAIJob,

  addEmailJobs,
  addNotificationJobs,
  addAIJobs,

  getQueueStatus,
  cleanQueues,
};