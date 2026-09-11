import express from 'express';

import {
  clientController,
} from './client.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

import validate from '../../middlewares/validate.middleware.js';

import {
  createClientValidation,
  updateClientValidation,
} from './client.validation.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// COLLECTION
// ======================================================

// Müvekkil oluştur

router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_CLIENTS
  ),
  validate(
    createClientValidation
  ),
  clientController.create
);

// Müvekkilleri listele

router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CLIENTS
  ),
  clientController.findAll
);

// İstatistikler

router.get(
  '/statistics',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CLIENTS
  ),
  clientController.getStatistics
);

// ======================================================
// CLIENT SUBRESOURCES
// ======================================================

// Müvekkilin dava geçmişi

router.get(
  '/:id/cases',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CASES
  ),
  clientController.getCaseHistory
);

// Müvekkilin ödeme kayıtları

router.get(
  '/:id/payments',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  clientController.getPayments
);

// Müvekkilin notları

router.get(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS.VIEW_NOTES
  ),
  clientController.getNotes
);

// ======================================================
// DETAIL
// ======================================================

// Müvekkil detayı

router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CLIENTS
  ),
  clientController.findOne
);

// Müvekkil güncelle

router.patch(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_CLIENTS
  ),
  validate(
    updateClientValidation
  ),
  clientController.update
);

// Müvekkil sil

router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_CLIENTS
  ),
  clientController.remove
);

export {
  router as clientRoutes,
};