import { createServer } from 'http';
import { Server } from 'socket.io';

import { app } from './app.js';
import { config } from './config/env.js';
import {
  connectDB,
  disconnectDB,
} from './config/database.js';
import { logger } from './config/logger.js';

import {
  setIo as setNotificationIo,
} from './modules/notifications/notification.service.js';

import {
  authenticateSocket,
} from './socket/socket.auth.js';

import {
  setIo as setSocketIo,
} from './socket/socket.service.js';

import {
  registerChatSocket,
} from './modules/chat/chat.socket.js';

import { reminderWorker } from './jobs/reminder.worker.js';

const PORT = config.PORT;

const httpServer = createServer(app);

const allowedOrigins = [
  ...new Set([
    ...config.CORS_ORIGINS,
    config.CLIENT_URL,
  ].filter(Boolean)),
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },

  transports: ['websocket', 'polling'],

  pingInterval: 25_000,
  pingTimeout: 20_000,

  maxHttpBufferSize: 1_000_000,
});

let serverStarted = false;
let shuttingDown = false;

/**
 * Socket.IO kimlik doğrulaması.
 *
 * HTTP authentication yapısına paralel olarak:
 *
 * - access token doğrulaması
 * - token type
 * - issuer / audience
 * - kullanıcı DB kontrolü
 * - is_active
 * - token_version
 *
 * kontrolleri socket.auth.js içinde yapılır.
 */
io.use(
  authenticateSocket
);

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  const userRoom = `user-${userId}`;

  /*
   * Kullanıcı yalnızca doğrulanmış tokenındaki
   * kullanıcı kimliğine ait odaya katılır.
   */
  socket.join(userRoom);

  /*
   * Chat'e özel socket eventleri mevcut
   * authenticated socket bağlantısına kaydedilir.
   *
   * Ayrı bir Socket.IO bağlantısı veya namespace
   * oluşturulmaz.
   */
  registerChatSocket({
    socket,
  });

  logger.info('Socket bağlantısı kuruldu', {
    socketId: socket.id,
    userId,
    room: userRoom,
    transport: socket.conn.transport.name,
  });

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({
        pong: true,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info('Socket bağlantısı kapandı', {
      socketId: socket.id,
      userId,
      reason,
    });
  });

  socket.on('error', (error) => {
    logger.error('Socket hatası', {
      socketId: socket.id,
      userId,
      message: error.message,
    });
  });
});

io.engine.on('connection_error', (error) => {
  logger.warn('Socket.IO bağlantı hatası', {
    code: error.code,
    message: error.message,
    context: error.context,
  });
});

/*
 * Notification sistemi şimdilik mevcut setIo
 * altyapısını kullanmaya devam eder.
 *
 * Chat ve yeni realtime özellikler merkezi
 * socket.service.js üzerinden aynı io instance'ını kullanır.
 */
setNotificationIo(io);
setSocketIo(io);

app.set('io', io);

/**
 * Arka plan işlerini başlatır.
 *
 * Veritabanı bağlantısı kurulmadan önce çağrılmamalıdır.
 */
const startJobs = () => {
  try {
    reminderWorker.start();

    logger.info(
      'Hatırlatma worker işlemleri başlatıldı'
    );
  } catch (error) {
    /*
     * Worker başlangıç hatası HTTP sunucusunu kapatmaz.
     * Ancak production izleme sisteminde kritik alarm
     * olarak değerlendirilmelidir.
     */
    logger.error(
      'Hatırlatma worker başlatılamadı',
      {
        name: error.name,
        message: error.message,
        stack:
          config.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      }
    );
  }
};

/**
 * Arka plan işlerini durdurur.
 */
const stopJobs = () => {
  try {
    reminderWorker.stop();

    logger.info(
      'Hatırlatma worker işlemleri durduruldu'
    );
  } catch (error) {
    logger.error(
      'Hatırlatma worker durdurulamadı',
      {
        name: error.name,
        message: error.message,
      }
    );
  }
};

const listen = () =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      httpServer.off(
        'listening',
        onListening
      );

      reject(error);
    };

    const onListening = () => {
      httpServer.off(
        'error',
        onError
      );

      resolve();
    };

    httpServer.once(
      'error',
      onError
    );

    httpServer.once(
      'listening',
      onListening
    );

    httpServer.listen(PORT);
  });

const startServer = async () => {
  try {
    /*
     * Model initialization ve veritabanı bağlantısı
     * HTTP sunucusundan önce tamamlanır.
     */
    await connectDB();

    await listen();

    serverStarted = true;

    /*
     * Worker yalnızca veritabanı bağlantısı
     * ve HTTP sunucusu başarıyla açıldıktan sonra başlar.
     */
    startJobs();

    logger.info(
      'Sunucu başarıyla başlatıldı',
      {
        port: PORT,
        environment: config.NODE_ENV,
        healthUrl:
          config.NODE_ENV === 'development'
            ? `http://localhost:${PORT}/health`
            : '/health',
        readinessUrl:
          config.NODE_ENV === 'development'
            ? `http://localhost:${PORT}/health/ready`
            : '/health/ready',
      }
    );
  } catch (error) {
    logger.error(
      'Sunucu başlatılamadı',
      {
        name: error.name,
        message: error.message,
        code: error.code,
        stack:
          config.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      }
    );

    process.exitCode = 1;

    /*
     * Worker, başlangıç akışının bir kısmında
     * çalıştırılmış olma ihtimaline karşı durdurulur.
     */
    stopJobs();

    try {
      await disconnectDB();
    } catch (disconnectError) {
      logger.error(
        'Başlangıç hatası sonrası veritabanı kapatılamadı',
        {
          message: disconnectError.message,
        }
      );
    }

    process.exit(1);
  }
};

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    if (
      !serverStarted ||
      !httpServer.listening
    ) {
      resolve();
      return;
    }

    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const closeSocketServer = () =>
  new Promise((resolve) => {
    io.close(() => {
      resolve();
    });
  });

const shutdown = async (
  signal,
  exitCode = 0
) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info('Uygulama kapatılıyor', {
    signal,
    exitCode,
  });

  /*
   * Kapanış işlemlerinin sonsuza kadar beklememesi
   * için güvenlik zaman aşımı.
   */
  const forceShutdownTimer = setTimeout(
    () => {
      logger.error(
        'Zorunlu kapanış gerçekleştiriliyor',
        {
          signal,
        }
      );

      process.exit(1);
    },
    15_000
  );

  forceShutdownTimer.unref();

  try {
    /*
     * Önce yeni iş alınması engellenir.
     */
    stopJobs();

    /*
     * Ardından istemci bağlantıları kapatılır.
     */
    await closeSocketServer();

    logger.info(
      'Socket.IO bağlantıları kapatıldı'
    );

    await closeHttpServer();

    logger.info(
      'HTTP sunucusu kapatıldı'
    );

    /*
     * En son veritabanı bağlantı havuzu kapatılır.
     */
    await disconnectDB();

    logger.info(
      'Veritabanı bağlantıları kapatıldı'
    );

    clearTimeout(forceShutdownTimer);

    process.exit(exitCode);
  } catch (error) {
    logger.error(
      'Uygulama düzgün kapatılamadı',
      {
        signal,
        name: error.name,
        message: error.message,
      }
    );

    clearTimeout(forceShutdownTimer);

    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT', 0);
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM', 0);
});

process.on(
  'unhandledRejection',
  (reason) => {
    logger.error(
      'Yakalanmamış Promise rejection',
      {
        reason:
          reason instanceof Error
            ? reason.message
            : String(reason),

        stack:
          reason instanceof Error &&
          config.NODE_ENV ===
            'development'
            ? reason.stack
            : undefined,
      }
    );

    void shutdown(
      'unhandledRejection',
      1
    );
  }
);

process.on(
  'uncaughtException',
  (error) => {
    logger.error(
      'Yakalanmamış exception',
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    );

    void shutdown(
      'uncaughtException',
      1
    );
  }
);

void startServer();
