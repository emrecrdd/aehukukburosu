import express from 'express';

import {
  documentController,
} from './document.controller.js';

import {
  documentUpload,
} from './document.upload.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// UPLOADS
// ======================================================

// Tek belge yükleme
router.post(
  '/upload',

  authorizePermission(
    PERMISSION_KEYS.UPLOAD_DOCUMENTS
  ),

  documentUpload.single(
    'file'
  ),

  documentController.upload
);

// Çoklu belge yükleme
router.post(
  '/upload-multiple',

  authorizePermission(
    PERMISSION_KEYS.UPLOAD_DOCUMENTS
  ),

  documentUpload.array(
    'files',
    10
  ),

  documentController.uploadMultiple
);

// ======================================================
// LIST / META
//
// Bunlar /:id route'undan önce olmalı.
// ======================================================

// Belge listesi
router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.findAll
);

// Belge kategorileri
router.get(
  '/categories',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.getCategories
);

// Belge istatistikleri
router.get(
  '/statistics',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.getStatistics
);

// ======================================================
// DOCUMENT OPERATIONS
// ======================================================

// Belge indir
router.get(
  '/:id/download',

  authorizePermission(
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS
  ),

  documentController.download
);

// ======================================================
// UDF PREVIEW
// ======================================================

/*
 * UYAP UDF dosyaları browser tarafından doğrudan
 * render edilemez.
 *
 * Bu endpoint UDF container içerisindeki content.xml
 * verisini service üzerinden güvenli şekilde çıkarır
 * ve frontend UDF viewer için JSON döndürür.
 *
 * Orijinal UDF dosyası değiştirilmez.
 */
router.get(
  '/:id/udf-preview',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.previewUdf
);

// ======================================================
// NORMAL DOCUMENT PREVIEW
// ======================================================

/*
 * PDF, image vb. browser'ın doğrudan gösterebildiği
 * dosyalar için mevcut binary preview endpoint'i.
 *
 * UDF burada render edilmez; /udf-preview kullanılır.
 */
router.get(
  '/:id/preview',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.preview
);

// ======================================================
// VERSIONS
// ======================================================

// Belge versiyonlarını görüntüle
router.get(
  '/:id/versions',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.getVersions
);

// Yeni belge versiyonu oluştur
router.post(
  '/:id/versions',

  authorizePermission(
    PERMISSION_KEYS.MANAGE_DOCUMENT_VERSIONS
  ),

  documentUpload.single(
    'file'
  ),

  documentController.uploadVersion
);

// ======================================================
// SINGLE DOCUMENT
// ======================================================

// Belge detayı
router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),

  documentController.findOne
);

// ======================================================
// UPDATE
// ======================================================

// Metadata güncelleme
router.patch(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_DOCUMENTS
  ),

  documentController.update
);

/*
 * Backward compatibility.
 *
 * Eski frontend PUT çağrısı yapıyorsa çalışmaya
 * devam etsin. Yetki kontrolü PATCH ile aynıdır.
 */
router.put(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_DOCUMENTS
  ),

  documentController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_DOCUMENTS
  ),

  documentController.remove
);

export {
  router as documentRoutes,
};