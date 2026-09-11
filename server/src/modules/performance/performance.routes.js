import express from 'express';

import {
  getTeamOverview,
  getUsersPerformance,
  getUserPerformance,
  getMyPerformance,
} from './performance.controller.js';

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
// AUTHENTICATION
// ======================================================

/*
 * Performance modülündeki bütün endpointler
 * oturum gerektirir.
 */
router.use(
  authenticate
);

// ======================================================
// MY PERFORMANCE
//
// Kullanıcı sadece kendi performansını görüntüler.
//
// Avukat / stajyer / sekreter gibi roller için
// varsayılan olarak açık olabilir.
//
// Kullanıcı override:
// view_own_performance = false
// verilirse bu endpoint de kapanır.
// ======================================================

router.get(
  '/me',

  authorizePermission(
    PERMISSION_KEYS.VIEW_OWN_PERFORMANCE
  ),

  getMyPerformance
);

// ======================================================
// TEAM OVERVIEW
//
// Ofisin / ekibin genel performans özeti.
//
// Yalnız:
// view_team_performance
//
// yetkisi olan kullanıcılar erişebilir.
// ======================================================

router.get(
  '/overview',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE
  ),

  getTeamOverview
);

// ======================================================
// USERS PERFORMANCE
//
// Tüm kullanıcıların performans karşılaştırması.
// ======================================================

router.get(
  '/users',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE
  ),

  getUsersPerformance
);

// ======================================================
// SINGLE USER PERFORMANCE
//
// Başka bir kullanıcının detaylı performansını görme.
// ======================================================

router.get(
  '/users/:userId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE
  ),

  getUserPerformance
);

export default router;