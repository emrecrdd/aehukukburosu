import crypto from 'crypto';
import path from 'path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import {
  getSignedUrl,
} from '@aws-sdk/s3-request-presigner';

import {
  s3Client,
  S3_BUCKET_NAME,
} from '../../config/s3.js';

const DEFAULT_CONTENT_TYPE =
  'application/octet-stream';

const assertStorageConfig =
  () => {
    if (
      !S3_BUCKET_NAME ||
      !process.env.AWS_REGION ||
      !process.env.AWS_ENDPOINT_URL_S3 ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      const error =
        new Error(
          'Object storage configuration is missing'
        );

      error.statusCode =
        503;

      error.code =
        'CHAT_STORAGE_UNAVAILABLE';

      throw error;
    }
  };

const safeExtension = (
  originalName
) => {
  const extension =
    path
      .extname(
        String(
          originalName ||
          ''
        )
      )
      .toLowerCase();

  return (
    /^\.[a-z0-9]{1,10}$/.test(
      extension
    )
      ? extension
      : ''
  );
};

const sanitizeDownloadName = (
  value
) => {
  const normalized =
    String(
      value ||
      'dosya'
    )
      .replace(
        /\\/g,
        '/'
      )
      .replace(
        /[\u0000-\u001f\u007f]/g,
        ''
      );

  return (
    path.posix.basename(
      normalized
    )
      .slice(
        0,
        255
      ) ||
    'dosya'
  );
};

const asciiDownloadName = (
  value
) =>
  sanitizeDownloadName(
    value
  )
    .replace(
      /[^\x20-\x7e]/g,
      '_'
    )
    .replace(
      /["\\]/g,
      '_'
    )
    .slice(
      0,
      180
    ) ||
  'dosya';

const buildContentDisposition = (
  originalName
) => {
  const safeName =
    sanitizeDownloadName(
      originalName
    );

  const asciiName =
    asciiDownloadName(
      safeName
    );

  return (
    `attachment; filename="${asciiName}"; ` +
    `filename*=UTF-8''${encodeURIComponent(
      safeName
    )}`
  );
};

const createStorageKey = (
  conversationId,
  originalName
) => {
  const extension =
    safeExtension(
      originalName
    );

  return (
    `chat/${conversationId}/` +
    `${crypto.randomUUID()}${extension}`
  );
};

export const chatStorage = {
  async uploadFile(
    file,
    conversationId
  ) {
    assertStorageConfig();

    if (
      !file ||
      !Buffer.isBuffer(
        file.buffer
      )
    ) {
      const error =
        new Error(
          'Dosya buffer olarak bulunamadı.'
        );

      error.statusCode =
        400;

      error.code =
        'CHAT_INVALID_FILE_CONTENT';

      throw error;
    }

    const key =
      createStorageKey(
        conversationId,
        file.originalname
      );

    await s3Client.send(
      new PutObjectCommand({
        Bucket:
          S3_BUCKET_NAME,

        Key:
          key,

        Body:
          file.buffer,

        ContentType:
          file.mimetype ||
          DEFAULT_CONTENT_TYPE,

        Metadata: {
          source:
            'derkenar-chat',
        },
      })
    );

    return {
      key,
    };
  },

  async deleteFile(
    key
  ) {
    assertStorageConfig();

    if (!key) {
      return;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket:
          S3_BUCKET_NAME,

        Key:
          key,
      })
    );
  },

  async getSignedDownloadUrl({
    key,
    originalName,
    mimeType,
    expiresIn =
      10 * 60,
  }) {
    assertStorageConfig();

    if (!key) {
      const error =
        new Error(
          'Dosya bulunamadı.'
        );

      error.statusCode =
        404;

      error.code =
        'CHAT_ATTACHMENT_NOT_FOUND';

      throw error;
    }

    const normalizedExpiry =
      Math.min(
        Math.max(
          Number(
            expiresIn
          ) ||
            1,
          1
        ),
        7 *
          24 *
          60 *
          60
      );

    const command =
      new GetObjectCommand({
        Bucket:
          S3_BUCKET_NAME,

        Key:
          key,

        ResponseContentType:
          mimeType ||
          DEFAULT_CONTENT_TYPE,

        ResponseContentDisposition:
          buildContentDisposition(
            originalName
          ),
      });

    return getSignedUrl(
      s3Client,
      command,
      {
        expiresIn:
          normalizedExpiry,
      }
    );
  },
};

export default chatStorage;
