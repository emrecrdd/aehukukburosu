import {
  Router,
} from 'express';

import {
  powerOfAttorneyController,
} from './powerOfAttorney.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  uploadSingle,
} from '../../middlewares/upload.middleware.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

import {
  body,
} from 'express-validator';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  Router();

// ======================================================
// CONSTANTS
// ======================================================

const ALLOWED_STATUSES = [
  'active',
  'expired',
  'cancelled',
];

// ======================================================
// VALIDATION
// ======================================================

const createValidation = [
  body('client_id')
    .trim()
    .notEmpty()
    .withMessage(
      'Müvekkil seçimi zorunludur'
    ),

  body('title')
    .trim()
    .notEmpty()
    .withMessage(
      'Başlık zorunludur'
    ),
];

const updateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      'Başlık boş olamaz'
    ),

  body('status')
    .optional()
    .isIn(
      ALLOWED_STATUSES
    )
    .withMessage(
      'Geçersiz vekaletname durumu'
    ),
];

const statusValidation = [
  body('status')
    .notEmpty()
    .withMessage(
      'Vekaletname durumu gereklidir'
    )
    .bail()
    .isIn(
      ALLOWED_STATUSES
    )
    .withMessage(
      'Geçersiz vekaletname durumu'
    ),
];

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// SPECIAL ROUTES
//
// Bunlar /:id route'undan önce olmalı.
// ======================================================

// İstatistikler
//
// Sonuçlar service tarafında kullanıcının
// record-level erişimine göre scope edilir.
router.get(
  '/statistics',

  authorizePermission(
    PERMISSION_KEYS
      .VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController
    .getStatistics
);

// Müvekkile göre vekaletnameler
//
// Client record-level erişimi service tarafından
// ayrıca doğrulanır.
router.get(
  '/client/:clientId',

  authorizePermission(
    PERMISSION_KEYS
      .VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController
    .findByClient
);

// ======================================================
// CREATE
//
// Multipart body upload middleware tarafından parse
// edildikten sonra validation çalışır.
//
// created_by controller/service tarafından authenticated
// actor'dan zorlanır.
//
// client_id / case_id record-level erişimi service
// tarafından ayrıca doğrulanır.
// ======================================================

router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS
      .CREATE_POWER_OF_ATTORNEY
  ),

  uploadSingle(
    'file'
  ),

  validate(
    createValidation
  ),

  powerOfAttorneyController.create
);

// ======================================================
// LIST
//
// VIEW_POWER_OF_ATTORNEY feature iznidir.
//
// Hangi vekaletnamelerin listeleneceği service BOLA
// scope'u tarafından belirlenir.
// ======================================================

router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS
      .VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.findAll
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS
      .VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.findOne
);

// ======================================================
// UPDATE
//
// EDIT_POWER_OF_ATTORNEY action iznidir.
//
// client_id / case_id değiştirilirse yeni ilişkiler
// service tarafından tekrar doğrulanır.
// ======================================================

router.put(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS
      .EDIT_POWER_OF_ATTORNEY
  ),

  validate(
    updateValidation
  ),

  powerOfAttorneyController.update
);

// ======================================================
// STATUS
//
// Status allowlist route + service katmanında
// doğrulanır.
// ======================================================

router.patch(
  '/:id/status',

  authorizePermission(
    PERMISSION_KEYS
      .EDIT_POWER_OF_ATTORNEY
  ),

  validate(
    statusValidation
  ),

  powerOfAttorneyController
    .updateStatus
);

// ======================================================
// DELETE
//
// DELETE_POWER_OF_ATTORNEY action iznidir.
//
// Record-level erişim service tarafından ayrıca
// doğrulanır.
// ======================================================

router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS
      .DELETE_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.delete
);

export {
  router as powerOfAttorneyRoutes,
};