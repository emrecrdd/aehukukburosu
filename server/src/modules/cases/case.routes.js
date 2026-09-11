import express from 'express';

import {
  caseController,
} from './case.controller.js';

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
// MAIN CRUD
// ======================================================

// Dava oluştur
router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_CASES
  ),
  caseController.create
);

// Davaları listele
router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CASES
  ),
  caseController.findAll
);

// İstatistikler
// /:id route'undan önce olmalı
router.get(
  '/statistics',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CASES
  ),
  caseController.getStatistics
);

// Atanabilir avukatlar
// /:id route'undan önce olmalı
router.get(
  '/assignable-lawyers',
  authorizePermission(
    PERMISSION_KEYS.CREATE_CASES
  ),
  caseController.getAssignableLawyers
);

// Tek dava
router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CASES
  ),
  caseController.findOne
);

// Tam güncelleme
router.put(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_CASES
  ),
  caseController.update
);

// Kısmi güncelleme
// AI ile Dosyayı Tamamla burayı kullanıyor
router.patch(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_CASES
  ),
  caseController.patch
);

// Dava sil
router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_CASES
  ),
  caseController.remove
);

// ======================================================
// STATUS
// ======================================================

router.patch(
  '/:id/status',
  authorizePermission(
    PERMISSION_KEYS.CHANGE_CASE_STATUS
  ),
  caseController.updateStatus
);

// ======================================================
// PARTIES
// ======================================================

// Taraf ekle
router.post(
  '/:id/parties',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_CASE_PARTIES
  ),
  caseController.addParty
);

// Taraf sil
router.delete(
  '/:id/parties/:partyId',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_CASE_PARTIES
  ),
  caseController.removeParty
);

// Tarafları görüntüle
router.get(
  '/:id/parties',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CASES
  ),
  caseController.getParties
);

// ======================================================
// RELATED DATA
// ======================================================

// Dava belgeleri
router.get(
  '/:id/documents',
  authorizePermission(
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),
  caseController.getDocuments
);

// Dava görevleri
router.get(
  '/:id/tasks',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  caseController.getTasks
);

// Dava etkinlikleri
router.get(
  '/:id/events',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  caseController.getEvents
);

// Dava ödemeleri
router.get(
  '/:id/payments',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  caseController.getPayments
);

// Dava notları
router.get(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS.VIEW_NOTES
  ),
  caseController.getNotes
);

export {
  router as caseRoutes,
};
