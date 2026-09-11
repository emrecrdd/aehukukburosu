import multer from 'multer';
import path from 'path';

const CHAT_MAX_FILE_SIZE =
  10 * 1024 * 1024;

const CHAT_MAX_FILES =
  3;

const CHAT_ALLOWED_FILE_TYPES =
  new Map([
    [
      'application/pdf',
      [
        '.pdf',
      ],
    ],

    [
      'application/msword',
      [
        '.doc',
      ],
    ],

    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [
        '.docx',
      ],
    ],

    [
      'application/vnd.ms-excel',
      [
        '.xls',
      ],
    ],

    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [
        '.xlsx',
      ],
    ],

    [
      'image/jpeg',
      [
        '.jpg',
        '.jpeg',
      ],
    ],

    [
      'image/png',
      [
        '.png',
      ],
    ],

    [
      'image/webp',
      [
        '.webp',
      ],
    ],

    /*
     * Bazı browser/OS kombinasyonlarında DOCX/XLSX generic ZIP MIME ile gelir.
     * İçerik doğrulaması service katmanında ayrıca yapılır.
     */
    [
      'application/zip',
      [
        '.docx',
        '.xlsx',
      ],
    ],

    [
      'application/x-zip-compressed',
      [
        '.docx',
        '.xlsx',
      ],
    ],

    [
      'application/octet-stream',
      [
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
      ],
    ],
  ]);

const createUploadError = (
  message,
  code =
    'CHAT_INVALID_FILE_TYPE'
) => {
  const error =
    new Error(
      message
    );

  error.statusCode =
    400;

  error.code =
    code;

  return error;
};

const storage =
  multer.memoryStorage();

const fileFilter = (
  req,
  file,
  callback
) => {
  const extension =
    path
      .extname(
        file.originalname ||
        ''
      )
      .toLowerCase();

  /*
   * UYAP UDF dosyaları çoğu istemcide
   * application/octet-stream olarak gelir.
   *
   * Burada yalnızca aday olarak kabul edilir.
   * Gerçek ZIP/raw-XML UDF doğrulaması
   * chat.attachment.service.js içindedir.
   */
  if (
    extension ===
    '.udf'
  ) {
    return callback(
      null,
      true
    );
  }

  const mimeType =
    String(
      file.mimetype ||
      ''
    ).toLowerCase();

  const allowedExtensions =
    CHAT_ALLOWED_FILE_TYPES.get(
      mimeType
    );

  if (!allowedExtensions) {
    return callback(
      createUploadError(
        'Sohbette yalnızca PDF, Word, Excel, UDF ve desteklenen görsel dosyaları gönderilebilir.'
      )
    );
  }

  if (
    !allowedExtensions.includes(
      extension
    )
  ) {
    return callback(
      createUploadError(
        `Dosya uzantısı ile MIME türü uyuşmuyor: ${
          extension ||
          'uzantı yok'
        }`
      )
    );
  }

  return callback(
    null,
    true
  );
};

const chatUpload =
  multer({
    storage,

    limits: {
      fileSize:
        CHAT_MAX_FILE_SIZE,

      files:
        CHAT_MAX_FILES,
    },

    fileFilter,
  });

export {
  chatUpload,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_FILES,
};

export default chatUpload;
