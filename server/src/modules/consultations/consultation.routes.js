import express from 'express';

import { consultationController } from './consultation.controller.js';

import {
  authenticate,
  authorizePermission,
  authorizeAnyPermission,
} from '../../middlewares/auth.middleware.js';

import { PERMISSION_KEYS } from '../../constants/roles.js';

import {
  validateConsultationId,
  validateCreateConsultation,
  validateUpdateConsultation,
  validateConsultationStatus,
  validateConsultationListQuery,
  validateConsultationAssignee,
  validateConsultationAssigneeUserId,
  validateConsultationNote,
  validateConvertConsultationToClient,
  validateConvertConsultationToCase,
} from './consultation.validation.js';

const router =
  express.Router();

router.use(
  authenticate
);

router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS
      .CREATE_CONSULTATIONS
  ),
  validateCreateConsultation,
  consultationController.create
);

router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS
  ),
  validateConsultationListQuery,
  consultationController.findAll
);

router.get(
  '/statistics',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS
  ),
  consultationController
    .getStatistics
);

/*
 * Statik route, /:id route'undan önce kalmalıdır.
 *
 * Yeni danışmanlık oluşturabilen veya danışmanlık
 * düzenleyebilen kullanıcı sorumlu listesini okuyabilir.
 */
router.get(
  '/assignable-users',
  authorizeAnyPermission(
    PERMISSION_KEYS
      .CREATE_CONSULTATIONS,
    PERMISSION_KEYS
      .EDIT_CONSULTATIONS
  ),
  consultationController
    .getAssignableUsers
);

router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS
  ),
  validateConsultationId,
  consultationController.findOne
);

router.patch(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS
      .EDIT_CONSULTATIONS
  ),
  validateConsultationId,
  validateUpdateConsultation,
  consultationController.update
);

router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS
      .DELETE_CONSULTATIONS
  ),
  validateConsultationId,
  consultationController.remove
);

router.patch(
  '/:id/status',
  authorizePermission(
    PERMISSION_KEYS
      .EDIT_CONSULTATIONS
  ),
  validateConsultationId,
  validateConsultationStatus,
  consultationController
    .updateStatus
);

/*
 * authorizePermission(...permissions) mevcut auth middleware'de
 * hasAllPermissions kullanır. Aşağıdaki çift permission route'ları
 * bu nedenle iki yetkiyi de zorunlu tutar.
 */
router.post(
  '/:id/assignees',
  authorizePermission(
    PERMISSION_KEYS
      .EDIT_CONSULTATIONS
  ),
  validateConsultationId,
  validateConsultationAssignee,
  consultationController
    .addAssignee
);

router.delete(
  '/:id/assignees/:userId',
  authorizePermission(
    PERMISSION_KEYS
      .EDIT_CONSULTATIONS
  ),
  validateConsultationId,
  validateConsultationAssigneeUserId,
  consultationController
    .removeAssignee
);

router.get(
  '/:id/tasks',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS,
    PERMISSION_KEYS
      .VIEW_TASKS
  ),
  validateConsultationId,
  consultationController.getTasks
);

router.get(
  '/:id/meetings',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS,
    PERMISSION_KEYS
      .VIEW_MEETINGS
  ),
  validateConsultationId,
  consultationController
    .getMeetings
);

router.get(
  '/:id/documents',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS,
    PERMISSION_KEYS
      .VIEW_DOCUMENTS
  ),
  validateConsultationId,
  consultationController
    .getDocuments
);

router.get(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS,
    PERMISSION_KEYS
      .VIEW_NOTES
  ),
  validateConsultationId,
  consultationController.getNotes
);

router.post(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS
      .VIEW_CONSULTATIONS,
    PERMISSION_KEYS
      .CREATE_NOTES
  ),
  validateConsultationId,
  validateConsultationNote,
  consultationController.addNote
);

router.post(
  '/:id/convert-to-client',
  authorizePermission(
    PERMISSION_KEYS
      .CONVERT_CONSULTATIONS,
    PERMISSION_KEYS
      .CREATE_CLIENTS
  ),
  validateConsultationId,
  validateConvertConsultationToClient,
  consultationController
    .convertToClient
);

router.post(
  '/:id/convert-to-case',
  authorizePermission(
    PERMISSION_KEYS
      .CONVERT_CONSULTATIONS,
    PERMISSION_KEYS
      .CREATE_CASES
  ),
  validateConsultationId,
  validateConvertConsultationToCase,
  consultationController
    .convertToCase
);

export {
  router as consultationRoutes,
};
