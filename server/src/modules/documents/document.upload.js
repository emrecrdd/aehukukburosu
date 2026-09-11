import multer from 'multer';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_FILE_TYPES = new Map([
  ['application/pdf', ['.pdf']],

  ['application/msword', ['.doc']],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ['.docx'],
  ],

  ['application/vnd.ms-excel', ['.xls']],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ['.xlsx'],
  ],

  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/gif', ['.gif']],
  ['image/webp', ['.webp']],

  ['video/mp4', ['.mp4']],
  ['video/webm', ['.webm']],
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  const extension = path
    .extname(file.originalname || '')
    .toLowerCase();

  // UYAP UDF dosyaları tarayıcı tarafından
  // application/octet-stream olarak gönderilebilir.
  // Bu nedenle yalnızca .udf uzantısına özel izin veriyoruz.
  if (extension === '.udf') {
    return callback(null, true);
  }

  const allowedExtensions =
    ALLOWED_FILE_TYPES.get(file.mimetype);

  if (!allowedExtensions) {
    return callback(
      new Error(
        `Desteklenmeyen dosya türü: ${file.mimetype}`
      )
    );
  }

  if (!allowedExtensions.includes(extension)) {
    return callback(
      new Error(
        `Dosya uzantısı ile MIME türü uyuşmuyor: ${
          extension || 'uzantı yok'
        }`
      )
    );
  }

  return callback(null, true);
};

const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

export {
  documentUpload,
  MAX_FILE_SIZE,
  MAX_FILES,
};