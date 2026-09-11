import express from 'express';

import {
  auditLogController,
} from './audit-log.controller.js';

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
// VIEW
// ======================================================

// Audit log listesi
router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_AUDIT_LOGS
  ),
  auditLogController.findAll
);

// Audit log detayı
router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_AUDIT_LOGS
  ),
  auditLogController.findOne
);

// ======================================================
// DELETE
// ======================================================

// Tek audit log sil
router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_AUDIT_LOGS
  ),
  auditLogController.remove
);

// Toplu audit log sil
router.post(
  '/bulk-delete',
  authorizePermission(
    PERMISSION_KEYS.DELETE_AUDIT_LOGS
  ),
  auditLogController.removeMany
);

// Eski audit logları temizle
router.delete(
  '/clean-old',
  authorizePermission(
    PERMISSION_KEYS.DELETE_AUDIT_LOGS
  ),
  auditLogController.cleanOldLogs
);

// ======================================================
// EXPORT
// ======================================================

export {
  router as auditLogRoutes,
};

export default router;