import express from 'express';

import {
  userController,
} from './user.controller.js';

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
// COLLECTION
// ======================================================

// Kullanıcı listesi
router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_USERS
  ),
  userController.findAll
);

// Yeni kullanıcı oluştur
router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_USERS
  ),
  userController.create
);

// ======================================================
// PERMISSION MANAGEMENT
//
// ÖNEMLİ:
// Bunlar genel /:id route'larından önce kalmalı.
// ======================================================

// Kullanıcının rol + override + efektif yetkilerini getir
router.get(
  '/:id/permissions',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_PERMISSIONS
  ),
  userController.getPermissions
);

// Kullanıcıya özel yetkileri güncelle
router.patch(
  '/:id/permissions',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_PERMISSIONS
  ),
  userController.updatePermissions
);

// Kullanıcı özel yetkilerini temizle
// Rol varsayılanlarına geri döner
router.delete(
  '/:id/permissions',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_PERMISSIONS
  ),
  userController.resetPermissions
);

// Hazır yetki şablonu uygula
router.post(
  '/:id/permissions/preset',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_PERMISSIONS
  ),
  userController.applyPermissionPreset
);

// ======================================================
// ROLE / STATUS
// ======================================================

// Rol değiştir
router.patch(
  '/:id/role',
  authorizePermission(
    PERMISSION_KEYS.CHANGE_USER_ROLES
  ),
  userController.changeRole
);

// Aktif / pasif
router.patch(
  '/:id/toggle-active',
  authorizePermission(
    PERMISSION_KEYS.MANAGE_USER_STATUS
  ),
  userController.toggleActive
);

// ======================================================
// SINGLE USER
// ======================================================

// Detay
router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_USERS
  ),
  userController.findOne
);

// Profil bilgileri güncelle
router.patch(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_USERS
  ),
  userController.update
);

// Eski frontend çağrıları bozulmasın
router.put(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_USERS
  ),
  userController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_USERS
  ),
  userController.delete
);

export {
  router as userRoutes,
};

export default router;