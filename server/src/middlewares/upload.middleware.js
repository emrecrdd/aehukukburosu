import multer from 'multer';
import path from 'path';
import { logger } from '../config/logger.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
  ];

  const extension = path
    .extname(file.originalname || '')
    .toLowerCase();

  /*
   * UYAP UDF dosyaları çoğunlukla
   * application/octet-stream olarak gönderilir.
   *
   * application/octet-stream'i genel olarak izinli
   * yapmıyoruz; yalnızca .udf uzantısına izin veriyoruz.
   */
  if (extension === '.udf') {
    return cb(null, true);
  }

  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Dosya türü desteklenmiyor: ${file.mimetype}`
    )
  );
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

export const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(400).json({
            success: false,
            message: 'Dosya boyutu 10MB\'dan büyük olamaz',
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

export const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(
      fieldName,
      maxCount
    );

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(400).json({
            success: false,
            message: 'Dosya boyutu 10MB\'dan büyük olamaz',
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};